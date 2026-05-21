# Deploymenthandleiding en serveroverdracht

Deze README is bedoeld als overdracht voor het deployment- en servergedeelte van
dit project. Het doel is dat een volgend team begrijpt:

- wat de deploymentomgeving is;
- welke onderdelen erbij horen;
- wat je moet instellen voordat deployment werkt;
- wat er gebeurt tijdens een automatische deployment;
- hoe je controleert of een deployment geslaagd is;
- wat je moet doen als een deployment faalt.

## Projectgegevens

| Onderdeel | Waarde |
| --- | --- |
| GitHub owner/repo | `DiedeWiegerinck/INNO-Institute-for-Design-Engineering` |
| GHCR namespace | `ghcr.io/diedewiegerinck/inno-institute-for-design-engineering` |
| Backend image | `ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/backend:sha-<short-sha>` |
| Frontend image | `ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/frontend:sha-<short-sha>` |
| Automatische deploy branch | `main` |
| Extra publish branch | `dev` |

GitHub gebruikt de repositorynaam met hoofdletters, maar GHCR image names worden
door de workflows naar lowercase omgezet. Daarom is de GHCR namespace volledig
kleingeschreven.

## Begrippen

| Begrip | Betekenis |
| --- | --- |
| CI | Continuous Integration: code bouwen en scannen voordat die gebruikt wordt voor deployment. |
| CD | Continuous Deployment: automatisch uitrollen van een release naar de server. |
| GHCR | GitHub Container Registry. Hier staan de Docker images voor backend en frontend. |
| Immutable image | Een image reference die niet zomaar naar andere code kan wijzen, bijvoorbeeld `sha-abc1234` of `sha256:...`. |
| Self-hosted runner | Een GitHub Actions runner die op onze eigen VM/server draait. |
| `DEPLOY_PATH` | Rootmap op de server waar releases, shared config en state staan. |
| Release | Een map onder `<DEPLOY_PATH>/releases/` met de composebestanden en scripts voor een specifieke commit. |
| `current` | Symlink naar de release die nu actief is. |
| `shared` | Servermap met secrets en configuratie die niet in Git staan. |
| `state` | Servermap met bestanden die bijhouden welke release actief en vorige release is. |
| Healthcheck | HTTP-controle waarmee de pipeline bepaalt of frontend en backend correct draaien. |
| Rollback | Teruggaan naar de vorige werkende release als de nieuwe release faalt. |

## Wat is er gebouwd?

Het deploymentgedeelte bestaat uit drie lagen.

Laag 1 is CI. De backend- en frontendworkflows bouwen Docker images, scannen ze
met Trivy en publiceren ze naar GHCR. Hierdoor wordt niet direct vanaf losse
broncode op de server gebouwd. De server trekt alleen kant-en-klare images.

Laag 2 is CD. De workflow `CD Deploy` bepaalt welke backend- en frontendimage
bij dezelfde commit horen, maakt via SSH verbinding met de server en kopieert de
deploymentbestanden naar een nieuwe release-map.

Laag 3 is de server. Op de server draait `remote-deploy.sh`. Dat script start
Docker Compose, voert healthchecks uit, promoveert een release pas na succes en
probeert rollback als iets misgaat.

## Belangrijkste bestanden

| Bestand of map | Wat is het? | Waarom is het belangrijk? |
| --- | --- | --- |
| `.github/workflows/backend-build-scan-publish.yml` | Backend CI workflow. | Zorgt dat backend images gebouwd, gescand en gepubliceerd worden. |
| `.github/workflows/frontend-build-scan-publish.yml` | Frontend CI workflow. | Zorgt dat frontend images gebouwd, gescand en gepubliceerd worden. |
| `.github/workflows/docker-build-scan-publish.yml` | Herbruikbare Docker workflow. | Voorkomt dubbele CI-logica voor backend en frontend. |
| `.github/workflows/cd-deploy.yml` | CD workflow. | Regelt de automatische deployment naar de server. |
| `deploy/remote-deploy.sh` | Remote deploy script. | Voert de echte deployment op de server uit. |
| `deploy/shared.env.example` | Productie-env template. | Startpunt voor `<DEPLOY_PATH>/shared/.env`. |
| `server/compose.yml` | Basis Docker Compose stack. | Draait Caddy, frontend, backend, MQTT, PostgreSQL en DuckDNS. |
| `server/compose.monitoring.yml` | Monitoring Compose stack. | Draait Grafana, Prometheus, Loki, Alloy en exporters. |
| `server/proxy/Caddyfile` | Caddy reverse proxy config. | Publiceert de applicatie via HTTPS. |
| `server/mosquitto/` | MQTT configuratie. | Regelt MQTT listeners, ACL en WebSocket toegang. |
| `server/postgresql/` | PostgreSQL configuratie. | Regelt databaseconfiguratie, TLS en rollen. |
| `server/monitoring/` | Monitoringconfiguratie. | Bevat dashboards, metrics en loggingconfiguratie. |

