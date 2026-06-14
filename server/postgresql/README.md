# PostgreSQL handleiding

Deze map bevat de PostgreSQL-configuratie voor de Digital Twin stack. De database draait in Docker, gebruikt TLS voor TCP-verbindingen en is vanaf buiten de host niet direct bereikbaar.

De huidige setup regelt:

- interne CA en servercertificaten via `postgres-tls-setup`
- verplichte TLS voor TCP-verbindingen
- SCRAM-wachtwoordauthenticatie
- standaard groepsrollen voor read-only, sensordata, backend en development
- database logging voor connecties, disconnects, lock waits en queries boven `1000ms`
- metrics via `postgres-exporter`
- logs via Docker stdout/stderr naar Alloy/Loki

## 1. Structuur van deze map

```text
postgresql/
├─ README.md
├─ generate-certs.sh
├─ init/
│  └─ 01-create-groups.sh
├─ pg_hba.conf
└─ postgresql.conf
```

Bestanden:

- `generate-certs.sh`: genereert de interne CA en servercertificaten in volume `postgres_tls`.
- `postgresql.conf`: PostgreSQL instellingen voor listen address, TLS, SCRAM en logging.
- `pg_hba.conf`: authenticatie- en toegangsbeleid.
- `init/01-create-groups.sh`: maakt standaard groepsrollen en privileges aan bij eerste database-initialisatie.

## 2. Docker architectuur

De PostgreSQL-opzet bestaat uit twee services in `server/compose.yml`:

| Service | Doel |
|---|---|
| `postgres-tls-setup` | genereert TLS-certificaten in volume `postgres_tls` |
| `postgres` | draait PostgreSQL 18 met custom config en TLS |

`postgres` wacht tot `postgres-tls-setup` succesvol klaar is:

```yaml
depends_on:
  postgres-tls-setup:
    condition: service_completed_successfully
```

Belangrijkste eigenschappen:

- Image: `postgres:18-alpine`
- Geen hostpoort-publicatie
- Container luistert op `*:5432`
- Bereikbaar binnen Docker via `postgres:5432`
- Extern en vanaf de host niet direct gepubliceerd
- TLS-certificaten worden read-only gemount op `/etc/ssl/postgresql`
- Data staat in Docker volume `postgres_data`
- Certificaten staan in Docker volume `postgres_tls`
- Healthcheck gebruikt `PGSSLMODE=require pg_isready` op `127.0.0.1`

## 3. Benodigde omgevingsvariabelen

In productie staan deze waarden in `<DEPLOY_PATH>/shared/.env`. Lokaal kun je vanuit `server/` een eigen `.env` gebruiken.

```dotenv
DT_PG_DB=dt_project
DT_PG_ADMIN_USER=admin
DT_PG_ADMIN_PASS=ChangeMe_Admin_StrongPassword
DT_PG_DEVELOPER_USER=app_developer
DT_PG_DEVELOPER_PASS=ChangeMe_Developer_StrongPassword
DT_PG_MONITOR_USER=postgres_exporter
DT_PG_MONITOR_PASS=ChangeMe_Monitor_StrongPassword

DATABASE_URL=postgresql+psycopg://app_developer:ChangeMe_Developer_StrongPassword@postgres:5432/dt_project?sslmode=require
```

In `compose.yml` gebruikt de `postgres` service de `DT_PG_*` waarden als containeromgeving:

- `POSTGRES_DB=${DT_PG_DB}`
- `POSTGRES_USER=${DT_PG_ADMIN_USER}`
- `POSTGRES_PASSWORD=${DT_PG_ADMIN_PASS}`

De backend krijgt daarnaast `DATABASE_URL` en verbindt intern via hostnaam `postgres`. Gebruik hiervoor de developer-user, niet de admin-user, omdat de backend bij deze applicatie zelf tabellen moet kunnen aanmaken.

`POSTGRES_USER`, `POSTGRES_PASSWORD` en `POSTGRES_DB` hoeven niet apart in `shared/.env` te staan; Compose vult die voor de backend en PostgreSQL afgeleid uit de `DT_PG_*` waarden.

## 4. TLS-certificaten

`postgres-tls-setup` draait `generate-certs.sh` in een tijdelijke Alpine container.

Het script genereert, alleen wanneer ze nog niet bestaan:

- `ca.crt`
- `ca.key`
- `server.crt`
- `server.key`
- `server.cnf`

De servercertificaten bevatten SANs voor:

- DNS: `postgres`
- DNS: `localhost`
- IP: `127.0.0.1`

Rechten worden door het script gezet volgens PostgreSQL-eisen:

- `server.key` en `ca.key`: `600`
- `server.crt`, `ca.crt`, `server.cnf`: `644`
- eigenaar: UID/GID `70`, de postgres user in de Alpine-container

Let op: `ca.key` is gevoelig. Behandel het volume `postgres_tls` als secret-bearing data.

## 5. PostgreSQL configuratie

