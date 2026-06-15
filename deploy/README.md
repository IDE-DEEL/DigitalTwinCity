# Deploymenthandleiding en serveroverdracht

Deze README is bedoeld als overdracht voor het deployment- en servergedeelte van dit project. Het doel is dat een volgend team begrijpt wat er op GitHub Actions en op de server gebeurt, welke secrets/configuratie nodig zijn, en hoe je een deployment controleert of herstelt.

## Projectgegevens

| Onderdeel | Waarde |
| --- | --- |
| GitHub owner/repo | `DiedeWiegerinck/INNO-Institute-for-Design-Engineering` |
| GHCR namespace | `ghcr.io/diedewiegerinck/inno-institute-for-design-engineering` |
| Backend image | `ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/backend:sha-<short-sha>` |
| Frontend image | `ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/frontend:sha-<short-sha>` |
| Automatische deploy branch | `main` |
| Extra publish branch | `dev` |

GitHub gebruikt de repositorynaam met hoofdletters, maar GHCR image names worden door de workflows naar lowercase omgezet. Daarom is de GHCR namespace volledig kleingeschreven.

## Begrippen

| Begrip | Betekenis |
| --- | --- |
| CI | Continuous Integration: code bouwen en scannen voordat die gebruikt wordt voor deployment. |
| CD | Continuous Deployment: automatisch uitrollen van een release naar de server. |
| GHCR | GitHub Container Registry. Hier staan de Docker images voor backend en frontend. |
| Immutable image | Een image reference die niet zomaar naar andere code kan wijzen, bijvoorbeeld `sha-abc1234` of `sha256:...`. |
| Self-hosted runner | Een GitHub Actions runner die op onze eigen VM/server draait. |
| `DEPLOY_PATH` | Rootmap op de server waar releases en shared config staan. |
| Release | Een map onder `<DEPLOY_PATH>/releases/` met composebestanden, scripts en `release.env` voor een specifieke commit. |
| `current` | Symlink naar de release die nu actief is. |
| `shared` | Servermap met secrets en configuratie die niet in Git staan. |
| Healthcheck | HTTP-controle waarmee de pipeline bepaalt of frontend en backend correct draaien. |
| Rollback | De bestaande `current` release opnieuw starten als de nieuwe release faalt voordat die gepromoveerd is. |

## Wat is er gebouwd?

Het deploymentgedeelte bestaat uit drie lagen.

Laag 1 is CI. `CI/CD Pipeline` roept de herbruikbare Docker workflow aan voor backend en frontend. De images worden gebouwd, met Trivy gescand en buiten pull requests naar GHCR gepubliceerd.

Laag 2 is CD. De deploy-job in `ci-cd.yml` draait op een self-hosted runner, bepaalt de image references, kopieert de serverbestanden via SSH naar een release-map en start het remote deploy script.

Laag 3 is de server. Op de server draait `remote-deploy.sh`. Dat script start Docker Compose, voert healthchecks uit, promoveert een release pas na succes en probeert de bestaande `current` release opnieuw te starten als iets misgaat.

## Belangrijkste bestanden

| Bestand of map | Wat is het? | Waarom is het belangrijk? |
| --- | --- | --- |
| `.github/workflows/ci-cd.yml` | Gecombineerde CI/CD workflow. | Bouwt/scant backend en frontend, publiceert images en deployt op `main` of handmatig. |
| `.github/workflows/docker-build-scan-publish.yml` | Herbruikbare Docker workflow. | Voorkomt dubbele CI-logica voor backend en frontend. |
| `deploy/remote-deploy.sh` | Remote deploy script. | Voert de echte deployment op de server uit. |
| `deploy/shared.env.example` | Productie-env template. | Startpunt voor `<DEPLOY_PATH>/shared/.env`. |
| `server/compose.yml` | Basis Docker Compose stack. | Draait Caddy, frontend, backend, MQTT, PostgreSQL en DuckDNS. |
| `server/compose.monitoring.yml` | Monitoring Compose stack. | Draait Grafana, Prometheus, Alertmanager, Loki, Alloy en exporters via profile `monitoring`. |
| `server/proxy/Caddyfile` | Caddy reverse proxy config. | Publiceert de applicatie via HTTPS. |
| `server/mosquitto/` | MQTT configuratie. | Regelt MQTT listeners, ACL en WebSocket toegang. |
| `server/postgresql/` | PostgreSQL configuratie. | Regelt databaseconfiguratie, TLS en rollen. |
| `server/monitoring/` | Monitoringconfiguratie. | Bevat dashboards, metrics, loggingconfiguratie en Alertmanager e-mailnotificaties. |

