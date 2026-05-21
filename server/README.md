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
| `compose.yml` | Applicatiestack: Caddy, frontend, backend, MQTT, PostgreSQL en DuckDNS. |
| `compose.monitoring.yml` | Observabilitystack: Grafana, Prometheus, Loki, Alloy en exporters. |
| `proxy/Caddyfile` | HTTPS, reverse proxy routes en Caddy metrics. |
| `mosquitto/` | MQTT listeners, ACL en brokerconfiguratie. |
| `postgresql/` | PostgreSQL config, TLS setup en init-script voor rollen. |
| `monitoring/` | Prometheus, Loki, Alloy en Grafana provisioning. |
| `scripts/` | Beheerscripts voor serverchecks en gebruikersbeheer. |

## Productie-context voor commando's

In productie draait Compose vanuit de actieve release:

```bash
cd <DEPLOY_PATH>/current
set -a
source ../../state/current-release.env
set +a
```

Gebruik daarna steeds:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" <command>
```

`current-release.env` bevat onder andere `BACKEND_IMAGE`, `FRONTEND_IMAGE`, `APP_ENV_FILE`, `COMPOSE_PROFILES`, `COMPOSE_PROJECT_NAME`, `MOSQUITTO_PASSWORD_DIR` en de healthcheck URLs. Alleen `--env-file ../../shared/.env` gebruiken is in productie niet genoeg, omdat de image references door de deployment in `release.env` worden gezet.

## Services

`compose.yml` start de basisstack:

| Service | Functie | Netwerken |
|---|---|---|
| `duckdns` | Houdt het DuckDNS-record actueel. | `bridge` |
| `caddy` | Publieke HTTPS reverse proxy. | `proxy`, `monitoring` |
| `frontend` | Nginx container met de webapp. | `proxy` |
| `backend` | FastAPI applicatie. | `proxy`, `backend`, `monitoring` |
| `mqtt` | Eclipse Mosquitto broker. | `proxy`, `backend` |
| `postgres-tls-setup` | Genereert PostgreSQL TLS-certificaten. | `bridge` |
| `postgres` | PostgreSQL 18 database. | `backend` |

`compose.monitoring.yml` voegt via profile `monitoring` de observabilityservices toe:

| Service | Functie |
|---|---|
| `grafana` | Dashboards en Explore via `/grafana/`. |
| `prometheus` | Metrics opslag en scraping. |
| `loki` | Logopslag. |
| `alloy` | Verzamelt container-, host- en journallogs. |
| `node-exporter` | Hostmetrics. |
| `cadvisor` | Containermetrics. |
| `mosquitto-exporter` | MQTT metrics. |
| `postgres-exporter` | PostgreSQL metrics met de monitor-user. |
| `blackbox-exporter` | HTTP/TCP bereikbaarheidschecks. |

## Publieke routes

Caddy publiceert alleen poorten `80` en `443` op de host. De routes staan in `proxy/Caddyfile`:

| Route | Target |
|---|---|
| `https://<DOMAIN>/` | `frontend:80` |
| `https://<DOMAIN>/api*` | `backend:8000` |
| `wss://<DOMAIN>/mqtt` | `mqtt:9001` |
| `https://<DOMAIN>/grafana*` | `grafana:3000` |

PostgreSQL en MQTT-poorten worden niet direct naar de host gepubliceerd. Services binnen Docker verbinden met PostgreSQL via `postgres:5432`.

## Omgeving en secrets

In productie gebruikt Compose:

```text
<DEPLOY_PATH>/shared/.env
```

Gebruik `../deploy/shared.env.example` als template. De belangrijkste groepen variabelen zijn:

- Publiek domein en TLS: `DOMAIN`, `LETSENCRYPT_EMAIL`, `DUCKDNS_DOMAIN`, `DUCKDNS_TOKEN`.
- Images: `BACKEND_IMAGE`, `FRONTEND_IMAGE`, aangeleverd door de CD workflow via `release.env` en `current-release.env`.
- Database: `DT_PG_DB`, `DT_PG_ADMIN_*`, `DT_PG_DEVELOPER_*`, `DT_PG_MONITOR_*`, `DATABASE_URL`.
- Backend auth en cookies: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SECRET_KEY`, `CORS_ALLOW_ORIGINS`, `SESSION_COOKIE_*`.
- Monitoring: `GF_SERVER_ROOT_URL`, `GRAFANA_PASSWORD`.

MQTT plaintext bronusers staan niet in `.env`, maar in:

```text
<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env
```

Tijdens deployment maakt `deploy/remote-deploy.sh` daar automatisch de gehashte password file van:

```text
<DEPLOY_PATH>/shared/mosquitto/password/passwd
```

## Handmatig starten

Normaal start de CD workflow de stack. Voor handmatige servercontroles vanaf een release-map:

```bash
cd <DEPLOY_PATH>/current
set -a
source ../../state/current-release.env
set +a
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
```

Status bekijken:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps
```

Logs bekijken:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-tls-setup postgres caddy backend frontend mqtt
```

## Healthchecks

Container-healthchecks:

- `frontend`: `http://127.0.0.1/health`
- `backend`: `http://127.0.0.1:8000/api/v1/health`
- `postgres`: `PGSSLMODE=require pg_isready` op `127.0.0.1`

Deployment-healthchecks via Caddy:

```bash
curl -fsS https://<DOMAIN>/health
curl -fsS https://<DOMAIN>/api/v1/health
```

De deploypromotie verwacht HTTP-status `200` op beide URLs.

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
| `loki_data` | Logchunks en index. |
| `alloy_data` | Alloy runtime-state voor logverzameling. |

Server-state buiten Docker volumes:

- `<DEPLOY_PATH>/shared/.env`
- `<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env`
- `<DEPLOY_PATH>/shared/mosquitto/password/passwd`
- `<DEPLOY_PATH>/state/current-release.env`
- `<DEPLOY_PATH>/state/previous-release.env`

Gebruik `docker compose down -v` alleen bewust; dat verwijdert ook database-, monitoring- en certificaatvolumes.

## Eerste serverinrichting

Een nieuwe server heeft minimaal nodig:

- Docker Engine en Docker Compose v2.
- `curl`.
- SSH-toegang voor de deploy user.
- Schrijfrechten voor de deploy user op `<DEPLOY_PATH>`.
- Een ingevulde `<DEPLOY_PATH>/shared/.env`.
- Een MQTT users file als WebSocket-clients moeten kunnen inloggen.

Voorbeeld:

```bash
sudo mkdir -p <DEPLOY_PATH>/releases <DEPLOY_PATH>/shared <DEPLOY_PATH>/state
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
set -a
source ../../state/current-release.env
set +a
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" pull
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d --remove-orphans
```

Gebruik de specifieke README's voor details:

- `monitoring/README.md`
- `mosquitto/README.md`
- `postgresql/README.md`
- `proxy/README.md`
- `scripts/README.md`
