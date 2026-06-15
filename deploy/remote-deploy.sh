#!/usr/bin/env bash
set -Eeuo pipefail

log() { printf '[deploy] %s\n' "$*" ; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2 ; exit 1 ; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$SCRIPT_DIR"
DEPLOY_ROOT="$(cd -- "${RELEASE_DIR}/../.." && pwd)"
APP_ENV_FILE="${APP_ENV_FILE:-../../shared/.env}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitaltwin}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME//[^a-zA-Z0-9_-]/-}"
RELEASES_TO_KEEP="${RELEASES_TO_KEEP:-3}"

compose() {
  docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" "$@"
}

prepare_mosquitto() {
  MOSQUITTO_PASSWORD_DIR="${MOSQUITTO_PASSWORD_DIR:-${DEPLOY_ROOT}/shared/mosquitto/password}"
  MQTT_USERS_FILE="${MQTT_USERS_FILE:-${DEPLOY_ROOT}/shared/mosquitto/mqtt-users.env}"
  export MOSQUITTO_PASSWORD_DIR MQTT_USERS_FILE
  mkdir -p "$MOSQUITTO_PASSWORD_DIR" "${RELEASE_DIR}/mosquitto/psk"

  local mosquitto_uid="${MOSQUITTO_UID:-1883}"
  local mosquitto_gid="${MOSQUITTO_GID:-1883}"

  if [[ -f "$MQTT_USERS_FILE" ]]; then
    local tmp_passwd="passwd.tmp"
    local docker_script="set -e; rm -f \"/password/${tmp_passwd}\"; "
    local created=false

    while IFS= read -r line || [[ -n "$line" ]]; do
      line="${line%$'\r'}"
      [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]] || continue

      local username="${line%%=*}"
      local password="${line#*=}"

      if [[ "$created" == "false" ]]; then
        docker_script+="mosquitto_passwd -c -b '/password/${tmp_passwd}' '${username}' '${password}' >/dev/null; "
        created=true
      else
        docker_script+="mosquitto_passwd -b '/password/${tmp_passwd}' '${username}' '${password}' >/dev/null; "
      fi
    done < "$MQTT_USERS_FILE"

    if [[ "$created" == "true" ]]; then
      docker_script+="mv \"/password/${tmp_passwd}\" \"/password/passwd\"; "
      printf '%s' "$docker_script" | docker run -i --rm --user 0:0 -v "${MOSQUITTO_PASSWORD_DIR}:/password" eclipse-mosquitto:2.1.2-alpine sh
    fi
  fi

  # Fix permissions and ensure file exists
  docker run --rm --user 0:0 -e MOSQUITTO_UID="$mosquitto_uid" -e MOSQUITTO_GID="$mosquitto_gid" -v "${MOSQUITTO_PASSWORD_DIR}:/password" eclipse-mosquitto:2.1.2-alpine sh -c 'if [ ! -e /password/passwd ]; then : > /password/passwd; fi; chown "$MOSQUITTO_UID:$MOSQUITTO_GID" /password /password/passwd; chmod 755 /password; chmod 640 /password/passwd'
}

run_healthchecks() {
  local urls_csv="$1"
  local attempts="${HEALTHCHECK_ATTEMPTS:-12}"
  local interval="${HEALTHCHECK_INTERVAL_SECONDS:-10}"
  local timeout="${HEALTHCHECK_TIMEOUT_SECONDS:-5}"
  local expected_status="${HEALTHCHECK_EXPECTED_STATUS:-200}"

  if [[ -z "$urls_csv" ]]; then
     local domain
     domain="$(awk -F= -v key="DOMAIN" '$0 !~ /^[[:space:]]*#/ && $1 == key { sub(/^[^=]*=/, ""); sub(/\r$/, ""); print; exit }' "${RELEASE_DIR}/${APP_ENV_FILE}")"
     urls_csv="https://${domain}/health,https://${domain}/api/v1/health"
  fi

  local -a urls
  IFS=',' read -r -a urls <<< "$urls_csv"
  for url in "${urls[@]}"; do
    url="${url#"${url%%[![:space:]]*}"}"
    url="${url%"${url##*[![:space:]]}"}"
    [[ -n "$url" ]] || continue

    local ok=false
    for attempt in $(seq 1 "$attempts"); do
      local response_status
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

cleanup_old_releases() {
  local releases_dir="${DEPLOY_ROOT}/releases"
  if [[ -d "$releases_dir" && "$RELEASES_TO_KEEP" -gt 0 ]]; then
    cd "$releases_dir"
    ls -dt */ | tail -n +$((RELEASES_TO_KEEP + 1)) | xargs -r rm -rf || true
    docker image prune -af --filter "until=24h" || true
  fi
}

rollback() {
  if [[ "${ROLLBACK_ON_FAILURE:-true}" != "true" ]]; then
    log "Rollback is disabled; deployment remains failed."
    return 1
  fi

  if [[ -d "${DEPLOY_ROOT}/current" ]]; then
    log "Rolling back to current (previous) release..."
    cd -P "${DEPLOY_ROOT}/current"
    if [[ -f release.env ]]; then
      set -a; source release.env; set +a
    fi
    docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
    log "Rolled back to previous version."
  else
    log "No previous release found; rollback is not possible."
  fi
  return 1
}

main() {
  cd "$RELEASE_DIR"
  prepare_mosquitto

  if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
    log "Logging in to GHCR."
    printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
    trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
  fi

  log "Deploying backend ${BACKEND_IMAGE:-} and frontend ${FRONTEND_IMAGE:-}"
  compose pull

  # Logout immediately after pulling so the token is not kept on disk longer than necessary
  docker logout ghcr.io >/dev/null 2>&1 || true
  trap - EXIT

  compose up -d --remove-orphans

  if ! run_healthchecks "${HEALTHCHECK_URLS:-}"; then
    log "Deployment healthcheck failed."
    compose ps || true
    compose logs --tail=100 || true
    rollback || true
    fail "Deployment failed and was rolled back."
  fi

  log "Deployment succeeded."
  ln -sfn "$RELEASE_DIR" "${DEPLOY_ROOT}/current"
  cleanup_old_releases
}

main "$@"
