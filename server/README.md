# Server stack

Deze map bevat alles wat op de deployment-host nodig is om de productie-stack met Docker Compose te draaien. De GitHub Actions CD workflow kopieert de inhoud van deze map naar elke release onder `<DEPLOY_PATH>/releases/<release-id>/`.

Voor deployment-details staat de runbook in `../deploy/README.md`. In de OpenICT lab omgeving draait de deploy-job op een self-hosted runner op de VM; als runner en deployment op dezelfde VM zitten, staat `DEPLOY_HOST` in GitHub Actions op `localhost`.

## Structuur

```text
server/
├─ compose.yml
├─ compose.monitoring.yml
├─ monitoring/
├─ mosquitto/
├─ postgresql/
├─ proxy/
└─ scripts/
```

Belangrijkste onderdelen:

| Pad | Doel |
|---|---|
| `compose.yml` | Applicatiestack: DuckDNS, Caddy, frontend, backend, MQTT, PostgreSQL en TLS-setup. |
| `compose.monitoring.yml` | Observabilitystack via profile `monitoring`: Grafana, Prometheus, Alertmanager, Loki, Alloy en exporters. |
| `proxy/Caddyfile` | Publieke HTTPS-routes, reverse proxy en Caddy metrics endpoint. |
| `mosquitto/` | MQTT brokerconfiguratie, listeners, ACL en password-file mountpoint. |
| `postgresql/` | PostgreSQL config, TLS setup, `pg_hba.conf` en init-script voor rollen. |
| `monitoring/` | Prometheus, alert rules, Alertmanager, Loki, Alloy en Grafana provisioning. |
| `scripts/` | Beheerscripts voor serverchecks en gebruikersbeheer. |

## Compose-context

In productie draait Compose vanuit de actieve release:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH"
set -a
. "$DEPLOY_PATH/state/current-release.env"
set +a
cd "$RELEASE_DIR"
```

Gebruik daarna steeds beide compose-bestanden:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" <command>
```

`current-release.env` bevat onder andere `BACKEND_IMAGE`, `FRONTEND_IMAGE`, `APP_ENV_FILE`, `COMPOSE_PROFILES`, `COMPOSE_PROJECT_NAME`, `MOSQUITTO_PASSWORD_DIR` en de healthcheck URLs. Alleen `--env-file ../../shared/.env` gebruiken is in productie niet genoeg, omdat de image references en release-specifieke paden door de deployment in release-state worden gezet.

De monitoring-services hebben in `compose.monitoring.yml` het profile `monitoring`. Ze starten alleen wanneer `COMPOSE_PROFILES=monitoring` gezet is, wanneer je `--profile monitoring` gebruikt, of wanneer je de services expliciet noemt.

## Services

`compose.yml` start de basisstack:

| Service | Image | Functie | Netwerken |
|---|---|---|---|
| `duckdns` | `lscr.io/linuxserver/duckdns:543b6a4c-ls80` | Houdt het DuckDNS-record actueel voor IPv4. | `network_mode: bridge` |
| `caddy` | `caddy:2.11.3-alpine` | Publieke HTTPS reverse proxy, compressie, access logs en metrics. | `proxy_frontend`, `proxy_api`, `proxy_mqtt`, `proxy_grafana`, `metrics_caddy` |
| `frontend` | `${FRONTEND_IMAGE}` | Nginx container met de webapp. | `proxy_frontend` |
| `backend` | `${BACKEND_IMAGE}` | FastAPI applicatie en MQTT/database-client. | `proxy_api`, `db`, `mqtt_internal`, `metrics_backend`, `blackbox_backend` |
| `mqtt` | `eclipse-mosquitto:2.1.2-alpine` | Eclipse Mosquitto broker voor intern MQTT en WebSockets. | `proxy_mqtt`, `mqtt_internal` |
| `postgres-tls-setup` | `alpine:3.20` | Genereert interne PostgreSQL TLS-certificaten in `postgres_tls`. | `network_mode: bridge` |
| `postgres` | `postgres:18-alpine` | PostgreSQL database met verplichte TLS voor TCP. | `db` |

