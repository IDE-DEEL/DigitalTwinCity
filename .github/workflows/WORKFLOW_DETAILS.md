# Workflow details

Dit document legt de GitHub Actions workflows in `.github/workflows` uit. De korte index staat in [README.md](./README.md).

## Bestanden

| Bestand | Type | Wordt direct gestart? | Functie |
|---|---|---:|---|
| `ci-cd.yml` | Pipeline workflow | Ja | Bouwt/scant backend en frontend, publiceert images en deployt naar de server. |
| `docker-build-scan-publish.yml` | Reusable workflow | Nee, via `workflow_call` | Bevat de gedeelde build-, scan- en publishlogica. |

## CI/CD Pipeline

Bestand: `ci-cd.yml`

Naam in GitHub Actions:

```text
CI/CD Pipeline
```

Triggers:

| Event | Gedrag |
|---|---|
| Push naar `main` | Bouwt, scant en pusht backend en frontend images. Deployt daarna als beide builds slagen. |
| Push naar `dev` | Bouwt, scant en pusht backend en frontend images. Deployt niet. |
| Pull request naar `main` | Bouwt en scant backend en frontend. Pusht geen images en deployt niet. |
| `workflow_dispatch` | Bouwt, scant, pusht en deployt. Optioneel met handmatige backend/frontend image inputs. |

Padfilters voor push en pull request:

```text
backend/**
frontend/**
server/**
deploy/**
.github/workflows/**
```

Permissions:

| Permission | Waarom |
|---|---|
| `actions: read` | Lezen van workflowcontext. |
| `contents: read` | Checkout van de repository. |
| `packages: write` | Images naar GHCR pushen en deployment images pullen. |

Concurrency:

```text
ci-cd-${{ github.ref }}
```

Runs op dezelfde ref worden niet automatisch geannuleerd.

## Build jobs

`ci-cd.yml` heeft twee build jobs:

| Job | Reusable workflow inputs |
|---|---|
| `build-backend` | `component: Backend`, `context: ./backend`, `dockerfile: ./backend/Dockerfile`, `image_name: backend` |
| `build-frontend` | `component: Frontend`, `context: ./frontend`, `dockerfile: ./frontend/Dockerfile`, `image_name: frontend` |

Beide jobs gebruiken:

```yaml
uses: ./.github/workflows/docker-build-scan-publish.yml
secrets: inherit
```

## Reusable Docker workflow

Bestand: `docker-build-scan-publish.yml`

Naam in GitHub Actions:

```text
Reusable Docker Build, Scan and Publish
```

Deze workflow wordt alleen aangeroepen via `workflow_call`. Backend en frontend geven component-specifieke waarden mee, maar de uitvoeringsstappen zijn gelijk.

Inputs:

| Input | Betekenis |
|---|---|
| `component` | Label voor jobnaam, summary en rapporten, bijvoorbeeld `Backend`. |
| `context` | Docker build context. |
| `dockerfile` | Pad naar de Dockerfile. |
| `image_name` | Image naam onder de GHCR repository namespace. |

Outputs:

| Output | Betekenis |
|---|---|
| `image_ref` | De gescande image reference. |
| `critical_count` | Aantal `CRITICAL` vulnerabilities. |
| `high_count` | Aantal `HIGH` vulnerabilities. |
| `medium_count` | Aantal `MEDIUM` vulnerabilities. |

Stappen:

1. Checkout van de repository.
2. Docker Buildx initialiseren.
3. Inloggen op GHCR, maar alleen buiten pull requests op `main` of `dev`, of bij een handmatige `workflow_dispatch` run.
4. Repositorynaam naar lowercase zetten voor GHCR.
5. Image tag bepalen op basis van de korte commit SHA.
6. Image lokaal bouwen met `docker/build-push-action`.
7. Trivy JSON scan draaien.
8. Markdown-overzicht met aantallen en top findings maken.
9. Trivy rapporten uploaden als artifact.
10. Workflow laten falen als `critical_count` niet `0` is.
11. De gescande image pushen naar GHCR, maar alleen buiten pull requests op `main` of `dev`, of bij een handmatige `workflow_dispatch` run.

Image tags:

```text
ghcr.io/<owner>/<repo>/backend:sha-<short-sha>
ghcr.io/<owner>/<repo>/frontend:sha-<short-sha>
```

Er wordt bewust geen `latest` tag gepusht. Deployments en rollbacks horen immutable `sha-*` tags of digests te gebruiken.