## Hoe werkt een normale deployment?

Dit is wat er gebeurt als code naar `main` gaat.

1. Een commit wordt gemerged of gepusht naar `main`.
2. GitHub Actions start de backend- en frontend-build workflows.
3. Elke workflow bouwt een Docker image.
4. Trivy scant de image op vulnerabilities, secrets en misconfiguraties.
5. Als Trivy `CRITICAL` findings vindt, faalt de build. Er wordt dan geen image
   gepubliceerd en er hoort geen deployment plaats te vinden.
6. Als de scan goed genoeg is, pusht de workflow de image naar GHCR.
7. De image krijgt een tag met de commit, bijvoorbeeld `sha-abc1234`.
8. `CD Deploy` start op `main`.
9. `CD Deploy` controleert of de backend- en frontendimage voor dezelfde commit
   allebei bestaan.
10. De deploy-job draait op de self-hosted runner.
11. De runner maakt via SSH verbinding met de deployment-host.
12. De runner maakt een release-map aan onder `<DEPLOY_PATH>/releases/`.
13. De runner kopieert `server/`, `remote-deploy.sh` en deze README naar die
    release-map.
14. De runner uploadt runtimewaarden zoals `BACKEND_IMAGE`, `FRONTEND_IMAGE`,
    `GHCR_TOKEN` en `ROLLBACK_ON_FAILURE`.
15. Op de server start `remote-deploy.sh`.
16. Het script controleert of Docker, Docker Compose, `curl` en
    `<DEPLOY_PATH>/shared/.env` bestaan.
17. Het script maakt of normaliseert de Mosquitto password file.
18. Het script bewaart de huidige release als vorige release.
19. Docker Compose trekt de nieuwe images en start de stack.
20. Het script voert de frontend- en backend-healthchecks uit.
21. Als beide healthchecks slagen, wordt de nieuwe release `current`.
22. Als iets faalt, probeert het script rollback naar de vorige release.

Het belangrijkste punt: de nieuwe release wordt pas actief gemarkeerd nadat de
healthchecks slagen.

## Imagebeleid

De deployment gebruikt geen `latest`. `latest` is onduidelijk, omdat de tag later
naar andere code kan wijzen. Daarom gebruikt deze setup immutable references.

Voor deze repository zien de standaard image references er zo uit:

```text
ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/backend:sha-abc1234
ghcr.io/diedewiegerinck/inno-institute-for-design-engineering/frontend:sha-abc1234
```

Handmatige deployments mogen ook een `sha256` digest gebruiken. De CD workflow
en `remote-deploy.sh` weigeren mutable tags zoals `latest`.

## Serverstructuur

`DEPLOY_PATH` is de rootmap van de deployment op de server. Een logische waarde
is bijvoorbeeld:

```text
/opt/digital-twin
```

De deployment maakt en gebruikt deze structuur:

```text
<DEPLOY_PATH>/
  current -> releases/sha-abc1234
  releases/
    sha-abc1234/
      DEPLOYMENT.md
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
  state/
    current-release.env
    previous-release.env
```

Wat hoort waar:

- `releases/` bevat bestanden die bij een specifieke release horen. Deze mappen
  mogen door de deployment worden aangemaakt en later worden opgeruimd.
- `shared/` bevat configuratie en secrets die over releases heen hetzelfde
  blijven. Deze map mag niet door een nieuwe release overschreven worden.