## Hoe werkt een normale deployment?

Dit is wat er gebeurt als code naar `main` gaat.

1. Een pull request naar `main` bouwt en scant backend en frontend, maar publiceert of deployt niet.
2. De pull request wordt gemerged, of een commit wordt direct gepusht naar `main`.
3. GitHub Actions start `CI/CD Pipeline`.
4. De pipeline start `build-backend` en `build-frontend`.
5. Elke build job roept `docker-build-scan-publish.yml` aan.
6. Trivy scant de image op vulnerabilities, secrets en misconfiguraties.
7. Als Trivy `CRITICAL` findings vindt, faalt de build. Er wordt dan geen image gepubliceerd en geen deployment uitgevoerd.
8. Als de scan goed genoeg is, pusht de workflow de images naar GHCR.
9. De images krijgen tags met de commit, bijvoorbeeld `sha-abc1234`.
10. De deploy-job start na succesvolle backend- en frontend-builds, maar alleen op push naar `main`.
11. De deploy-job draait op de self-hosted runner.
12. De runner maakt via SSH verbinding met de deployment-host.
13. De runner maakt een release-map aan onder `<DEPLOY_PATH>/releases/`.
14. De runner kopieert `server/` en `remote-deploy.sh` naar die release-map.
15. De runner uploadt `release.env` met runtimewaarden zoals `BACKEND_IMAGE`, `FRONTEND_IMAGE`, `COMPOSE_PROFILES`, `RELEASES_TO_KEEP` en `ROLLBACK_ON_FAILURE`.
16. De runner exporteert tijdelijk `GHCR_USERNAME` en `GHCR_TOKEN` in de remote SSH sessie, zodat `remote-deploy.sh` private GHCR images kan pullen zonder die token in `release.env` te bewaren.
17. Op de server sourcet de SSH-command `release.env` en start `remote-deploy.sh`.
18. Het script maakt of normaliseert de Mosquitto password file uit `<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env`.
19. Docker Compose trekt de nieuwe images en start de stack.
20. Het script voert de frontend- en backend-healthchecks uit.
21. Als beide healthchecks slagen, wordt de nieuwe release via symlink `current` actief.
22. Oude release-mappen worden opgeruimd volgens `RELEASES_TO_KEEP`.
23. Tijdens cleanup draait `docker image prune -af --filter "until=24h"`.
24. Als iets faalt, probeert het script de bestaande `current` release opnieuw te starten wanneer `ROLLBACK_ON_FAILURE=true`.

Het belangrijkste punt: de nieuwe release wordt pas actief gemarkeerd nadat de healthchecks slagen.

## Imagebeleid

De workflow maakt standaard geen `latest` tag. `latest` is onduidelijk, omdat de tag later naar andere code kan wijzen. Gebruik voor deployments daarom immutable references.

Voor deze repository zien de standaard image references er zo uit:

```text
ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/backend:sha-abc1234
ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/frontend:sha-abc1234
```

Handmatige deployments kunnen ook een digest gebruiken, bijvoorbeeld:

```text
ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/backend@sha256:<digest>
```

Let op: de huidige workflow valideert handmatige image-inputs niet inhoudelijk. Vul dus geen mutable tags zoals `latest`, `dev` of `main` in.

## Serverstructuur

`DEPLOY_PATH` is de rootmap van de deployment op de server. Een logische waarde is bijvoorbeeld:

