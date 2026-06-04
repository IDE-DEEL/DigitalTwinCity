# Workflow details

Dit document legt de GitHub Actions workflows in `.github/workflows` uit. De korte index staat in [README.md](./README.md).

## Bestanden

| Bestand | Type | Wordt direct gestart? | Functie |
|---|---|---:|---|
| `backend-build-scan-publish.yml` | Caller workflow | Ja | Start de gedeelde Docker workflow voor de backend. |
| `frontend-build-scan-publish.yml` | Caller workflow | Ja | Start de gedeelde Docker workflow voor de frontend. |
| `docker-build-scan-publish.yml` | Reusable workflow | Nee, via `workflow_call` | Bevat de gedeelde build-, scan- en publishlogica. |
| `cd-deploy.yml` | Deployment workflow | Ja | Deployt een release naar de server. |

## Backend workflow

Bestand: `backend-build-scan-publish.yml`

Naam in GitHub Actions:

```text
Backend Build, Scan and Publish Docker Image
```

Triggers:

| Event | Gedrag |
|---|---|
| Push naar `main` | Bouwt en scant de backend image, pusht daarna naar GHCR als de scan slaagt. |
| Push naar `dev` | Bouwt en scant de backend image, pusht daarna naar GHCR als de scan slaagt. |
| Pull request naar `main` | Bouwt en scant alleen bij wijzigingen in `backend/**`, deze workflow of de herbruikbare Docker workflow. Pusht geen image en deployt niet. |
| `workflow_dispatch` | Kan handmatig gestart worden. |

De workflow bevat zelf geen buildstappen. Hij roept `docker-build-scan-publish.yml` aan met deze inputs:

```yaml
component: Backend
context: ./backend
dockerfile: ./backend/Dockerfile
image_name: backend
```

Concurrency:

```text
backend-build-scan-publish-${{ github.ref }}
```

Nieuwe runs op dezelfde ref annuleren oudere backend-runs.

## Frontend workflow

Bestand: `frontend-build-scan-publish.yml`

Naam in GitHub Actions:

```text
Frontend Build, Scan and Publish Docker Image
```

Triggers:

| Event | Gedrag |
|---|---|
| Push naar `main` | Bouwt en scant de frontend image, pusht daarna naar GHCR als de scan slaagt. |
| Push naar `dev` | Bouwt en scant de frontend image, pusht daarna naar GHCR als de scan slaagt. |
| Pull request naar `main` | Bouwt en scant alleen bij wijzigingen in `frontend/**`, deze workflow of de herbruikbare Docker workflow. Pusht geen image en deployt niet. |
| `workflow_dispatch` | Kan handmatig gestart worden. |

De workflow roept `docker-build-scan-publish.yml` aan met deze inputs:

```yaml
component: Frontend
context: ./frontend
dockerfile: ./frontend/Dockerfile
image_name: frontend
```

Concurrency:

```text
frontend-build-scan-publish-${{ github.ref }}
```

Nieuwe runs op dezelfde ref annuleren oudere frontend-runs.

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
3. Inloggen op GHCR, maar alleen buiten pull requests en alleen op `main` of `dev`.
4. Repositorynaam naar lowercase zetten voor GHCR.
5. Image tag bepalen op basis van de korte commit SHA.
6. Image lokaal bouwen met `docker/build-push-action`.
7. Trivy JSON scan draaien.
8. Markdown-overzicht met aantallen en top findings maken.
9. Trivy rapporten uploaden als artifact.
10. Workflow laten falen als `critical_count` niet `0` is.
11. De gescande image pushen naar GHCR, maar alleen buiten pull requests en alleen op `main` of `dev`.

Image tags:

```text
ghcr.io/<owner>/<repo>/backend:sha-<short-sha>
ghcr.io/<owner>/<repo>/frontend:sha-<short-sha>
```

Er wordt bewust geen `latest` tag gepusht. Deployments en rollbacks gebruiken immutable `sha-*` tags of `sha256` digests.

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

## CD workflow

Bestand: `cd-deploy.yml`

Naam in GitHub Actions:

```text
CD Deploy
```

Triggers:

| Event | Gedrag |
|---|---|
| `workflow_run` op push naar `main` | Start nadat de backend- of frontend-build workflow klaar is. Pull-request runs starten geen deployment. |
| `workflow_dispatch` | Handmatige deployment met optionele image inputs. |

