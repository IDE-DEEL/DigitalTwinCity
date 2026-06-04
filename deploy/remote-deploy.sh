#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "Missing required environment variable: ${name}"
  fi
}

write_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  printf '%s=%q\n' "$key" "$value" >> "$file"
}

compose() {
  local state_file="$1"
  local release_dir="$2"
  shift 2

  (
    set -a
    source "$state_file"
    set +a
    cd "$release_dir"
    docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" "$@"
  )
}

resolve_path() {
  local base_dir="$1"
  local path="$2"

  if [[ "$path" == /* ]]; then
    printf '%s\n' "$path"
  else
    printf '%s/%s\n' "$base_dir" "$path"
  fi
}

read_state_var() {
  local state_file="$1"
  local name="$2"

  (
    set -a
    source "$state_file"
    set +a
    printf '%s\n' "${!name:-}"
  )
}

read_env_file_var() {
  local env_file="$1"
  local name="$2"

  awk -F= -v key="$name" '
    $0 !~ /^[[:space:]]*#/ && $1 == key {
      sub(/^[^=]*=/, "")
      sub(/\r$/, "")
      print
      exit
    }
  ' "$env_file"
}

image_ref_is_immutable() {
  local ref="$1"
  local last
  local tag

  if [[ "$ref" == *@sha256:* ]]; then
    return 0
  fi

  last="${ref##*/}"
  if [[ "$last" == *:* ]]; then
    tag="${last##*:}"
    [[ "$tag" =~ ^sha-[0-9a-fA-F]{7,40}$ ]]
    return
  fi

  return 1
}

require_immutable_image_ref() {
  local name="$1"
  local ref="$2"

  if ! image_ref_is_immutable "$ref"; then
    fail "${name} must use an immutable sha-* tag or sha256 digest, got '${ref}'."
  fi
}

image_repo_from_tag() {
  local ref="$1"
  local last="${ref##*/}"

  if [[ "$last" == *:* ]]; then
    printf '%s\n' "${ref%:*}"
  else
    printf '%s\n' "$ref"
  fi
}

resolve_local_digest_ref() {
  local ref="$1"
  local repo
  local digest

  if image_ref_is_immutable "$ref"; then
    printf '%s\n' "$ref"
    return 0
  fi

  repo="$(image_repo_from_tag "$ref")"
  while IFS= read -r digest; do
    if [[ "$digest" == "${repo}@sha256:"* ]]; then
      printf '%s\n' "$digest"
      return 0
    fi
  done < <(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$ref" 2>/dev/null || true)

  fail "Image ${ref} is mutable and no local digest is available. Deploy a sha-* tag or digest first."
}

rewrite_release_state_file() {
  local state_file="$1"
  local backend_image="$2"
  local frontend_image="$3"
  local tmp_file="${state_file}.tmp.$$"

  : > "$tmp_file"
  write_env_var "$tmp_file" "APP_ENV_FILE" "$(read_state_var "$state_file" APP_ENV_FILE)"
  write_env_var "$tmp_file" "BACKEND_IMAGE" "$backend_image"
  write_env_var "$tmp_file" "COMPOSE_PROFILES" "$(read_state_var "$state_file" COMPOSE_PROFILES)"
  write_env_var "$tmp_file" "COMPOSE_PROJECT_NAME" "$(read_state_var "$state_file" COMPOSE_PROJECT_NAME)"
  write_env_var "$tmp_file" "DEPLOY_GROUP" "$(read_state_var "$state_file" DEPLOY_GROUP)"
  write_env_var "$tmp_file" "FRONTEND_API_URL" "$(read_state_var "$state_file" FRONTEND_API_URL)"
  write_env_var "$tmp_file" "FRONTEND_IMAGE" "$frontend_image"
  write_env_var "$tmp_file" "HEALTHCHECK_URLS" "$(read_state_var "$state_file" HEALTHCHECK_URLS)"
  write_env_var "$tmp_file" "MOSQUITTO_PASSWORD_DIR" "$(read_state_var "$state_file" MOSQUITTO_PASSWORD_DIR)"
  write_env_var "$tmp_file" "MQTT_USERS_FILE" "$(read_state_var "$state_file" MQTT_USERS_FILE)"
  write_env_var "$tmp_file" "RELEASES_TO_KEEP" "$(read_state_var "$state_file" RELEASES_TO_KEEP)"
  write_env_var "$tmp_file" "RELEASE_DIR" "$(read_state_var "$state_file" RELEASE_DIR)"
  mv "$tmp_file" "$state_file"
}

pin_release_state_file() {
  local state_file="$1"
  local backend_image
  local frontend_image
  local pinned_backend_image
  local pinned_frontend_image

  backend_image="$(read_state_var "$state_file" BACKEND_IMAGE)"
  frontend_image="$(read_state_var "$state_file" FRONTEND_IMAGE)"
  pinned_backend_image="$(resolve_local_digest_ref "$backend_image")"
  pinned_frontend_image="$(resolve_local_digest_ref "$frontend_image")"

  if [[ "$pinned_backend_image" != "$backend_image" || "$pinned_frontend_image" != "$frontend_image" ]]; then
    rewrite_release_state_file "$state_file" "$pinned_backend_image" "$pinned_frontend_image"
    log "Pinned previous release image refs to local digests."
  fi
}

state_file_references_image() {
  local state_file="$1"
  local image_ref="$2"

  [[ -f "$state_file" ]] || return 1
  [[ "$(read_state_var "$state_file" BACKEND_IMAGE)" == "$image_ref" ]] && return 0
  [[ "$(read_state_var "$state_file" FRONTEND_IMAGE)" == "$image_ref" ]] && return 0

  return 1
}

release_image_is_still_referenced() {
  local image_ref="$1"
  local releases_dir="${DEPLOY_ROOT}/releases"
  local state_file

  for state_file in "$CURRENT_ENV_FILE" "$PREVIOUS_ENV_FILE"; do
    if state_file_references_image "$state_file" "$image_ref"; then
      return 0
    fi
  done

  [[ -d "$releases_dir" ]] || return 1

  while IFS= read -r -d '' state_file; do
    if state_file_references_image "$state_file" "$image_ref"; then
      return 0
    fi
  done < <(find "$releases_dir" -mindepth 2 -maxdepth 2 -type f -name release.env -print0)

  return 1
}

remove_release_image_if_unused() {
  local image_ref="$1"

  [[ -n "$image_ref" ]] || return 0

  if release_image_is_still_referenced "$image_ref"; then
    log "Keeping release image still referenced by retained state: ${image_ref}"
    return 0
  fi

  if ! docker image inspect "$image_ref" >/dev/null 2>&1; then
    log "Release image already absent: ${image_ref}"
    return 0
  fi

  log "Removing unreferenced release image: ${image_ref}"
  if ! docker image rm "$image_ref" >/dev/null 2>&1; then
    log "Could not remove release image ${image_ref}; Docker may still be using it."
  fi
}

add_release_image_cleanup_candidate() {
  local image_ref="$1"
  local existing

  [[ -n "$image_ref" ]] || return 0

  for existing in "${image_cleanup_candidates[@]}"; do
    [[ "$existing" == "$image_ref" ]] && return 0
  done

  image_cleanup_candidates+=("$image_ref")
}

run_healthchecks() {
  local urls_csv="$1"
  local attempts="${HEALTHCHECK_ATTEMPTS:-12}"
  local interval="${HEALTHCHECK_INTERVAL_SECONDS:-10}"
  local timeout="${HEALTHCHECK_TIMEOUT_SECONDS:-5}"
  local expected_status="${HEALTHCHECK_EXPECTED_STATUS:-200}"
  local -a urls
  local url
  local attempt
  local ok
  local response_status

  IFS=',' read -r -a urls <<< "$urls_csv"
  for url in "${urls[@]}"; do
    url="${url#"${url%%[![:space:]]*}"}"
    url="${url%"${url##*[![:space:]]}"}"
    [[ -n "$url" ]] || continue

    ok=false
    for attempt in $(seq 1 "$attempts"); do
      response_status="$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url")" || response_status=""

      if [[ "$response_status" == "$expected_status" ]]; then
        log "Healthcheck succeeded for ${url} (status ${response_status})"
        ok=true
        break
      fi

      log "Healthcheck ${attempt}/${attempts} failed for ${url} (status ${response_status:-unknown})"
      sleep "$interval"
    done

    if [[ "$ok" != "true" ]]; then
      return 1
    fi
  done
}

rollback_to_previous() {
  if [[ "${ROLLBACK_ON_FAILURE:-true}" != "true" ]]; then
    log "Rollback is disabled; deployment remains failed."
    return 1
  fi

  if [[ ! -f "$PREVIOUS_ENV_FILE" ]]; then
    log "No previous release state found; rollback is not possible."
    return 1
  fi

  local previous_release_dir
  previous_release_dir="$(read_state_var "$PREVIOUS_ENV_FILE" RELEASE_DIR)"
  if [[ -z "$previous_release_dir" || ! -f "${previous_release_dir}/compose.yml" || ! -f "${previous_release_dir}/compose.monitoring.yml" ]]; then
    log "Previous release directory is missing; rollback is not possible."
    return 1
  fi

  log "Rolling back to ${previous_release_dir}"
  compose "$PREVIOUS_ENV_FILE" "$previous_release_dir" up -d --remove-orphans

  if run_healthchecks "$HEALTHCHECK_URLS"; then
    cp "$PREVIOUS_ENV_FILE" "$CURRENT_ENV_FILE"
    ln -sfn "$previous_release_dir" "${DEPLOY_ROOT}/current"
    log "Rollback succeeded."
  else
    log "Rollback healthcheck failed."
  fi

  return 1
}

cleanup_old_releases() {
  local releases_to_keep="${RELEASES_TO_KEEP:-5}"
  local releases_dir="${DEPLOY_ROOT}/releases"
  local current_release_dir="$RELEASE_DIR"
  local previous_release_dir=""
  local -a image_cleanup_candidates=()
  local kept_count=0
  local entry
  local release_state_file
  local release_dir

  if ! [[ "$releases_to_keep" =~ ^[0-9]+$ ]]; then
    log "Invalid RELEASES_TO_KEEP='${releases_to_keep}', skipping release cleanup."
    return 0
  fi

  if (( releases_to_keep < 2 )); then
    releases_to_keep=2
  fi

  [[ -d "$releases_dir" ]] || return 0

  if [[ -f "$PREVIOUS_ENV_FILE" ]]; then
    previous_release_dir="$(read_state_var "$PREVIOUS_ENV_FILE" RELEASE_DIR)"
  fi

  while IFS= read -r -d '' entry; do
    release_dir="${entry#*$'\t'}"

    if [[ "$release_dir" == "$current_release_dir" || "$release_dir" == "$previous_release_dir" ]]; then
      ((kept_count += 1))
      continue
    fi

    if (( kept_count < releases_to_keep )); then
      ((kept_count += 1))
      continue
    fi

    log "Removing old release: ${release_dir}"
    release_state_file="${release_dir}/release.env"
    if [[ -f "$release_state_file" ]]; then
      add_release_image_cleanup_candidate "$(read_state_var "$release_state_file" BACKEND_IMAGE)"
      add_release_image_cleanup_candidate "$(read_state_var "$release_state_file" FRONTEND_IMAGE)"
    fi

    rm -rf -- "$release_dir"
  done < <(find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\0' | sort -z -nr)

  for image_ref in "${image_cleanup_candidates[@]}"; do
    remove_release_image_if_unused "$image_ref"
  done
}

load_deployment_context() {
  require_env BACKEND_IMAGE
  require_env FRONTEND_IMAGE
  require_immutable_image_ref BACKEND_IMAGE "$BACKEND_IMAGE"
  require_immutable_image_ref FRONTEND_IMAGE "$FRONTEND_IMAGE"

  SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  RELEASE_DIR="$SCRIPT_DIR"
  DEPLOY_ROOT="$(cd -- "${RELEASE_DIR}/../.." && pwd)"
  STATE_DIR="${DEPLOY_ROOT}/state"
  CURRENT_ENV_FILE="${STATE_DIR}/current-release.env"
  PREVIOUS_ENV_FILE="${STATE_DIR}/previous-release.env"
  RELEASE_ENV_FILE="${RELEASE_DIR}/release.env"

  APP_ENV_FILE="${APP_ENV_FILE:-../../shared/.env}"
  APP_ENV_PATH="$(resolve_path "$RELEASE_DIR" "$APP_ENV_FILE")"
  if [[ -z "${COMPOSE_PROJECT_NAME:-}" && -f "$CURRENT_ENV_FILE" ]]; then
    COMPOSE_PROJECT_NAME="$(read_state_var "$CURRENT_ENV_FILE" COMPOSE_PROJECT_NAME)"
  fi
  COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitaltwin}"
  COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME//[^a-zA-Z0-9_-]/-}"
  COMPOSE_PROFILES="${COMPOSE_PROFILES:-monitoring}"
  RELEASES_TO_KEEP="${RELEASES_TO_KEEP:-5}"
}

validate_deployment_host() {
  [[ -f "$APP_ENV_PATH" ]] || fail "Application env file does not exist: ${APP_ENV_PATH}"
  [[ -f "${RELEASE_DIR}/compose.yml" ]] || fail "Compose file does not exist: ${RELEASE_DIR}/compose.yml"
  [[ -f "${RELEASE_DIR}/compose.monitoring.yml" ]] || fail "Monitoring compose file does not exist: ${RELEASE_DIR}/compose.monitoring.yml"
  command -v docker >/dev/null 2>&1 || fail "Docker is not installed on the deployment host."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is not available on the deployment host."
  command -v curl >/dev/null 2>&1 || fail "curl is not installed on the deployment host."
}

prepare_release_directories() {
  mkdir -p "$STATE_DIR"
  MOSQUITTO_PASSWORD_DIR="${MOSQUITTO_PASSWORD_DIR:-${DEPLOY_ROOT}/shared/mosquitto/password}"
  MQTT_USERS_FILE="${MQTT_USERS_FILE:-${DEPLOY_ROOT}/shared/mosquitto/mqtt-users.env}"

  mkdir -p "$MOSQUITTO_PASSWORD_DIR" "${RELEASE_DIR}/mosquitto/psk"
}

normalize_mqtt_password_file() {
  local mosquitto_uid="${MOSQUITTO_UID:-1883}"
  local mosquitto_gid="${MOSQUITTO_GID:-1883}"

  docker run --rm --user 0:0 \
    -e MOSQUITTO_UID="$mosquitto_uid" \
    -e MOSQUITTO_GID="$mosquitto_gid" \
    -v "${MOSQUITTO_PASSWORD_DIR}:/password" \
    eclipse-mosquitto:2.1.2-alpine \
    sh -c 'if [ ! -e /password/passwd ]; then : > /password/passwd; fi; chown "$MOSQUITTO_UID:$MOSQUITTO_GID" /password /password/passwd; chmod 755 /password; chmod 640 /password/passwd'
}

build_mqtt_password_file() {
  local tmp_passwd="passwd.tmp"
  local line
  local username
  local password
  local created=false
  local count=0

  if [[ ! -f "$MQTT_USERS_FILE" ]]; then
    log "No MQTT users file found at ${MQTT_USERS_FILE}; keeping existing passwd file."
    normalize_mqtt_password_file
    return 0
  fi

  docker run --rm --user 0:0 \
    -v "${MOSQUITTO_PASSWORD_DIR}:/password" \
    eclipse-mosquitto:2.1.2-alpine \
    rm -f "/password/${tmp_passwd}"

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -n "$line" ]] || continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue

    if [[ "$line" != *=* ]]; then
      fail "Invalid MQTT users line in ${MQTT_USERS_FILE}: expected username=password"
    fi

    username="${line%%=*}"
    password="${line#*=}"

    [[ "$username" =~ ^[A-Za-z0-9_.-]+$ ]] || fail "Invalid MQTT username '${username}' in ${MQTT_USERS_FILE}."
    [[ -n "$password" ]] || fail "Missing MQTT password for '${username}' in ${MQTT_USERS_FILE}."

    if [[ "$created" == "false" ]]; then
      docker run --rm --user 0:0 \
        -v "${MOSQUITTO_PASSWORD_DIR}:/password" \
        eclipse-mosquitto:2.1.2-alpine \
        mosquitto_passwd -c -b "/password/${tmp_passwd}" "$username" "$password" >/dev/null
      created=true
    else
      docker run --rm --user 0:0 \
        -v "${MOSQUITTO_PASSWORD_DIR}:/password" \
        eclipse-mosquitto:2.1.2-alpine \
        mosquitto_passwd -b "/password/${tmp_passwd}" "$username" "$password" >/dev/null
    fi

    count=$((count + 1))
  done < "$MQTT_USERS_FILE"

  if [[ "$created" == "true" ]]; then
    docker run --rm --user 0:0 \
      -v "${MOSQUITTO_PASSWORD_DIR}:/password" \
      eclipse-mosquitto:2.1.2-alpine \
      mv "/password/${tmp_passwd}" "/password/passwd"
    normalize_mqtt_password_file
    log "Built Mosquitto passwd file from ${MQTT_USERS_FILE} (${count} users)."
  else
    docker run --rm --user 0:0 \
      -v "${MOSQUITTO_PASSWORD_DIR}:/password" \
      eclipse-mosquitto:2.1.2-alpine \
      rm -f "/password/${tmp_passwd}"
    normalize_mqtt_password_file
    log "MQTT users file ${MQTT_USERS_FILE} contains no users; keeping existing passwd file."
  fi
}