```text
/opt/digital-twin
```

De deployment maakt en gebruikt deze structuur:

```text
<DEPLOY_PATH>/
  current -> releases/sha-abc1234
  releases/
    sha-abc1234/
      compose.yml
      compose.monitoring.yml
      remote-deploy.sh
      release.env
      ...
  shared/
    .env
    mosquitto/
      mqtt-users.env
      password/
        passwd
    alertmanager/
      smtp_auth_password
```

Wat hoort waar:

- `releases/` bevat bestanden die bij een specifieke release horen. Deze mappen mogen door de deployment worden aangemaakt en later worden opgeruimd.
- `shared/` bevat configuratie en secrets die over releases heen hetzelfde blijven. Deze map mag niet door een nieuwe release overschreven worden.
- `current` is een symlink naar de actieve release. Beheerders gebruiken deze map voor status- en logcommando's.

## Release-env en defaults

Elke release krijgt een `release.env`. De workflow uploadt dit bestand voordat `remote-deploy.sh` start.

Belangrijke waarden:

| Variabele | Betekenis | Default of bron |
| --- | --- | --- |
| `APP_ENV_FILE` | Env file die Compose gebruikt. | `../../shared/.env` |
| `BACKEND_IMAGE` | Immutable backend image voor deze release. | vanuit workflow |
| `FRONTEND_IMAGE` | Immutable frontend image voor deze release. | vanuit workflow |
| `COMPOSE_PROFILES` | Actieve Compose profiles. | `monitoring` |
| `RELEASES_TO_KEEP` | Aantal release-mappen dat bewaard blijft. | `3` |
| `ROLLBACK_ON_FAILURE` | Of de bestaande `current` release opnieuw gestart wordt bij falen. | `true` |

`GHCR_USERNAME` en `GHCR_TOKEN` worden niet in `release.env` geschreven. De workflow exporteert ze alleen in de remote SSH sessie tijdens de deployment.

`remote-deploy.sh` heeft daarnaast defaults voor:

| Variabele | Default |
| --- | --- |
| `COMPOSE_PROJECT_NAME` | `digitaltwin` |
| `MOSQUITTO_PASSWORD_DIR` | `<DEPLOY_PATH>/shared/mosquitto/password` |
| `MQTT_USERS_FILE` | `<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env` |
| `HEALTHCHECK_URLS` | `https://<DOMAIN>/health,https://<DOMAIN>/api/v1/health` |
| `HEALTHCHECK_ATTEMPTS` | `12` |
| `HEALTHCHECK_INTERVAL_SECONDS` | `10` |
| `HEALTHCHECK_TIMEOUT_SECONDS` | `5` |
| `HEALTHCHECK_EXPECTED_STATUS` | `200` |

## Serverstack

De productieomgeving draait met Docker Compose. De composebestanden komen uit de map `server/` en worden bij elke release naar de server gekopieerd.

| Service | Wat doet deze service? |
| --- | --- |
| `caddy` | Ontvangt publiek HTTPS-verkeer en stuurt dit door naar frontend, backend, MQTT WebSocket of Grafana. |
| `frontend` | Serveert de webapp via Nginx. |
| `backend` | Draait de FastAPI applicatie. |
| `postgres` | Slaat applicatiedata op. |
| `postgres-tls-setup` | Maakt TLS-certificaten voor PostgreSQL aan. |
| `mqtt` | Draait de Eclipse Mosquitto broker voor real-time communicatie. |
| `duckdns` | Houdt het DuckDNS-record actueel. |
| `grafana` | Toont dashboards via `/grafana/`. |
| `prometheus` | Verzamelt en bewaart metrics. |
| `alertmanager` | Ontvangt Prometheus-alerts en verstuurt e-mailnotificaties via Gmail SMTP. |
| `loki` | Bewaart logs. |
| `alloy` | Verzamelt container-, host- en journallogs. |
| `node-exporter` | Verzamelt hostmetrics. |
| `cadvisor` | Verzamelt containermetrics. |
| `mosquitto-exporter` | Exporteert MQTT metrics. |
| `postgres-exporter` | Exporteert PostgreSQL metrics. |
| `blackbox-exporter` | Controleert bereikbaarheid van HTTP/TCP endpoints. |