- `state/` bevat deployment-state. Hier staat welke release actief is en welke
  release gebruikt kan worden voor rollback.
- `current` is een symlink naar de actieve release. Beheerders gebruiken deze
  map voor status- en logcommando's.

## Serverstack

De productieomgeving draait met Docker Compose. De composebestanden komen uit de
map `server/` en worden bij elke release naar de server gekopieerd.

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
| `loki` | Bewaart logs. |
| `alloy` | Verzamelt container-, host- en journallogs. |
| `node-exporter` | Verzamelt hostmetrics. |
| `cadvisor` | Verzamelt containermetrics. |
| `mosquitto-exporter` | Exporteert MQTT metrics. |
| `postgres-exporter` | Exporteert PostgreSQL metrics. |
| `blackbox-exporter` | Controleert bereikbaarheid van HTTP/TCP endpoints. |

Publieke routes:

| Route | Gaat naar |
| --- | --- |
| `https://<DOMAIN>/` | Frontend |
| `https://<DOMAIN>/api*` | Backend |
| `wss://<DOMAIN>/mqtt` | MQTT via WebSocket |
| `https://<DOMAIN>/grafana*` | Grafana |

PostgreSQL is niet publiek beschikbaar en staat ook niet open op de host.
Alleen services binnen Docker verbinden met PostgreSQL via `postgres:5432`.

## Eerste inrichting van een server

Deze stappen zijn nodig als het volgende team een nieuwe mainserver moet
inrichten.

### 1. Installeer serverbenodigdheden

De server heeft minimaal nodig:

- Docker Engine;
- Docker Compose v2;
- `curl`;
- SSH-toegang;
- een Linux user voor deployment.

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
sudo mkdir -p /opt/digital-twin/releases /opt/digital-twin/shared /opt/digital-twin/state
sudo chown -R github:github /opt/digital-twin
```

Als meerdere beheerders moeten kunnen meekijken of aanpassen, zet dan de group
rechten goed:

```bash
sudo chgrp -R github /opt/digital-twin
sudo chmod -R g+rwX /opt/digital-twin
sudo find /opt/digital-twin -type d -exec chmod g+s {} +
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

Als `ssh-copy-id` niet beschikbaar is, voeg de inhoud van `deploy_key.pub`
handmatig toe aan:

```text
/home/github/.ssh/authorized_keys
```

De private key uit `deploy_key` komt straks in GitHub secret `DEPLOY_SSH_KEY`.
Commit deze key nooit.

Controleer SSH:

```bash
ssh -i ./deploy_key github@<server-host>
```

### 5. Richt de self-hosted runner in

Open in GitHub:

```text
Settings > Actions > Runners > New self-hosted runner
```

Volg de stappen die GitHub toont. Belangrijk voor deze setup:

- de runner moet de deployment-host via SSH kunnen bereiken;
- als runner en applicatie op dezelfde VM draaien, gebruik je
  `DEPLOY_HOST=localhost`;
- de runner moet `ssh`, `ssh-keygen`, `ssh-keyscan` en `scp` hebben;
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
| `DEPLOY_PATH` | Ja | Rootmap voor releases, shared config en state, bijvoorbeeld `/opt/digital-twin`. Laat het pad niet eindigen met `/`. |
| `DEPLOY_PORT` | Nee | SSH poort. Standaard `22`. |

GHCR gebruikt `github.actor` en `github.token`. Daarvoor is normaal geen extra
secret nodig.

### 7. Maak productieconfiguratie aan

Maak dit bestand op de server:

```text
<DEPLOY_PATH>/shared/.env
```

Gebruik `deploy/shared.env.example` als template. Vul placeholders met echte
productiewaarden.

Belangrijkste groepen:

| Groep | Variabelen |
| --- | --- |
| Domein en TLS | `DOMAIN`, `LETSENCRYPT_EMAIL`, `DUCKDNS_DOMAIN`, `DUCKDNS_TOKEN` |
| PostgreSQL | `DT_PG_DB`, `DT_PG_ADMIN_*`, `DT_PG_DEVELOPER_*`, `DT_PG_MONITOR_*`, `DATABASE_URL` |
| Backend auth | `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SECRET_KEY` |
| Browser/API | `CORS_ALLOW_ORIGINS`, `SESSION_COOKIE_*` |
| Monitoring | `GF_SERVER_ROOT_URL`, `GRAFANA_PASSWORD` |

