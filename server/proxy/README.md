# Proxy

Deze map bevat de Caddy reverse-proxy configuratie voor de serverstack.

## Inhoud

```text
proxy/
├─ README.md
└─ Caddyfile
```

## Rol in de stack

De service `caddy` staat in `server/compose.yml` en publiceert als enige HTTP(S)-entrypoint poorten `80` en `443` op de host. Caddy regelt:

- automatische HTTPS-certificaten via Let's Encrypt
- gzip/zstd compressie
- JSON access logs naar stdout
- reverse proxy routes naar frontend, backend, MQTT WebSockets en Grafana
- metrics via de Caddy admin endpoint op poort `2019`

## Vereiste variabelen

Caddy gebruikt deze variabelen uit `<DEPLOY_PATH>/shared/.env`:

| Variabele | Doel |
|---|---|
| `DOMAIN` | Publieke hostnaam waarvoor Caddy routes en certificaten beheert. |
| `LETSENCRYPT_EMAIL` | E-mailadres voor Let's Encrypt account en certificaatmeldingen. |

## Routes

De routes staan in `Caddyfile`:

| Route | Target service | Doel |
|---|---|---|
| `wss://<DOMAIN>/mqtt` | `mqtt:9001` | MQTT over WebSockets voor browserclients. |
| `https://<DOMAIN>/grafana*` | `grafana:3000` | Grafana UI via subpad `/grafana/`. |
| `https://<DOMAIN>/api*` | `backend:8000` | Backend API. |
| `https://<DOMAIN>/` | `frontend:80` | Frontend webapp en frontend health endpoint. |

De volgorde is belangrijk. Specifieke routes zoals `/mqtt`, `/grafana*` en `/api*` staan boven de algemene frontend fallback.

## Metrics

De globale Caddy-config bevat:

```caddyfile
metrics {per_host}
admin 0.0.0.0:2019
```

In `compose.yml` wordt poort `2019` alleen via `expose` beschikbaar gemaakt binnen Docker-netwerken. Prometheus scraped Caddy via:

```text
caddy:2019
```

Publiceer poort `2019` niet direct naar internet.

## Logs

Caddy schrijft JSON logs naar stdout:

```caddyfile
log {
  output stdout
  format json
}
```

Alloy verzamelt deze Docker logs en stuurt ze naar Loki. Handige query in Grafana Explore:

```logql
{source="docker", compose_service="caddy"}
```

## Beheercommando's

Productiecommando's voer je uit vanuit de actieve release:

```bash
cd <DEPLOY_PATH>/current
set -a
source ../../state/current-release.env
set +a
```

Config valideren:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec caddy caddy validate --config /etc/caddy/Caddyfile
```

Caddy herladen:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Caddy herstarten:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" restart caddy
```

Logs bekijken:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 caddy
```

## Troubleshooting

### Certificaat wordt niet aangemaakt

Controleer:

- `DOMAIN` wijst naar de VM.
- Poorten `80` en `443` zijn bereikbaar.
- `LETSENCRYPT_EMAIL` is gezet.
- DuckDNS werkt en wijst naar het juiste publieke IP.
- Caddy logs tonen geen ACME rate limit of DNS-fout.

### API route werkt niet

Controleer:

```bash
curl -fsS https://<DOMAIN>/api/v1/health
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps caddy backend
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 caddy backend
```

### MQTT WebSocket werkt niet

Controleer:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps caddy mqtt
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 caddy mqtt
```

De browserclient moet verbinden met:

```text
wss://<DOMAIN>/mqtt
```

### Grafana subpad werkt niet

Controleer dat `GF_SERVER_ROOT_URL` in `<DEPLOY_PATH>/shared/.env` eindigt op `/grafana/`:

```dotenv
GF_SERVER_ROOT_URL=https://<DOMAIN>/grafana/
```

## Security

- Alleen poorten `80` en `443` horen publiek open te staan.
- Caddy admin/metrics poort `2019` is bedoeld voor intern Docker-verkeer.
- Logs kunnen requestpaden en metadata bevatten; schrijf geen tokens of secrets in URL's.