`compose.monitoring.yml` voegt via profile `monitoring` de observabilityservices toe:

| Service | Image | Functie | Netwerken |
|---|---|---|---|
| `grafana` | `grafana/grafana:13.0.2-slim` | Dashboards en Explore via `/grafana/`. | `proxy_grafana`, `monitoring` |
| `prometheus` | `prom/prometheus:v3.11.3` | Metrics opslag, scraping en alert rules. | `metrics_caddy`, `metrics_backend`, `monitoring` |
| `alertmanager` | `prom/alertmanager:v0.32.1` | Ontvangt Prometheus-alerts en houdt notificatierouting klaar. | `metrics_caddy`, `metrics_backend`, `monitoring` |
| `loki` | `grafana/loki:3.7.2` | Logopslag met filesystem backend. | `monitoring` |
| `alloy` | `grafana/alloy:v1.16.1` | Verzamelt Docker-, host- en journallogs en stuurt ze naar Loki. | `monitoring` |
| `node-exporter` | `prom/node-exporter:v1.11.1` | Hostmetrics. | `monitoring` |
| `cadvisor` | `ghcr.io/google/cadvisor:0.57.0` | Containermetrics. | `monitoring` |
| `mosquitto-exporter` | `sapcc/mosquitto-exporter:0.6.0` | MQTT metrics via `mqtt:1883`. | `mqtt_internal`, `monitoring` |
| `postgres-exporter` | `prometheuscommunity/postgres-exporter:v0.19.1` | PostgreSQL metrics via de monitor-user. | `db`, `monitoring` |
| `blackbox-exporter` | `prom/blackbox-exporter:v0.28.0` | HTTP- en TCP-bereikbaarheidschecks. | `proxy_frontend`, `blackbox_backend`, `blackbox_external`, `mqtt_internal`, `monitoring` |

## Netwerkmodel

De compose-bestanden gebruiken gescheiden netwerken in plaats van een brede applicatie- of monitoringbus.

| Netwerk | Type | Doel |
|---|---|---|
| `proxy_frontend` | publiek pad binnen Docker | Alleen Caddy, frontend en blackbox voor frontend checks. |
| `proxy_api` | publiek pad binnen Docker | Alleen Caddy en backend. |
| `proxy_mqtt` | publiek pad binnen Docker | Alleen Caddy en Mosquitto WebSocket listener. |
| `proxy_grafana` | publiek pad binnen Docker | Alleen Caddy en Grafana. |
| `db` | `internal: true` | Backend, PostgreSQL en postgres-exporter. |
| `mqtt_internal` | `internal: true` | Backend, Mosquitto, mosquitto-exporter en blackbox TCP checks. |
| `metrics_caddy` | `internal: true` | Prometheus/Alertmanager naar Caddy metrics. |
| `metrics_backend` | `internal: true` | Prometheus/Alertmanager naar backend metrics of checks. |
| `blackbox_backend` | `internal: true` | Blackbox checks richting backend. |
| `monitoring` | `internal: true` | Prometheus, Grafana, Loki, Alloy en exporters onderling. |
| `blackbox_external` | niet-internal Docker-netwerk | Laat blackbox-exporter publieke HTTPS targets controleren. |

Caddy publiceert als enige service hostpoorten `80` en `443`. PostgreSQL, Prometheus, Loki, Alertmanager, exporters en MQTT worden niet direct naar de host gepubliceerd.

## Publieke routes

De publieke routes staan in `proxy/Caddyfile`:

| Route | Target |
|---|---|
| `https://<DOMAIN>/` | `frontend:80` |
| `https://<DOMAIN>/api*` | `backend:8000` |
| `wss://<DOMAIN>/mqtt` | `mqtt:9001` |
| `https://<DOMAIN>/grafana*` | `grafana:3000` |

Daarnaast expose't Caddy intern poort `2020` voor metrics:

```text
caddy:2020/metrics
```