De monitoringservices staan in `compose.monitoring.yml` onder het Compose profile `monitoring`. De workflow zet standaard `COMPOSE_PROFILES=monitoring`.

Publieke routes:

| Route | Gaat naar |
| --- | --- |
| `https://<DOMAIN>/` | Frontend |
| `https://<DOMAIN>/api*` | Backend |
| `wss://<DOMAIN>/mqtt` | MQTT via WebSocket |
| `https://<DOMAIN>/grafana*` | Grafana |

PostgreSQL en MQTT zijn niet direct op de host gepubliceerd. Browserclients verbinden met MQTT via Caddy op `wss://<DOMAIN>/mqtt`; interne containers gebruiken `mqtt:1883`.

## Eerste inrichting van een server

### 1. Installeer serverbenodigdheden

De server heeft minimaal nodig:

- Docker Engine;
- Docker Compose v2;
- `curl`;
- SSH-toegang;
- een Linux user voor deployment;
- toegang tot Docker en hostlogpaden zoals `/var/run/docker.sock`, `/var/log` en `/var/log/journal` wanneer monitoring/logging actief is.

Controleer Docker:

```bash
docker --version
docker compose version
```

### 2. Maak een deploy user

Voorbeeld met user `github`:

```bash
sudo adduser github
sudo usermod -aG docker github
```

Log daarna opnieuw in als `github`, zodat de Docker group actief is.

### 3. Maak de deploy root

Voorbeeld met `/opt/digital-twin`:

```bash
sudo mkdir -p /opt/digital-twin/releases /opt/digital-twin/shared
sudo mkdir -p /opt/digital-twin/shared/mosquitto/password
sudo mkdir -p /opt/digital-twin/shared/alertmanager
sudo chown -R github:github /opt/digital-twin
```

### 4. Maak een SSH key voor GitHub Actions