Belangrijke instellingen uit `postgresql.conf`:

```conf
listen_addresses = '*'
port = 5432
password_encryption = 'scram-sha-256'

ssl = on
ssl_min_protocol_version = 'TLSv1.2'
ssl_cert_file = '/etc/ssl/postgresql/server.crt'
ssl_key_file = '/etc/ssl/postgresql/server.key'
ssl_ca_file = '/etc/ssl/postgresql/ca.crt'

log_connections = on
log_disconnections = on
log_lock_waits = on
log_min_duration_statement = '1000ms'
log_line_prefix = '%m [%p] %u@%d %r %a '

hba_file = '/etc/postgresql/pg_hba.conf'
```

`listen_addresses='*'` is veilig binnen deze setup omdat de `postgres` service geen poort naar de host publiceert. Binnen Docker kunnen services zoals `backend` en `postgres-exporter` de database via `postgres:5432` bereiken.

## 6. Authenticatiebeleid

`pg_hba.conf` dwingt SCRAM en TLS af:

```conf
local   all     all             scram-sha-256
hostssl all     all 0.0.0.0/0   scram-sha-256
hostssl all     all ::/0        scram-sha-256
hostnossl all   all 0.0.0.0/0   reject
hostnossl all   all ::/0        reject
```

Gevolg:

- Lokale Unix socket verbindingen vereisen een wachtwoord.
- TCP-verbindingen zijn alleen toegestaan met TLS.
- Niet-TLS TCP wordt expliciet geweigerd.
- Wachtwoorden worden opgeslagen als SCRAM hashes.

## 7. Starten en status controleren

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

Start PostgreSQL plus TLS setup:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d postgres
```

Controleer status:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps postgres-tls-setup postgres
```

Bekijk logs:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-tls-setup
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres
```

Open een psql shell in de container:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec postgres psql \
  -U "$DT_PG_ADMIN_USER" \
  -d "$DT_PG_DB"
```

## 8. Verbinden

### Vanaf de host

PostgreSQL heeft geen hostpoort-publicatie. Gebruik voor beheer een shell in de container:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec postgres psql \
  -U "$DT_PG_ADMIN_USER" \
  -d "$DT_PG_DB"
```

### Vanaf andere containers

Gebruik de Docker servicenaam:

```text
postgres:5432
```

Voorbeeld backend URL:

```text
postgresql+psycopg://app_developer:<password>@postgres:5432/dt_project?sslmode=require
```

Voor PostgreSQL clients die TLS expliciet configureren:

```text
sslmode=require
```

### Vanaf buiten de server

Directe externe toegang is niet bedoeld. Gebruik de applicatie-API, of log in op de server en gebruik `docker compose exec postgres psql` vanuit de release-context.

## 9. Standaard rollen

Bij eerste database-initialisatie draait `init/01-create-groups.sh`. Dit gebeurt alleen wanneer `postgres_data` nog leeg is.

Het script maakt idempotent deze groepsrollen aan:

| Rol | Doel | Rechten |
|---|---|---|
| `readonly_role` | Alleen lezen | `CONNECT`, `USAGE` op schema, `SELECT` op tabellen |
| `sensor_role` | MQTT/IoT data insertion | `SELECT`, `INSERT` op tabellen, sequence usage |
| `backend_role` | Applicatie-backend | `SELECT`, `INSERT`, `UPDATE`, `DELETE`, sequence usage |
| `developer_role` | Ontwikkeling/schema beheer | `CREATE` op schema, alle privileges op tabellen en sequences |
| `monitoring_role` | PostgreSQL exporter | `pg_monitor` en read-only toegang |

Voor toekomstige tabellen/sequences zet het script ook default privileges in schema `public`.

## 10. Nieuwe databasegebruiker aanmaken

Maak alleen extra login-gebruikers wanneer je naast de standaard developer/backend-user een aparte rol nodig hebt.

```sql
CREATE ROLE extra_crud_user WITH LOGIN PASSWORD 'vervang_dit_door_een_sterk_wachtwoord';
GRANT backend_role TO extra_crud_user;
```

Voor read-only toegang:

```sql
CREATE ROLE dashboard_reader WITH LOGIN PASSWORD 'vervang_dit_door_een_sterk_wachtwoord';
GRANT readonly_role TO dashboard_reader;
```

Controleer rollen:

```sql
\du
```

Het init-script maakt standaard login-users aan op basis van:

- `DT_PG_DEVELOPER_USER` / `DT_PG_DEVELOPER_PASS`
- `DT_PG_MONITOR_USER` / `DT_PG_MONITOR_PASS`

Let op: scripts in `docker-entrypoint-initdb.d` draaien alleen automatisch bij een lege `postgres_data` volume. Bij een bestaande database moet je het script opnieuw uitvoeren vanuit de container nadat `shared/.env` is bijgewerkt.

Voor een bestaande deployment:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH/current"
set -a
. release.env
set +a
export APP_ENV_FILE="${APP_ENV_FILE:-../../shared/.env}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-digitaltwin}"
export MOSQUITTO_PASSWORD_DIR="${MOSQUITTO_PASSWORD_DIR:-$DEPLOY_PATH/shared/mosquitto/password}"
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec postgres bash /docker-entrypoint-initdb.d/01-create-groups.sh
```