Dit bestand hoort niet in Git. Het staat alleen op de server.

### 8. Maak MQTT users aan

MQTT users staan bewust niet in `.env`. Maak op de server:

```text
<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env
```

Formaat:

```text
username=sterk-wachtwoord
```

Tijdens deployment zet `remote-deploy.sh` dit automatisch om naar de gehashte
Mosquitto password file:

```text
<DEPLOY_PATH>/shared/mosquitto/password/passwd
```

## Normaal beheer

### Automatisch deployen

De normale route is een merge of push naar `main`.

Wat je als beheerder doet:

1. Open GitHub Actions.
2. Controleer dat de backend- en frontend-builds slagen.
3. Controleer daarna `CD Deploy`.
4. Bekijk in de job summary welke commit, backend image en frontend image zijn
   uitgerold.
5. Controleer de healthchecks.

Healthchecks:

```bash
curl -fsS https://<DOMAIN>/health
curl -fsS https://<DOMAIN>/api/v1/health
```

### Handmatig deployen

Gebruik handmatige deployment alleen als je bewust opnieuw wilt deployen of een
specifieke immutable image wilt testen.

Open in GitHub:

```text
Actions > CD Deploy > Run workflow
```

Aanbevolen inputs:

| Input | Waarde |
| --- | --- |
| `backend_image` | Leeg laten voor de standaard `sha-<commit>` image. |
| `frontend_image` | Leeg laten voor de standaard `sha-<commit>` image. |
| `rollback_on_failure` | `true` |

Als je een image invult, gebruik dan een immutable tag zoals:

```text
sha-abc1234
```

Gebruik geen `latest`.

## Healthchecks

De deployment controleert standaard twee endpoints:

```text
https://<DOMAIN>/health
https://<DOMAIN>/api/v1/health
```

De verwachte HTTP-status is `200`.

Standaard probeert `remote-deploy.sh` elke URL 12 keer. Tussen pogingen zit 10
seconden en per poging is de timeout 5 seconden. Dit geeft containers tijd om op
te starten voordat de deployment definitief faalt.

Als beide URLs status `200` geven, wordt de release geslaagd verklaard. Als een
van de URLs blijft falen, wordt de release niet gepromoveerd naar `current`.

## Rollback en fail-procedure

Voor elke nieuwe deployment bewaart het script eerst de huidige release in:

```text
<DEPLOY_PATH>/state/previous-release.env
```

Daarna schrijft het script de state van de nieuwe release naar:

```text
<DEPLOY_PATH>/releases/<release-id>/release.env
```

Als `docker compose pull` of `docker compose up` faalt:

1. De pipeline toont `docker compose ps`.
2. De pipeline toont de laatste logs van belangrijke services.
3. Als `ROLLBACK_ON_FAILURE=true`, start het script de vorige release opnieuw.
4. De rollback moet ook door de healthchecks komen.
5. De pipeline faalt alsnog, zodat de fout zichtbaar blijft.

Als de healthcheck van de nieuwe release faalt:

1. De nieuwe release wordt niet gekoppeld aan `current`.
2. De pipeline toont containerstatus en logs.
3. Het script probeert rollback naar de vorige release.
4. Als rollback slaagt, wijst `current` weer naar de vorige release.
5. Als rollback niet mogelijk is, blijft de pipeline failed en moet het team de
   logs onderzoeken.

Bij de eerste deployment bestaat er nog geen vorige release. Rollback is dan
niet mogelijk. In dat geval is een duidelijke pipeline-fail de juiste uitkomst.

## Traceerbaarheid

Deployment is traceerbaar via meerdere bronnen:

| Plek | Wat kun je daar zien? |
| --- | --- |
| GitHub Actions job summary | Source commit, release-id, backend image en frontend image. |
| GHCR packages | De gepubliceerde backend- en frontendimages met `sha-*` tags. |
| Trivy artifacts | Scanrapporten van de images. |
| `<DEPLOY_PATH>/releases/<release-id>/` | De exacte releasebestanden die op de server zijn gezet. |
| `<DEPLOY_PATH>/state/current-release.env` | De release die nu actief is. |
| `<DEPLOY_PATH>/state/previous-release.env` | De release waar rollback op terugvalt. |
| Docker logs | Runtime logs van services. |