Maak op je eigen machine een aparte deploy key:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./deploy_key -N ""
```

Zet de public key op de server:

```bash
ssh-copy-id -i ./deploy_key.pub github@<server-host>
```

De private key uit `deploy_key` komt in GitHub secret `DEPLOY_SSH_KEY`. Commit deze key nooit.

Controleer SSH:

```bash
ssh -i ./deploy_key github@<server-host>
```

### 5. Richt de self-hosted runner in

Open in GitHub:

```text
Settings > Actions > Runners > New self-hosted runner
```

Belangrijk voor deze setup:

- de runner moet de deployment-host via SSH kunnen bereiken;
- als runner en applicatie op dezelfde VM draaien, gebruik je `DEPLOY_HOST=localhost`;
- de runner moet `ssh`, `ssh-keyscan` en `scp` hebben;
- zet de runner als service aan, zodat hij na een reboot weer online komt.

### 6. Maak GitHub Actions secrets aan

Open in GitHub:

```text
Settings > Secrets and variables > Actions > New repository secret
```

Maak deze secrets aan:

| Secret | Verplicht | Waarde |
| --- | --- | --- |
| `DEPLOY_HOST` | Ja | Hostname of IP van de server. Gebruik `localhost` als runner en applicatie op dezelfde VM staan. |
| `DEPLOY_USER` | Ja | SSH user op de server, bijvoorbeeld `github`. |
| `DEPLOY_SSH_KEY` | Ja | Volledige private deploy key, inclusief begin- en eindregels. |
| `DEPLOY_PATH` | Ja | Rootmap voor releases en shared config, bijvoorbeeld `/opt/digital-twin`. Laat het pad niet eindigen met `/`. |
| `DEPLOY_PORT` | Nee | SSH poort. Standaard `22`. |

GHCR gebruikt `github.actor` en `github.token`. Daarvoor is normaal geen extra secret nodig.

### 7. Maak productieconfiguratie aan

Maak dit bestand op de server:

```text
<DEPLOY_PATH>/shared/.env
```

Gebruik `deploy/shared.env.example` als template. Vul placeholders met echte productiewaarden.

Belangrijkste groepen:

| Groep | Variabelen |
| --- | --- |
| Domein en TLS | `DOMAIN`, `LETSENCRYPT_EMAIL`, `DUCKDNS_DOMAIN`, `DUCKDNS_TOKEN` |
| PostgreSQL | `DT_PG_DB`, `DT_PG_ADMIN_*`, `DT_PG_DEVELOPER_*`, `DT_PG_MONITOR_*`, `DATABASE_URL` |
| Backend auth | `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SECRET_KEY` |
| Browser/API | `CORS_ALLOW_ORIGINS`, `SESSION_COOKIE_*` |
| Backend MQTT client | `MQTT_HOST`, `MQTT_PORT`, `MQTT_PATH`, `MQTT_USERNAME`, `MQTT_PASSWORD` |
| Monitoring | `GF_SERVER_ROOT_URL`, `GRAFANA_PASSWORD` |

Dit bestand hoort niet in Git. Het staat alleen op de server.

Alertmanager gebruikt daarnaast een apart secretbestand voor Gmail SMTP:

```text
<DEPLOY_PATH>/shared/alertmanager/smtp_auth_password
```

### 8. Maak MQTT users aan

MQTT users staan bewust niet in `.env`. Maak op de server:

```text
<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env
```

Formaat:

```text
username=sterk-wachtwoord
```

Voor deze stack moet minimaal de backend-user uit `.env` ook in dit bestand staan. Bijvoorbeeld:

```dotenv
backend_user=change_me_backend_password
auto_A=change_me_auto_A_password
auto_B=change_me_auto_B_password
auto_C=change_me_auto_C_password
auto_D=change_me_auto_D_password
```

Tijdens deployment zet `remote-deploy.sh` dit automatisch om naar:

```text
<DEPLOY_PATH>/shared/mosquitto/password/passwd
```

## Normaal beheer

### Automatisch deployen

De normale route is een pull request naar `main`, gevolgd door een merge naar `main`. Directe pushes naar `main` volgen dezelfde build- en deployroute.

Wat je als beheerder doet:

1. Open GitHub Actions.
2. Controleer dat `CI/CD Pipeline` slaagt.
3. Bekijk in de job summary welke commit, backend image en frontend image zijn uitgerold.
4. Controleer de healthchecks.

Healthchecks:

```bash
curl -fsS https://<DOMAIN>/health
curl -fsS https://<DOMAIN>/api/v1/health
```

### Handmatig deployen

Gebruik handmatige deployment alleen als je bewust opnieuw wilt deployen of een specifieke immutable image wilt testen.

Open in GitHub:

```text
Actions > CI/CD Pipeline > Run workflow
```

Aanbevolen inputs:

| Input | Waarde |
| --- | --- |
| `backend_image` | Leeg laten voor de standaard `sha-<commit>` image. |
| `frontend_image` | Leeg laten voor de standaard `sha-<commit>` image. |
| `rollback_on_failure` | `true` |

Als je een image invult, gebruik dan een losse immutable tag of een volledige immutable reference. Een losse tag zoals `sha-abc1234` wordt door de workflow aangevuld naar de juiste backend- of frontend-image.

```text
sha-abc1234
ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/backend:sha-abc1234
ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/backend@sha256:<digest>
```

Gebruik geen `latest`.

## Healthchecks

De deployment controleert standaard twee endpoints:

```text
https://<DOMAIN>/health
https://<DOMAIN>/api/v1/health
```

De verwachte HTTP-status is `200`.

Standaard probeert `remote-deploy.sh` elke URL 12 keer. Tussen pogingen zit 10 seconden en per poging is de timeout 5 seconden.

Als beide URLs status `200` geven, wordt de release geslaagd verklaard. Als een van de URLs blijft falen, wordt de release niet gepromoveerd naar `current`.

## Rollback en fail-procedure

De huidige rollbacklogica gebruikt de bestaande `current` symlink. Omdat `current` pas na succesvolle healthchecks naar de nieuwe release wijst, blijft de vorige werkende release actief wanneer een nieuwe release faalt voor promotie.

Als `docker compose pull`, `docker compose up` of een healthcheck faalt:

1. De pipeline toont `docker compose ps`.
2. De pipeline toont de laatste compose logs.
3. Als `ROLLBACK_ON_FAILURE=true`, start het script de bestaande `current` release opnieuw.
4. De pipeline faalt alsnog, zodat de fout zichtbaar blijft.

Bij de eerste deployment bestaat er nog geen `current` release. Rollback is dan niet mogelijk. In dat geval is een duidelijke pipeline-fail de juiste uitkomst.

## Traceerbaarheid

Deployment is traceerbaar via meerdere bronnen:

| Plek | Wat kun je daar zien? |
| --- | --- |
| GitHub Actions job summary | Source commit, release-id, backend image en frontend image. |
| GHCR packages | De gepubliceerde backend- en frontendimages met `sha-*` tags. |
| Trivy artifacts | Scanrapporten van de images. |
| `<DEPLOY_PATH>/releases/<release-id>/` | De exacte releasebestanden die op de server zijn gezet. |
| `<DEPLOY_PATH>/current` | De release die nu actief is. |
| `<DEPLOY_PATH>/current/release.env` | Image references en runtimewaarden van de actieve release. |
| Docker logs | Runtime logs van services. |

Actieve release bekijken:

```bash
readlink -f <DEPLOY_PATH>/current
cat <DEPLOY_PATH>/current/release.env
```

## Servercontroles

Gebruik productiecommando's vanuit de actieve release:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH/current"
set -a
. release.env
set +a
export APP_ENV_FILE="${APP_ENV_FILE:-../../shared/.env}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitaltwin}"
export MOSQUITTO_PASSWORD_DIR="${MOSQUITTO_PASSWORD_DIR:-$DEPLOY_PATH/shared/mosquitto/password}"
```