Deze metrics-poort is alleen bedoeld voor Prometheus binnen Docker en hoort niet publiek gepubliceerd te worden.

## Omgeving en secrets

In productie gebruikt Compose:

```text
<DEPLOY_PATH>/shared/.env
```

Gebruik `../deploy/shared.env.example` als template. De belangrijkste groepen variabelen zijn:

| Groep | Variabelen |
|---|---|
| Publiek domein en TLS | `DOMAIN`, `LETSENCRYPT_EMAIL`, `DUCKDNS_DOMAIN`, `DUCKDNS_TOKEN` |
| Images | `BACKEND_IMAGE`, `FRONTEND_IMAGE`, gezet door de CD workflow via release-state |
| Frontend | `FRONTEND_API_URL` optioneel, gemapt naar `VITE_API_URL` |
| Database | `DT_PG_DB`, `DT_PG_ADMIN_*`, `DT_PG_DEVELOPER_*`, `DT_PG_MONITOR_*`, `DATABASE_URL` |
| Backend auth en cookies | `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SECRET_KEY`, `CORS_ALLOW_ORIGINS`, `SESSION_COOKIE_*` |
| Backend MQTT client | `MQTT_HOST`, `MQTT_PORT`, `MQTT_PATH`, `MQTT_USERNAME`, `MQTT_PASSWORD` |
| Monitoring | `GF_SERVER_ROOT_URL`, `GRAFANA_PASSWORD` |
| Deployment-state | `APP_ENV_FILE`, `COMPOSE_PROJECT_NAME`, `COMPOSE_PROFILES`, `MOSQUITTO_PASSWORD_DIR` |

MQTT plaintext bronusers staan niet in `.env`, maar in:

```text
<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env
```

Tijdens deployment maakt `deploy/remote-deploy.sh` daar automatisch de gehashte password file van:

```text
<DEPLOY_PATH>/shared/mosquitto/password/passwd
```

Die map wordt via `${MOSQUITTO_PASSWORD_DIR:-./mosquitto/password}` read-only gemount op `/mosquitto/config/password`.

## Handmatig starten

Normaal start de CD workflow de stack. Voor handmatige servercontroles vanaf een release-map:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH"
set -a
. "$DEPLOY_PATH/state/current-release.env"
set +a
cd "$RELEASE_DIR"
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "${COMPOSE_PROJECT_NAME:-digitaltwin}" up -d --remove-orphans
```

Als `COMPOSE_PROFILES` niet uit release-state komt, zet monitoring expliciet aan:

```bash
COMPOSE_PROFILES=monitoring docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
```

Status bekijken:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps
```

Logs van de basisstack bekijken:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-tls-setup postgres caddy backend frontend mqtt
```

Logs van monitoring bekijken:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 grafana prometheus alertmanager loki alloy node-exporter cadvisor mosquitto-exporter postgres-exporter blackbox-exporter
```

## Healthchecks en probes

Container-healthchecks in `compose.yml`:

| Service | Check |
|---|---|
| `frontend` | `http://127.0.0.1/health` |
| `backend` | `http://127.0.0.1:8000/api/v1/health` |
| `postgres` | `PGSSLMODE=require pg_isready` op `127.0.0.1` |

Deployment-healthchecks via Caddy:

```bash
curl -fsS https://<DOMAIN>/health
curl -fsS https://<DOMAIN>/api/v1/health
```

De deploypromotie verwacht HTTP-status `200` op beide URLs.

Prometheus blackbox checks in de huidige configuratie:

| Job | Target |
|---|---|
| `blackbox_http` | `https://digitaltwin.duckdns.org/` |
| `blackbox_http` | `http://frontend/health` |
| `blackbox_http` | `http://backend:8000/api/v1/health` |
| `blackbox_tcp` | `mqtt:1883` |

De externe HTTPS target staat hardcoded in `monitoring/prometheus/prometheus.yml`. Pas die waarde aan wanneer `DOMAIN` wijzigt.

## Monitoring-retentie