normalize_deploy_permissions() {
  if [[ -z "${DEPLOY_GROUP:-}" ]]; then
    DEPLOY_GROUP="$(id -gn)"
  fi

  log "Setting release group permissions for ${DEPLOY_GROUP}."
  chgrp -R "$DEPLOY_GROUP" "$RELEASE_DIR" "$STATE_DIR"
  chmod -R g+rwX "$RELEASE_DIR" "$STATE_DIR"
  find "$RELEASE_DIR" "$STATE_DIR" -type d -exec chmod g+s {} +
}

resolve_healthcheck_urls() {
  if [[ -n "${HEALTHCHECK_URLS:-}" ]]; then
    return 0
  fi

  DOMAIN="${DOMAIN:-$(read_env_file_var "$APP_ENV_PATH" DOMAIN)}"
  require_env DOMAIN
  HEALTHCHECK_URLS="https://${DOMAIN}/health,https://${DOMAIN}/api/v1/health"
}

login_to_registry() {
  if [[ -z "${GHCR_USERNAME:-}" || -z "${GHCR_TOKEN:-}" ]]; then
    return 0
  fi

  log "Logging in to GHCR."
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
}

snapshot_current_release() {
  if [[ -f "$CURRENT_ENV_FILE" ]]; then
    cp "$CURRENT_ENV_FILE" "$PREVIOUS_ENV_FILE"
    pin_release_state_file "$PREVIOUS_ENV_FILE"
  fi
}