Containerstatus:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps
```

Logs:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-tls-setup postgres backend frontend caddy mqtt
```

Monitoringlogs:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 grafana prometheus alertmanager loki alloy node-exporter cadvisor mosquitto-exporter postgres-exporter blackbox-exporter
```

Stack opnieuw starten:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
```

## Handmatige rollback

Gebruik handmatige rollback alleen als automatische rollback niet gelukt is en je bewust naar een oudere release wilt.

Beschikbare releases bekijken:

```bash
export DEPLOY_PATH="/opt/digital-twin"
ls -dt "$DEPLOY_PATH"/releases/*
```

Een gekozen release opnieuw starten:

```bash
export DEPLOY_PATH="/opt/digital-twin"
previous_release="$DEPLOY_PATH/releases/sha-abc1234"
cd "$previous_release"
set -a
. release.env
set +a
export APP_ENV_FILE="${APP_ENV_FILE:-../../shared/.env}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitaltwin}"
export MOSQUITTO_PASSWORD_DIR="${MOSQUITTO_PASSWORD_DIR:-$DEPLOY_PATH/shared/mosquitto/password}"
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
ln -sfn "$previous_release" "$DEPLOY_PATH/current"
```

Controleer daarna:

```bash
curl -fsS https://<DOMAIN>/health
curl -fsS https://<DOMAIN>/api/v1/health
```

## Veelvoorkomende problemen