Belangrijke retentie-instellingen uit de compose/config-bestanden:

| Component | Instelling |
|---|---|
| Prometheus | `--storage.tsdb.retention.time=14d` |
| Prometheus | `--storage.tsdb.retention.size=300MB` |
| Loki | `retention_period: 14d` |
| Alloy | Bewaart runtime-state in `alloy_data`; logdata zelf gaat naar Loki. |

## Persistente data

Persistente Docker volumes:

| Volume | Inhoud |
|---|---|
| `postgres_data` | Databasecluster en data. |
| `postgres_tls` | Interne CA en PostgreSQL servercertificaten. |
| `mosquitto_data` | Broker persistence. |
| `caddy_data` | Caddy certificaten en runtime-data. |
| `caddy_config` | Caddy config-state. |
| `prometheus_data` | Metrics historie. |
| `grafana_data` | Grafana database, settings en plugin-state. |
| `alertmanager_data` | Alertmanager runtime-state, zoals eventuele silences. |
| `loki_data` | Logchunks, index en retention-data. |
| `alloy_data` | Alloy runtime-state voor logverzameling. |

Server-state buiten Docker volumes:

- `<DEPLOY_PATH>/shared/.env`
- `<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env`
- `<DEPLOY_PATH>/shared/mosquitto/password/passwd`
- `<DEPLOY_PATH>/state/current-release.env`
- `<DEPLOY_PATH>/state/previous-release.env`

Gebruik `docker compose down -v` alleen bewust; dat verwijdert ook database-, monitoring-, logging- en certificaatvolumes.

## Host mounts

Een paar monitoringservices lezen hostpaden:

| Service | Hostpad | Doel |
|---|---|---|
| `alloy` | `/var/run/docker.sock` | Docker containerdiscovery en containerlogs. |
| `alloy` | `/var/log` | Host logbestanden. |
| `alloy` | `/var/log/journal` | Systemd journal logs. |
| `node-exporter` | `/proc`, `/sys`, `/` | Hostmetrics. |
| `cadvisor` | `/`, `/var/run`, `/sys`, `/var/lib/docker/`, `/dev/disk/` | Containermetrics en Docker metadata. |

Deze mounts zijn read-only, behalve `alloy_data` binnen Docker. Ze betekenen wel dat monitoring toegang heeft tot gevoelige hostmetadata en logs.

## Eerste serverinrichting

Een nieuwe server heeft minimaal nodig:

- Docker Engine en Docker Compose v2.
- `curl`.
- SSH-toegang voor de deploy user.
- Schrijfrechten voor de deploy user op `<DEPLOY_PATH>`.
- Een ingevulde `<DEPLOY_PATH>/shared/.env`.
- Een MQTT users file als WebSocket-clients moeten kunnen inloggen.
- Toegang tot `/var/run/docker.sock`, `/var/log` en `/var/log/journal` wanneer monitoring/logging actief is.

Voorbeeld:

```bash
sudo mkdir -p <DEPLOY_PATH>/releases <DEPLOY_PATH>/shared <DEPLOY_PATH>/state
sudo mkdir -p <DEPLOY_PATH>/shared/mosquitto/password
sudo chown -R <DEPLOY_USER>:<DEPLOY_USER> <DEPLOY_PATH>
```

## Onderhoud

Actieve release tonen:

```bash
readlink -f <DEPLOY_PATH>/current
cat <DEPLOY_PATH>/state/current-release.env
```

Images bijwerken en stack opnieuw starten vanuit `current`:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH"
set -a
. "$DEPLOY_PATH/state/current-release.env"
set +a
cd "$RELEASE_DIR"
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" pull
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
```

Alleen observability herstarten:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" restart grafana prometheus alertmanager loki alloy node-exporter cadvisor mosquitto-exporter postgres-exporter blackbox-exporter
```

Gebruik de specifieke README's voor details:

- `monitoring/README.md`
- `mosquitto/README.md`
- `postgresql/README.md`
- `proxy/README.md`
- `scripts/README.md`