Build cache:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max,ignore-error=true
```

De workflow laadt de image lokaal (`load: true`) omdat Trivy de lokaal gebouwde image scant voordat er wordt gepusht.

## Trivy beleid

Trivy draait met:

```text
scanners: vuln,secret,misconfig
vuln-type: os,library
severity: MEDIUM,HIGH,CRITICAL
ignore-unfixed: true
```

Blokkerend beleid:

| Severity | Effect |
|---|---|
| `CRITICAL` | Workflow faalt en image wordt niet gepusht. |
| `HIGH` | Wordt zichtbaar in summary en artifact, maar blokkeert niet automatisch. |
| `MEDIUM` | Wordt zichtbaar in summary en artifact, maar blokkeert niet automatisch. |

Artifacts:

```text
backend-trivy-reports-<run_number>
frontend-trivy-reports-<run_number>
```

Elk artifact bevat:

- `trivy-report.json`
- `trivy-overview.md`

## Deploy job

Job: `deploy`

De deploy-job draait alleen bij:

```text
github.event_name == 'workflow_dispatch'
```

of:

```text
github.event_name == 'push' && github.ref == 'refs/heads/main'
```

Runner:

```yaml
runs-on: self-hosted
```

De deploy-job gebruikt een `self-hosted` runner omdat de OpenICT lab VM niet bereikbaar is via een externe SSH-verbinding vanaf GitHub-hosted runners. De job gebruikt nog steeds SSH naar `DEPLOY_HOST`. De self-hosted runner moet dus SSH, `ssh-keyscan` en `scp` beschikbaar hebben.

Als de self-hosted runner op dezelfde OpenICT lab VM draait als de deployment-host, zet `DEPLOY_HOST` op `localhost`. De workflow maakt dan een lokale SSH-verbinding vanaf de runner naar dezelfde VM. `DEPLOY_USER`, `DEPLOY_SSH_KEY` en `authorized_keys` blijven ook in dat scenario nodig.

Belangrijkste taken:

1. Checkout van de repository.
2. Backend en frontend image references bepalen.
3. Release-id bepalen als `sha-<short-sha>`.
4. Release package maken in `package/`.
5. Private deploy key naar `~/.ssh/deploy_key` schrijven.
6. SSH host key ophalen met `ssh-keyscan`.
7. Release- en shared-mappen op de server aanmaken.
8. `server/*` naar de release-map kopieren.
9. `deploy/remote-deploy.sh` naar de release-map kopieren.
10. `release.env` maken en uploaden.
11. Op de server `release.env` sourcen en `remote-deploy.sh` starten.
12. Deployment summary schrijven.

## Handmatige deployment inputs

| Input | Betekenis |
|---|---|
| `backend_image` | Optionele backend image reference. Leeg betekent standaard `sha-<short-sha>` voor de workflowcommit. |
| `frontend_image` | Optionele frontend image reference. Leeg betekent standaard `sha-<short-sha>` voor de workflowcommit. |
| `rollback_on_failure` | `true` of `false`, standaard `true`. |

De huidige workflow valideert handmatige image-inputs niet inhoudelijk. Gebruik daarom bewust alleen immutable refs, bijvoorbeeld:

```text
ghcr.io/org/repo/backend:sha-abc1234
ghcr.io/org/repo/backend@sha256:<digest>
```

Gebruik geen mutable tags zoals:

```text
latest
dev
main
```

Een losse input zoals `sha-abc1234` wordt aangevuld tot de juiste GHCR reference voor het component:

```text
ghcr.io/<owner>/<repo>/backend:sha-abc1234
ghcr.io/<owner>/<repo>/frontend:sha-abc1234
```

Gebruik lege inputs voor de standaard image van de workflowcommit, of vul een volledige image reference in.

## Release package

Per release wordt op de server deze map gebruikt:

```text
<DEPLOY_PATH>/releases/sha-<short-sha>/
```

De CI/CD workflow kopieert:

- inhoud van `server/`
- `deploy/remote-deploy.sh`
- `release.env`

`release.env` bevat:

- `APP_ENV_FILE`
- `BACKEND_IMAGE`
- `COMPOSE_PROFILES`
- `FRONTEND_IMAGE`
- `RELEASES_TO_KEEP`
- `ROLLBACK_ON_FAILURE`

`GHCR_USERNAME` en `GHCR_TOKEN` worden niet in `release.env` opgeslagen. De workflow exporteert ze alleen tijdelijk in de remote SSH sessie waarin `remote-deploy.sh` draait.

## Remote deployment

Het remote script staat in `deploy/remote-deploy.sh`. De CI/CD workflow kopieert dit script naar de release-map en start het via SSH.

Belangrijkste fases:

1. Release- en deploy-rootpaden bepalen.
2. Mosquitto password-map voorbereiden.
3. `shared/mosquitto/mqtt-users.env` omzetten naar `shared/mosquitto/password/passwd` wanneer het bronbestand bestaat.
4. Optioneel inloggen op GHCR.
5. `docker compose pull` uitvoeren.
6. `docker compose up -d --remove-orphans` uitvoeren.
7. Healthchecks draaien.
8. Release promoten naar `current` als healthchecks slagen.
9. Oude releases opruimen volgens `RELEASES_TO_KEEP`.
10. `docker image prune -af --filter "until=24h"` uitvoeren tijdens cleanup.
11. Bij falen proberen de bestaande `current` release opnieuw te starten als rollback aan staat.

Standaard healthchecks:

```text
https://<DOMAIN>/health
https://<DOMAIN>/api/v1/health
```

Standaard verwacht de deployment HTTP-status `200`.

## Vereiste deployment secrets

| Secret | Verplicht | Doel |
|---|---|---|
| `DEPLOY_HOST` | Ja | Hostname of IP van de server. Gebruik `localhost` als de self-hosted runner op dezelfde OpenICT lab VM draait. |
| `DEPLOY_USER` | Ja | SSH user op de server. |
| `DEPLOY_SSH_KEY` | Ja | Private SSH key zonder passphrase. |
| `DEPLOY_PATH` | Ja | Rootmap voor releases en shared config. |
| `DEPLOY_PORT` | Nee | SSH poort, standaard `22`. |

De workflows gebruiken geen aparte GitHub environment in de YAML. Als secrets in een environment worden beheerd, moet de workflow daarvoor nog expliciet een `environment:` configuratie krijgen.

## Troubleshooting

### Build faalt op Trivy

Open de job summary of download het artifact `*-trivy-reports-*`. `CRITICAL` findings moeten opgelost of bewust gemitigeerd worden voordat de image gepusht wordt.

### Image wordt niet gepusht

Controleer:

- De run is geen pull request.
- De branch is `main` of `dev`.
- De Trivy stap heeft geen `CRITICAL` findings gevonden.
- De workflow heeft `packages: write`.

### Deployment wordt overgeslagen

Controleer:

- De run is een push naar `main`, niet naar `dev`.
- Of de run is handmatig gestart via `workflow_dispatch`.
- Beide build jobs zijn succesvol afgerond.

### Handmatige deployment gebruikt verkeerde image

Gebruik lege inputs voor de standaard image van de workflowcommit, een losse immutable tag, of een volledige immutable reference:

```text
sha-abc1234
ghcr.io/org/repo/backend:sha-abc1234
ghcr.io/org/repo/backend@sha256:<digest>
```

Een losse tag wordt door `ci-cd.yml` aangevuld met de juiste GHCR image voor het component.

Gebruik geen mutable tag zoals:

```text
latest
dev
main
```

### SSH host key ophalen faalt

Controleer:

- `DEPLOY_HOST` bevat alleen hostname of IP.
- `DEPLOY_PORT` klopt.
- De self-hosted runner kan de server bereiken. In de OpenICT lab VM setup is dit meestal `DEPLOY_HOST=localhost`.
- Firewall staat SSH toe op die poort.

### SSH authenticatie faalt

Controleer:

- `DEPLOY_SSH_KEY` is de volledige private key met BEGIN/END regels.
- De key heeft geen passphrase.
- De bijbehorende public key staat in `~/.ssh/authorized_keys` van `DEPLOY_USER`.

### Deployment faalt op healthcheck

De job toont `docker compose ps` en de laatste compose logs.

Controleer daarna op de server:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH/current"
set -a
. release.env
set +a
export APP_ENV_FILE="${APP_ENV_FILE:-../../shared/.env}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitaltwin}"
export MOSQUITTO_PASSWORD_DIR="${MOSQUITTO_PASSWORD_DIR:-$DEPLOY_PATH/shared/mosquitto/password}"
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-tls-setup postgres backend frontend caddy
```
