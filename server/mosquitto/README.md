# Mosquitto (MQTT broker)

Deze map bevat de configuratie voor de Eclipse Mosquitto broker binnen dit project.

De huidige actieve MQTT-routes zijn:

1. Intern MQTT verkeer op poort `1883`, alleen binnen het Docker netwerk.
2. MQTT over WebSockets op poort `9001`, extern bereikbaar via Caddy op `wss://<DOMAIN>/mqtt`.


## 1. Inhoud van deze map

```text
mosquitto/
├─ README.md
├─ acl/
│  └─ clients.acl
├─ conf.d/
│  ├─ local-1883.conf
│  └─ ws-9001.conf
└─ mosquitto.conf
```

Belangrijke bestanden:

- `mosquitto.conf`: basisconfiguratie voor persistence, logging, `per_listener_settings` en include van `conf.d`.
- `conf.d/local-1883.conf`: interne listener op poort `1883`.
- `conf.d/ws-9001.conf`: WebSocket listener op poort `9001`.
- `acl/clients.acl`: topicrechten voor ingelogde WebSocket clients.
In productie wordt de password file niet uit deze map gehaald. De deployment mount:

```text
<DEPLOY_PATH>/shared/mosquitto/password/passwd
```

Die file wordt automatisch gebouwd uit:

```text
<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env
```

## 2. Basisconfiguratie

`mosquitto.conf` bevat:

- `persistence true`: broker state blijft behouden in Docker volume `mosquitto_data`.
- `persistence_location /mosquitto/data/`: opslagpad in de container.
- `per_listener_settings true`: instellingen zoals anonymous, password file en ACL gelden per listener.
- `sys_interval 10`: Mosquitto publiceert interne `$SYS` metrics elke 10 seconden.
- Logging naar:
  - stdout: zichtbaar via `docker compose logs mqtt`
- `include_dir /mosquitto/config/conf.d`: laadt alle listener-configs uit `conf.d`.

## 3. Actieve listeners

### Intern MQTT: `1883`

Bestand: `conf.d/local-1883.conf`

```text
listener 1883 0.0.0.0
listener_allow_anonymous true
```

Eigenschappen:

- Alleen bedoeld voor containers binnen het Docker netwerk.
- Niet gepubliceerd naar de host.
- Wordt gebruikt door `mosquitto-exporter` op `tcp://mqtt:1883`.
- Wordt ook door de Blackbox TCP check gecontroleerd als `mqtt:1883`.
- Anonymous is toegestaan. Deze listener heeft geen password file en geen ACL in de huidige config.

### WebSockets: `9001`

Bestand: `conf.d/ws-9001.conf`

```text
listener 9001 0.0.0.0
protocol websockets
listener_allow_anonymous false
password_file /mosquitto/config/password/passwd
acl_file /mosquitto/config/acl/clients.acl
```

Eigenschappen:

- Bedoeld voor de clients via Caddy.
- Extern endpoint: `wss://<DOMAIN>/mqtt`.
- Caddy routeert `/mqtt` naar `mqtt:9001`.
- Alleen ingelogde MQTT users kunnen verbinden met de users uit `/mosquitto/config/password/passwd`.
- ACL-regels komen uit `acl/clients.acl`.

## 4. ACL overzicht

Bestand: `acl/clients.acl`

Huidige regels:

| Gebruiker | Rechten |
|---|---|
| `backend_user` | `topic readwrite car/#` |
| `auto_A` t/m `auto_Z` | `topic readwrite car/<username>/#` |

Pas `acl/clients.acl` aan wanneer de topicstructuur wijzigt. Herstart daarna de broker vanuit de actieve release:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH/current"
set -a
. release.env
set +a
export APP_ENV_FILE="${APP_ENV_FILE:-../../shared/.env}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitaltwin}"
export MOSQUITTO_PASSWORD_DIR="${MOSQUITTO_PASSWORD_DIR:-$DEPLOY_PATH/shared/mosquitto/password}"
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" restart mqtt
```

## 5. MQTT users en wachtwoorden

De actieve productie password file is:

```text
<DEPLOY_PATH>/shared/mosquitto/password/passwd
```

Dit bestand bevat gehashte Mosquitto wachtwoorden en wordt read-only in de container gemount op:

```text
/mosquitto/config/password/passwd
```

Het plaintext bronbestand is:

```text
<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env
```

Behandel dit bestand als secret en commit het niet.

### User toevoegen of wijzigen

Plaats op de server een plaintext bronbestand met `username=password` regels:

```text
<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env
```

Voorbeeldformaat:

```dotenv
auto_A=change_me_auto_A_password
auto_B=change_me_auto_B_password
auto_C=change_me_auto_C_password
auto_D=change_me_auto_D_password
backend_user=change_me_backend_password
```

Tijdens deployment maakt `remote-deploy.sh` hier automatisch de Mosquitto password file van:

```text
<DEPLOY_PATH>/shared/mosquitto/password/passwd
```

Deze `passwd` wordt in de broker gemount op `/mosquitto/config/password/passwd`. Handmatige wijzigingen in `passwd` kunnen bij een volgende deployment overschreven worden door `mqtt-users.env`; pas daarom bij voorkeur het bronbestand aan en deploy opnieuw.

Handmatig kan ook met `mosquitto_passwd` via een tijdelijke Mosquitto container. Doe dit op de server en mount de shared password-map.

Nieuwe password file handmatig aanmaken of overschrijven:

```bash
docker run --rm -it -v "<DEPLOY_PATH>/shared/mosquitto/password:/password" eclipse-mosquitto:2.1.2-alpine \
  mosquitto_passwd -c /password/passwd <username>