write_release_state() {
  : > "$RELEASE_ENV_FILE"
  write_env_var "$RELEASE_ENV_FILE" "APP_ENV_FILE" "$APP_ENV_FILE"
  write_env_var "$RELEASE_ENV_FILE" "BACKEND_IMAGE" "$BACKEND_IMAGE"
  write_env_var "$RELEASE_ENV_FILE" "COMPOSE_PROFILES" "$COMPOSE_PROFILES"
  write_env_var "$RELEASE_ENV_FILE" "COMPOSE_PROJECT_NAME" "$COMPOSE_PROJECT_NAME"
  write_env_var "$RELEASE_ENV_FILE" "DEPLOY_GROUP" "${DEPLOY_GROUP:-}"
  write_env_var "$RELEASE_ENV_FILE" "FRONTEND_API_URL" "${FRONTEND_API_URL:-}"
  write_env_var "$RELEASE_ENV_FILE" "FRONTEND_IMAGE" "$FRONTEND_IMAGE"
  write_env_var "$RELEASE_ENV_FILE" "HEALTHCHECK_URLS" "$HEALTHCHECK_URLS"
  write_env_var "$RELEASE_ENV_FILE" "MOSQUITTO_PASSWORD_DIR" "$MOSQUITTO_PASSWORD_DIR"
  write_env_var "$RELEASE_ENV_FILE" "MQTT_USERS_FILE" "$MQTT_USERS_FILE"
  write_env_var "$RELEASE_ENV_FILE" "RELEASES_TO_KEEP" "$RELEASES_TO_KEEP"
  write_env_var "$RELEASE_ENV_FILE" "RELEASE_DIR" "$RELEASE_DIR"
}