| Probleem | Waarschijnlijke oorzaak | Eerste controle |
| --- | --- | --- |
| Build faalt op Trivy | Image bevat `CRITICAL` vulnerability of scanfinding. | GitHub job summary en artifact `*-trivy-reports-*`. |
| Image wordt niet gepusht | Run is een pull request, of draait niet op `main`, `dev` of handmatig via `workflow_dispatch`. | Event en branch van de workflowrun. |
| Deployment wordt overgeslagen | Run is geen push naar `main` en geen handmatige run. | `CI/CD Pipeline`, jobconditie van `deploy`. |
| Secrets ontbreken | GitHub Actions secrets zijn niet of verkeerd ingesteld. | `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`. |
| SSH host key ophalen faalt | Hostname, poort of netwerk klopt niet. | `DEPLOY_HOST` mag geen `user@host` of `ssh://...` bevatten. |
| SSH authenticatie faalt | Public key staat niet bij de deploy user. | `~/.ssh/authorized_keys` van `DEPLOY_USER`. |
| Server mist configuratie | `.env` staat niet op de server. | `<DEPLOY_PATH>/shared/.env`. |
| MQTT login werkt niet | MQTT users file ontbreekt of heeft verkeerd formaat. | `<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env` en deploy logs. |
| Healthcheck faalt | Frontend, backend, Caddy of database is niet gezond. | `docker compose ps` en logs van `caddy`, `frontend`, `backend`, `postgres`. |
| Domein werkt niet | DNS, DuckDNS, firewall of Caddy probleem. | DuckDNS record, poort `80`, poort `443` en Caddy logs. |

## Wat kan het volgende team aanpassen?

Het volgende team kan veilig verder werken als ze deze afspraken behouden:

- Gebruik immutable image tags of digests voor deployment.
- Laat `shared/` op de server bestaan tussen releases.
- Commit geen productie-secrets.
- Houd `DEPLOY_HOST=localhost` als runner en applicatie op dezelfde VM draaien.
- Controleer na wijzigingen in `server/` altijd de healthchecks.
- Pas rollbacklogica alleen aan als duidelijk is wat er moet gebeuren bij een half mislukte deployment.
- Voeg backupdeployment pas opnieuw toe als er weer een echte backupserver en een duidelijk failoverplan zijn.

Voor mogelijke toekomstige verbeteringen:

- image-inputvalidatie in `ci-cd.yml`;
- aparte GitHub environment voor productie-secrets;
- expliciete alerts bij gefaalde deployment;
- handmatige approval voor productie-deployments;
- herintroductie van backupdeployment als de infrastructuur daarvoor terugkomt;
- extra healthchecks die niet alleen HTTP-status maar ook response body controleren.

## Overdracht checklist

Gebruik deze checklist voordat het project wordt overgedragen:

- GitHub Actions workflows staan in `.github/workflows/`.
- `CI/CD Pipeline` draait op een online self-hosted runner voor deployment.
- De runner kan via SSH naar de deployment-host.
- `DEPLOY_HOST=localhost` als runner en applicatie op dezelfde VM draaien.
- GitHub secrets zijn ingesteld: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH` en eventueel `DEPLOY_PORT`.
- De public key van `DEPLOY_SSH_KEY` staat in `authorized_keys` van de deploy user.
- Docker Engine en Docker Compose v2 werken op de server.
- `<DEPLOY_PATH>/shared/.env` bestaat en bevat productie-secrets.
- `<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env` bestaat als MQTT-login nodig is.
- De healthchecks werken: `https://<DOMAIN>/health` en `https://<DOMAIN>/api/v1/health`.
- Het team weet dat backupdeployment buiten scope is.
- Het team weet dat rollback naar de bestaande `current` release de afgesproken fail-procedure is.
- Het team weet dat de GHCR namespace lowercase is: `ghcr.io/diedewiegerinck/inno-institute-for-design-engineering`.
- Na iedere deployment wordt de GitHub job summary gecontroleerd.

## Meer detaildocumentatie

- Workflows: `../.github/workflows/README.md`
- Workflowdetails: `../.github/workflows/WORKFLOW_DETAILS.md`
- Serverstack: `../server/README.md`
- Monitoring: `../server/monitoring/README.md`
- MQTT: `../server/mosquitto/README.md`
- PostgreSQL: `../server/postgresql/README.md`
- Proxy/Caddy: `../server/proxy/README.md`
- Server scripts: `../server/scripts/README.md`