```

User toevoegen of wachtwoord wijzigen in bestaande file:

```bash
docker run --rm -it -v "<DEPLOY_PATH>/shared/mosquitto/password:/password" eclipse-mosquitto:2.1.2-alpine \
  mosquitto_passwd /password/passwd <username>
```

Let op: gebruik `-c` alleen wanneer je de password file bewust opnieuw wilt maken. Zonder `-c` blijft de bestaande file behouden.

Herstart na wijzigingen:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH/current"
set -a
. release.env
set +a
export APP_ENV_FILE="${APP_ENV_FILE:-../../shared/.env}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitaltwin}"
export MOSQUITTO_PASSWORD_DIR="${MOSQUITTO_PASSWORD_DIR:-$DEPLOY_PATH/shared/mosquitto/password}"
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" restart mqtt
```


## 6. Docker integratie

Mosquitto draait als service `mqtt` in `server/compose.yml`:

```yaml
mqtt:
  image: eclipse-mosquitto:2.1.2-alpine
  expose:
    - "1883"
    - "9001"
  volumes:
    - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    - ./mosquitto/conf.d:/mosquitto/config/conf.d:ro
    - ./mosquitto/acl:/mosquitto/config/acl:ro
    - ${MOSQUITTO_PASSWORD_DIR:-./mosquitto/password}:/mosquitto/config/password:ro
    - mosquitto_data:/mosquitto/data
```

Belangrijk:

- Er zijn geen MQTT-poorten direct naar de host gepubliceerd.
- Externe verbindingen lopen via Caddy op HTTPS/WSS.
- `9001` staat onder `expose` voor duidelijkheid binnen het Compose-netwerk.
- Brokerlogs gaan naar stdout en zijn zichtbaar via `docker compose logs mqtt`.

## 7. Monitoring en logging

Metrics:

- `mosquitto-exporter` verbindt met `tcp://mqtt:1883`.
- Prometheus scrape target: `mosquitto-exporter:9234`.
- Grafana dashboard: `mosquitto-exporter dashboard`.

Beschikbaarheidscheck:

- Blackbox exporter controleert TCP connectiviteit naar `mqtt:1883`.

Logs:

- Mosquitto schrijft naar stdout.
- Alloy verzamelt de Docker logs en stuurt ze naar Loki.

Handige LogQL query in Grafana Explore:

```logql
{source="docker", compose_service="mqtt"} |~ "(?i)(denied|error|disconnect|connect|acl|listener)"
```

## 8. Beheercommando's

Productiecommando's voer je uit vanuit de actieve release nadat je `release.env` hebt geladen:

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

Start of herstart alleen Mosquitto:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d mqtt
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" restart mqtt
```

Status controleren:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps mqtt
```

Live logs bekijken:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs -f mqtt
```

Mosquitto exporter logs:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs -f mosquitto-exporter
```

## 9. Verbinding testen

### Intern MQTT op `1883`

Test publish/subscribe binnen de brokercontainer:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec mqtt sh -lc "mosquitto_sub -h 127.0.0.1 -p 1883 -t test/local -C 1 & sleep 1; mosquitto_pub -h 127.0.0.1 -p 1883 -t test/local -m 'ok'"
```

### WebSocket endpoint via domein

Controleer dat Caddy draait en dat de frontend verbindt met:

```text
wss://<DOMAIN>/mqtt
```

### Authenticated WebSocket client

Gebruik een client die MQTT over WebSockets ondersteunt en verbind met:

```text
host: <DOMAIN>
port: 443
path: /mqtt
TLS: true
username: auto_A
password: <wachtwoord uit shared/mosquitto/mqtt-users.env>
topic: car/auto_A/#
```

## 10. Veelvoorkomende problemen

### Geen verbinding op `wss://<DOMAIN>/mqtt`

Controleer:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps caddy mqtt
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 caddy
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 mqtt
```

Let op:

- Caddy moet `/mqtt` reverse proxyen naar `mqtt:9001`.
- De client moet via poort `443` en pad `/mqtt` verbinden.

### Client krijgt `Not authorized`

Controleer:

- Staat de user in `<DEPLOY_PATH>/shared/mosquitto/mqtt-users.env` en is daarna gedeployed?
- Is `<DEPLOY_PATH>/shared/mosquitto/password/passwd` aangemaakt?
- Staat het topic in `mosquitto/acl/clients.acl`?
- Verbindt de client met exact dezelfde username als in de ACL?

Herstart na wijzigingen:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" restart mqtt
```

### Metrics ontbreken

Controleer:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps mqtt mosquitto-exporter prometheus
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 mosquitto-exporter
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://mosquitto-exporter:9234/metrics | head
```

### Logs ontbreken

Controleer:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 mqtt
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps alloy loki
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 alloy
```

## 11. Security notities

- Intern MQTT op `1883` staat anonymous toe en heeft geen ACL in de huidige config.
- WebSockets op `9001` staat anonymous niet toe. De frontend gebruikt een eigen beperkte MQTT user.
- Beperk topicrechten in `acl/clients.acl` zo strikt mogelijk per client.
- Behandel `shared/mosquitto/mqtt-users.env` en `shared/mosquitto/password/passwd` als secrets.
- Schrijf geen echte productie-wachtwoorden naar documentatie of logs.
- Publiceer Mosquitto-poorten niet direct naar internet zonder expliciete auth, TLS en ACL.