Permissions:

| Permission | Waarom |
|---|---|
| `actions: read` | Nodig om workflow-runs voor dezelfde commit te controleren. |
| `contents: read` | Nodig voor checkout van de deployment source. |
| `packages: read` | Nodig om images uit GHCR te kunnen pullen. |

Concurrency:

```text
cd-deploy-${{ github.event.workflow_run.head_branch || github.ref_name }}
```

CD runs worden niet geannuleerd. Ze lopen per branch op volgorde.

## CD jobs

### `upstream-failed`

Deze job draait alleen bij automatische `workflow_run` events als de upstream build niet succesvol was.

Effect:

- De deployment stopt direct.
- De job faalt expliciet met de conclusie van de upstream workflow.

### `prepare`

Deze job draait op `ubuntu-latest` en bouwt de deployment-context.

Belangrijkste taken:

1. Checkout van de source commit die gedeployed moet worden.
2. Bepalen welke bestanden in de source commit gewijzigd zijn ten opzichte van de vorige `main` commit.
3. Bij automatische runs bepalen of backend-, frontend-, server- en/of deploy-wijzigingen een deployment vragen.
4. Via de GitHub API controleren of de verwachte backend- en frontend-builds voor dezelfde commit klaar en succesvol zijn.
5. De default image references bepalen.
6. Handmatige image inputs valideren.
7. Outputs schrijven voor de deploy-job.

Wanneer `should_deploy=false` wordt gezet:

- Een verwachte backend- of frontend-build voor dezelfde commit is nog niet klaar.
- De automatische run bevat geen wijzigingen in `backend/`, `frontend/`, `server/` of `deploy/`.

Bij app-, server- en deploy-wijzigingen wacht de workflow dus logisch tot beide app-images van dezelfde commit bestaan. Een te vroeg getriggerde deploy-run wordt overgeslagen in plaats van een halve release uit te rollen.

Outputs:

| Output | Betekenis |
|---|---|
| `backend_image` | Backend image die gedeployed wordt. |
| `frontend_image` | Frontend image die gedeployed wordt. |
| `release_id` | Release-id, altijd `sha-<short-sha>`. |
| `should_deploy` | `true` of `false`. |
| `source_sha` | Volledige source commit SHA. |

### `deploy`

Deze job draait alleen als `should_deploy == 'true'`.

Runner:

```yaml
runs-on: self-hosted
```

De deploy-job gebruikt een `self-hosted` runner omdat de OpenICT lab VM niet bereikbaar is via een externe SSH-verbinding vanaf GitHub-hosted runners. De job gebruikt nog steeds SSH naar `DEPLOY_HOST`. De self-hosted runner moet dus SSH, `ssh-keygen`, `ssh-keyscan` en `scp` beschikbaar hebben.

Als de self-hosted runner op dezelfde OpenICT lab VM draait als de deployment-host, zet `DEPLOY_HOST` op `localhost`. De workflow maakt dan een lokale SSH-verbinding vanaf de runner naar dezelfde VM. `DEPLOY_USER`, `DEPLOY_SSH_KEY` en `authorized_keys` blijven ook in dat scenario nodig.

Belangrijkste taken:

1. Checkout van de deployment package op `source_sha`.
2. Verplichte deploy-secrets controleren.
3. Private deploy key naar `~/.ssh/deploy_key` schrijven.
4. Controleren dat de key geldig en zonder passphrase is.
5. SSH host key ophalen met `ssh-keyscan`.
6. SSH toegang testen.
7. Primary group van de remote deploy user bepalen.
8. Release-, shared- en state-mappen op de server aanmaken.
9. `server/.` naar de release-map kopieren.
10. `deploy/remote-deploy.sh` naar de release-map kopieren.
11. `deploy/README.md` als `DEPLOYMENT.md` naar de release-map kopieren.
12. Tijdelijke `runtime.env` uploaden.
13. Remote deployment starten.
14. Deployment summary schrijven.

## Handmatige CD inputs

| Input | Betekenis |
|---|---|
| `backend_image` | Leeg, losse immutable backend tag of volledige immutable backend reference. |
| `frontend_image` | Leeg, losse immutable frontend tag of volledige immutable frontend reference. |
| `rollback_on_failure` | `true` of `false`, standaard `true`. |