deploy_release() {
  log "Deploying backend ${BACKEND_IMAGE} and frontend ${FRONTEND_IMAGE}"
  compose "$RELEASE_ENV_FILE" "$RELEASE_DIR" pull || return
  compose "$RELEASE_ENV_FILE" "$RELEASE_DIR" up -d --remove-orphans || return
}

promote_current_release() {
  cp "$RELEASE_ENV_FILE" "$CURRENT_ENV_FILE"
  ln -sfn "$RELEASE_DIR" "${DEPLOY_ROOT}/current"
  normalize_deploy_permissions
  cleanup_old_releases
  log "Deployment succeeded."
}

print_failed_release_context() {
  log "${1:-Deployment healthcheck failed.}"
  compose "$RELEASE_ENV_FILE" "$RELEASE_DIR" ps || true
  compose "$RELEASE_ENV_FILE" "$RELEASE_DIR" logs --tail=100 postgres-tls-setup postgres backend frontend caddy || true
}

main() {
  load_deployment_context
  validate_deployment_host
  prepare_release_directories
  build_mqtt_password_file
  resolve_healthcheck_urls
  login_to_registry
  snapshot_current_release
  write_release_state
  normalize_deploy_permissions
  if ! deploy_release; then
    print_failed_release_context "Compose deployment failed."
    rollback_to_previous || true
    fail "Deployment failed during compose startup."
  fi

  if run_healthchecks "$HEALTHCHECK_URLS"; then
    promote_current_release
    return 0
  fi

  print_failed_release_context
  rollback_to_previous || true
  fail "Deployment failed after healthcheck validation."
}

main "$@"