## 11. Monitoring en logging

### Metrics

`postgres-exporter` verzamelt database metrics voor Prometheus.

Compose-configuratie:

```yaml
postgres-exporter:
  image: prometheuscommunity/postgres-exporter:v0.19.1
  environment:
    DATA_SOURCE_NAME: "postgresql://${DT_PG_MONITOR_USER}:${DT_PG_MONITOR_PASS}@postgres:5432/${DT_PG_DB}?sslmode=require"
```

Prometheus scrape target:

```text
postgres-exporter:9187
```

Grafana dashboard:

```text
PostgreSQL dashboard
```

Snelle check:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps postgres postgres-exporter
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-exporter
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://postgres-exporter:9187/metrics | head
```

### Logs

PostgreSQL schrijft naar Docker stdout/stderr. Alloy verzamelt deze logs en stuurt ze naar Loki.

Relevante logtypes uit `postgresql.conf`:

- connecties
- disconnects
- lock waits
- queries boven `1000ms`
- authenticatiefouten
- deadlocks en fouten

Handige LogQL query in Grafana Explore:

```logql
{source="docker", compose_service="postgres"} |~ "(?i)(error|fatal|deadlock|duration|authentication)"
```

## 12. Data persistentie

Docker volumes:

- `postgres_data`: databasecluster en data
- `postgres_tls`: CA en servercertificaten

Let op bij verwijderen:

```bash
docker compose down -v
```

Dit verwijdert ook database-data en TLS-certificaten. Bij de volgende start worden init-scripts opnieuw uitgevoerd en nieuwe certificaten gegenereerd.

## 13. Beheercommando's

```bash
# PostgreSQL shell in de container
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec postgres psql -U "$DT_PG_ADMIN_USER" -d "$DT_PG_DB"

# Logs bekijken
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs -f postgres

# TLS setup logs bekijken
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs postgres-tls-setup

# Herstarten na configuratiewijziging
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" restart postgres

# Rollen bekijken
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec postgres psql -U "$DT_PG_ADMIN_USER" -d "$DT_PG_DB" -c "\du"

# Databases bekijken
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec postgres psql -U "$DT_PG_ADMIN_USER" -d "$DT_PG_DB" -c "\l"
```

## 14. Veelvoorkomende problemen

### PostgreSQL start niet

Controleer TLS setup en database logs:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs postgres-tls-setup
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs postgres
```

Mogelijke oorzaken:

- certificaten ontbreken in `postgres_tls`
- rechten op `server.key` zijn niet strikt genoeg
- `.env` mist `DT_PG_DB`, `DT_PG_ADMIN_USER`, `DT_PG_ADMIN_PASS` of de aparte applicatie/developer/monitoring databasevariabelen

### Authenticatie mislukt

Controleer:

- gebruikersnaam en wachtwoord
- of de rol `LOGIN` heeft
- of de gebruiker aan de juiste groepsrol is gekoppeld
- of de client niet per ongeluk met de verkeerde database verbindt

### Verbinding geweigerd of SSL-fout

Controleer:

- service draait: `docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps postgres`
- vanaf host verbinden met `127.0.0.1`
- vanaf container verbinden met `postgres`
- client gebruikt `sslmode=require`
- niet-TLS TCP wordt bewust geweigerd door `hostnossl ... reject`

### Rechten ontbreken op tabellen

Controleer:

- juiste groepsrol is toegekend: `readonly_role`, `sensor_role`, `backend_role` of `developer_role`
- tabellen staan in schema `public`
- tabellen zijn aangemaakt door een rol waarvoor default privileges goed staan

Voor bestaande tabellen kun je grants opnieuw toepassen als admin:

```sql
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO sensor_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO developer_role;
```

### PostgreSQL metrics ontbreken

Controleer:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps postgres postgres-exporter prometheus
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-exporter
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://postgres-exporter:9187/metrics | head
```

Controleer ook of `DATA_SOURCE_NAME` de juiste `DT_PG_*` waarden gebruikt en `sslmode=require` bevat.

## 15. Security notities

- Publiceer PostgreSQL niet direct naar internet.
- Gebruik sterke, unieke waarden voor `DT_PG_ADMIN_PASS` en databasegebruikers.
- Behandel `postgres_tls`, vooral `ca.key`, als gevoelig.
- Gebruik groepsrollen voor rechten in plaats van iedereen superuser te maken.
- Gebruik `sslmode=require` voor TCP-clients.
- Let op dat database logs querytekst kunnen bevatten bij slow queries; schrijf geen secrets in SQL statements.