Image input-regels:

| Inputvorm | Voorbeeld | Resultaat |
|---|---|---|
| Leeg | `""` | `ghcr.io/<owner>/<repo>/<component>:sha-<short-sha>` |
| Losse SHA-tag | `sha-abc1234` | Wordt aangevuld naar de GHCR image voor het component. |
| Volledige SHA-tag | `ghcr.io/org/repo/backend:sha-abc1234` | Wordt direct gebruikt. |
| Digest | `ghcr.io/org/repo/backend@sha256:...` | Wordt direct gebruikt. |
| Mutable tag | `latest` | Wordt geweigerd. |

## Release package

Per release wordt op de server deze map gebruikt:

```text
<DEPLOY_PATH>/releases/sha-<short-sha>/
```

De CD workflow kopieert:

- `server/.`
- `deploy/remote-deploy.sh`
- `deploy/README.md` als `DEPLOYMENT.md`
- tijdelijke `runtime.env`

`runtime.env` bevat onder andere:

- backend en frontend image references
- rollback-instelling
- GHCR credentials
- compose profile
- deploy group
- healthcheck defaults

De remote command sourcet `runtime.env` en verwijdert het bestand direct voor `remote-deploy.sh` start.

## Remote deployment

Het remote script staat in `deploy/remote-deploy.sh`. De CD workflow kopieert dit script naar de release-map en start het via SSH.

Belangrijkste fases:

1. Verplichte image references en paden bepalen.
2. Docker, Docker Compose v2, `curl` en composebestanden valideren.
3. State- en Mosquitto runtime-mappen aanmaken.
4. `shared/mosquitto/mqtt-users.env` omzetten naar `shared/mosquitto/password/passwd`.
5. Healthcheck URLs bepalen uit `HEALTHCHECK_URLS` of `DOMAIN`.
6. Optioneel inloggen op GHCR.
7. Huidige release opslaan als previous release.
8. `release.env` schrijven.
9. Release- en state-permissies normaliseren.
10. `docker compose pull` uitvoeren.
11. `docker compose up -d --remove-orphans` uitvoeren.
12. Healthchecks draaien.
13. Release promoten naar `current` als healthchecks slagen.
14. Oude releases opruimen.
15. Backend- en frontendimages van verwijderde releases opruimen als geen bewaarde release-state ze nog gebruikt.
16. Bij falen proberen terug te rollen naar de vorige release als rollback aan staat.

Standaard healthchecks:

```text
https://<DOMAIN>/health
https://<DOMAIN>/api/v1/health
```

Standaard verwacht de deployment HTTP-status `200`.

## Vereiste CD secrets

| Secret | Verplicht | Doel |
|---|---|---|
| `DEPLOY_HOST` | Ja | Hostname of IP van de server. Gebruik `localhost` als de self-hosted runner op dezelfde OpenICT lab VM draait. |
| `DEPLOY_USER` | Ja | SSH user op de server. |
| `DEPLOY_SSH_KEY` | Ja | Private SSH key zonder passphrase. |
| `DEPLOY_PATH` | Ja | Rootmap voor releases, shared config en state. |
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

### CD deploy wordt overgeslagen

Controleer in `Prepare deployment context` of `should_deploy=false` is gezet.

Meest voorkomende oorzaken:

- De andere verwachte build workflow voor dezelfde commit is nog niet klaar.
- Er waren geen wijzigingen in `backend/`, `frontend/`, `server/` of `deploy/`.

### Handmatige CD weigert image input

Gebruik een immutable reference:

```text
sha-abc1234
ghcr.io/org/repo/backend:sha-abc1234
ghcr.io/org/repo/backend@sha256:<digest>
```

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

De job toont `docker compose ps` en logs van `postgres-tls-setup`, `postgres`, `backend`, `frontend` en `caddy`.

Controleer daarna op de server:

```bash
cd <DEPLOY_PATH>/current
project_name="$(. ../../state/current-release.env; printf '%s' "$COMPOSE_PROJECT_NAME")"
docker compose --env-file ../../shared/.env -f compose.yml -f compose.monitoring.yml --project-name "$project_name" ps
docker compose --env-file ../../shared/.env -f compose.yml -f compose.monitoring.yml --project-name "$project_name" logs --tail=100 postgres-tls-setup postgres backend frontend caddy
```