Actieve release bekijken:

```bash
readlink -f <DEPLOY_PATH>/current
cat <DEPLOY_PATH>/state/current-release.env
```

## Servercontroles

Gebruik productiecommando's vanuit de actieve release:

```bash
cd <DEPLOY_PATH>/current
set -a
source ../../state/current-release.env
set +a
```

Containerstatus:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps
```

Logs:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-tls-setup postgres backend frontend caddy mqtt
```

Stack opnieuw starten:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
```

## Handmatige rollback

Gebruik handmatige rollback alleen als automatische rollback niet gelukt is en
je bewust naar de vorige release wilt.

```bash
previous_env="<DEPLOY_PATH>/state/previous-release.env"
previous_release="$(. "$previous_env"; printf '%s' "$RELEASE_DIR")"
project_name="$(. "$previous_env"; printf '%s' "$COMPOSE_PROJECT_NAME")"
cd "$previous_release"
docker compose --env-file ../../shared/.env -f compose.yml -f compose.monitoring.yml --project-name "$project_name" up -d --remove-orphans
ln -sfn "$previous_release" <DEPLOY_PATH>/current
cp "$previous_env" <DEPLOY_PATH>/state/current-release.env
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
| Image wordt niet gepusht | Run draait niet op `main` of `dev`, of het is een pull request. | Event en branch van de workflowrun. |
| CD wordt overgeslagen | Een verwachte build voor dezelfde commit is nog niet klaar, of er zijn geen wijzigingen in `backend/`, `frontend/`, `server/` of `deploy/`. | Job `Prepare deployment context`, output `should_deploy`. |
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
- Laat `shared/` en `state/` op de server bestaan tussen releases.
- Commit geen productie-secrets.
- Houd `DEPLOY_HOST=localhost` als runner en applicatie op dezelfde VM draaien.
- Controleer na wijzigingen in `server/` altijd de healthchecks.
- Pas rollbacklogica alleen aan als duidelijk is wat er moet gebeuren bij een
  half mislukte deployment.
- Voeg backupdeployment pas opnieuw toe als er weer een echte backupserver en
  een duidelijk failoverplan zijn.

Voor mogelijke toekomstige verbeteringen:

- aparte GitHub environment voor productie-secrets;
- expliciete alerts bij gefaalde deployment;
- handmatige approval voor productie-deployments;
- herintroductie van backupdeployment als de infrastructuur daarvoor terugkomt;
- extra healthchecks die niet alleen HTTP-status maar ook response body
  controleren.

## Overdracht checklist

Gebruik deze checklist voordat het project wordt overgedragen:

- GitHub Actions workflows staan in `.github/workflows/`.
- `CD Deploy` draait op een online self-hosted runner.
- De runner kan via SSH naar de deployment-host.
- `DEPLOY_HOST=localhost` als runner en applicatie op dezelfde VM draaien.
- GitHub secrets zijn ingesteld: `DEPLOY_HOST`, `DEPLOY_USER`,
  `DEPLOY_SSH_KEY`, `DEPLOY_PATH` en eventueel `DEPLOY_PORT`.
- De public key van `DEPLOY_SSH_KEY` staat in `authorized_keys` van de deploy
  user.
- Docker Engine en Docker Compose v2 werken op de server.
- `<DEPLOY_PATH>/shared/.env` bestaat en bevat productie-secrets.
- `<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env` bestaat als MQTT-login nodig
  is.
- De healthchecks werken:
  `https://<DOMAIN>/health` en `https://<DOMAIN>/api/v1/health`.
- Het team weet dat backupdeployment buiten scope is.
- Het team weet dat rollback naar de vorige release op de mainomgeving de
  afgesproken fail-procedure is.
- Het team weet dat de GHCR namespace lowercase is:
  `ghcr.io/diedewiegerinck/inno-institute-for-design-engineering`.
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
