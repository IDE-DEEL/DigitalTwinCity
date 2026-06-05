# Monitoring en logging

Deze map bevat de observability-stack voor de Digital Twin omgeving. De stack verzamelt metrics met Prometheus, logs met Loki/Alloy en toont alles in Grafana.

De stack bestaat uit:

- **Grafana**: dashboards, Explore, Prometheus datasource en Loki datasource
- **Prometheus**: opslag en scraping van metrics
- **Alertmanager**: ontvangt Prometheus-alerts en houdt notificatierouting klaar voor later
- **Loki**: opslag en querying van logs
- **Alloy**: verzamelt Docker-, host- en journallogs en stuurt ze naar Loki
- **Node Exporter**: host/VM metrics zoals CPU, RAM, disk en netwerk
- **cAdvisor**: container metrics per Docker container
- **Mosquitto Exporter**: MQTT broker metrics
- **PostgreSQL Exporter**: database metrics zoals connecties en querygedrag
- **Blackbox Exporter**: HTTP- en TCP-bereikbaarheidschecks
- **Caddy metrics**: reverse-proxy metrics via Caddy's metrics-only endpoint op poort `2020`
- **Prometheus alert rules**: basisalerts voor uitval van backend, frontend, database en MQTT

## 1. Structuur van deze map

```text
monitoring/
├─ README.md
├─ alertmanager/
│  └─ alertmanager.yml
├─ alloy/
│  └─ config.alloy
├─ grafana/
│  ├─ dashboards/
│  │  ├─ Caddy dashboard.json
│  │  ├─ INNO - Logs Overview.json
│  │  ├─ INNO - Single Dashboard.json
│  │  ├─ Node Exporter dashboard.json
│  │  ├─ PostgreSQL dashboard.json
│  │  ├─ cAdvisor dashboard.json
│  │  └─ mosquitto-exporter dashboard.json
│  └─ provisioning/
│     ├─ dashboards/dashboards.yml
│     └─ datasources/datasource.yml
├─ loki/
│  └─ loki-config.yaml
└─ prometheus/
   ├─ rules/
   │  └─ availability-alerts.yml
   └─ prometheus.yml
```

## 2. Hoe de monitoring werkt

1. Prometheus leest `monitoring/prometheus/prometheus.yml` en scrape't periodiek de opgegeven targets.
2. Exporters leveren metrics aan Prometheus: host, containers, MQTT, PostgreSQL, Caddy, backend en blackbox probes.
3. Alloy leest Docker stdout/stderr, host logbestanden en systemd journal logs.
4. Alloy pusht logs naar Loki via `http://loki:3100/loki/api/v1/push`.
5. Grafana gebruikt automatisch de geprovisioneerde datasources `Prometheus` en `Loki`.
6. Grafana laadt automatisch dashboards uit `monitoring/grafana/dashboards/`.
7. Prometheus laadt alert rules uit `monitoring/prometheus/rules/`.
8. Prometheus stuurt firing alerts naar Alertmanager via `http://alertmanager:9093`.
9. Alertmanager groepeert alerts, maar gebruikt nu alleen een placeholder receiver zonder notificatiekanaal.
10. Verkeer naar Grafana loopt extern via Caddy op het subpad `/grafana`.

## 3. Voorwaarden

- Docker en Docker Compose moeten geinstalleerd zijn.
- In productie moet `<DEPLOY_PATH>/shared/.env` aanwezig zijn. Lokaal kun je vanuit `server/` een eigen `.env` gebruiken.
- Minimaal nodig voor deze stack:
  - `DOMAIN`
  - `LETSENCRYPT_EMAIL`
  - `GRAFANA_PASSWORD`
  - `DT_PG_DB`
  - `DT_PG_MONITOR_USER`
  - `DT_PG_MONITOR_PASS`

Voor Grafana achter `/grafana` is `GF_SERVER_ROOT_URL` in `compose.monitoring.yml` gekoppeld aan de omgeving. Zet deze variabele op:

```dotenv
GF_SERVER_ROOT_URL=https://<DOMAIN>/grafana/
```

## 4. Compose-context

In productie voer je beheercommando's uit vanuit de actieve release en source je eerst de release-state:

```bash
cd <DEPLOY_PATH>/current
set -a
source ../../state/current-release.env
set +a
```

Gebruik daarna steeds beide composebestanden en de app env file:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" <command>
```

Voor lokaal beheer vanuit `server/` kan ook:

```bash
export COMPOSE_FILE=compose.yml:compose.monitoring.yml
export COMPOSE_PROFILES=monitoring
docker compose up -d
```

## 5. Stack starten

Alleen observability plus de belangrijkste afhankelijkheden starten:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d grafana loki alloy prometheus node-exporter cadvisor mosquitto-exporter postgres-exporter blackbox-exporter caddy mqtt postgres backend
```

Met Alertmanager erbij:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d grafana loki alloy prometheus alertmanager node-exporter cadvisor mosquitto-exporter postgres-exporter blackbox-exporter caddy mqtt postgres backend
```

## 6. Toegang

- Extern via Caddy en HTTPS: `https://<DOMAIN>/grafana/`
- Intern/direct alleen wanneer poort `3000` lokaal wordt gepubliceerd of gerouteerd: `http://localhost:3000`

Inloggen in Grafana:

- Gebruiker: `admin`
- Wachtwoord: waarde van `GRAFANA_PASSWORD` uit `.env`

## 7. Datasources en dashboards

Grafana provisioning staat in `monitoring/grafana/provisioning/`.

Geprovisioneerde datasources:

- `Prometheus`: `http://prometheus:9090`
- `Loki`: `http://loki:3100`

Dashboards worden geladen uit `monitoring/grafana/dashboards/` in de map `Overzicht`. De provisioning refresh interval staat op 10 seconden.

Belangrijke dashboards:

- `INNO - Single Dashboard`: algemeen overzicht met `Aantal actieve alerts`, `Alertdetails` en Alertmanager-statuspanelen
- `INNO - Logs Overview`: centrale logs
- `Node Exporter dashboard`: host/VM metrics
- `cAdvisor dashboard`: container metrics
- `PostgreSQL dashboard`: PostgreSQL metrics
- `Caddy dashboard`: reverse-proxy metrics
- `mosquitto-exporter dashboard`: MQTT metrics

## 8. Metrics

Volgens `monitoring/prometheus/prometheus.yml` worden de volgende jobs gescraped:

| Job | Target | Doel |
|---|---|---|
| `prometheus` | `localhost:9090` | Prometheus eigen metrics |
| `alertmanager` | `alertmanager:9093` | Alertmanager metrics en status |
| `node-exporter` | `node-exporter:9100` | Host/VM metrics |
| `cadvisor` | `cadvisor:8080` | Docker container metrics |
| `mosquitto-exporter` | `mosquitto-exporter:9234` | MQTT broker metrics |
| `caddy` | `caddy:2020` | Caddy request-, latency- en servermetrics |
| `postgres-exporter` | `postgres-exporter:9187` | PostgreSQL metrics |
| `blackbox_http` | via `blackbox-exporter:9115` | HTTP 2xx checks |
| `blackbox_tcp` | via `blackbox-exporter:9115` | TCP connect checks |

Blackbox checks in de huidige configuratie:

- HTTP: `https://digitaltwin.duckdns.org/`
- HTTP: `http://frontend/health`
- HTTP: `http://backend:8000/api/v1/health`
- TCP: `mqtt:1883`

De externe HTTP target staat hardcoded in `monitoring/prometheus/prometheus.yml`. Pas die target aan wanneer `DOMAIN` wijzigt.

## 9. Alerts

De basisalerts staan in `monitoring/prometheus/rules/availability-alerts.yml`. Prometheus laadt deze map via `rule_files` in `monitoring/prometheus/prometheus.yml`.

Deze alerts zijn technisch voorbereid voor notificaties via Alertmanager, maar versturen nog geen berichten. De huidige Alertmanager-configuratie in `monitoring/alertmanager/alertmanager.yml` gebruikt een receiver `no-notifications-configured` zonder e-mail, webhook, Slack, Teams of ander extern kanaal. De keuze voor het notificatieprogramma blijft daarmee open.

| Alertnaam | Component | Trigger | Betekenis |
|---|---|---|---|
| `BackendNietBereikbaar` | Backend | `probe_success{job="blackbox_http", instance="http://backend:8000/api/v1/health"} == 0 or up{job="blackbox_http", instance="http://backend:8000/api/v1/health"} == 0` gedurende 2 minuten | De backend health endpoint reageert niet succesvol of de probe kan niet worden uitgevoerd. |
| `FrontendInternNietBereikbaar` | Frontend | `probe_success{job="blackbox_http", instance="http://frontend/health"} == 0 or up{job="blackbox_http", instance="http://frontend/health"} == 0` gedurende 2 minuten | De frontend-container health endpoint reageert niet succesvol of de probe kan niet worden uitgevoerd. |
| `FrontendExternNietBereikbaar` | Frontend | `probe_success{job="blackbox_http", instance=~"https://.*"} == 0 or up{job="blackbox_http", instance=~"https://.*"} == 0` gedurende 2 minuten | De publieke HTTPS-route naar de frontend reageert niet succesvol of de probe kan niet worden uitgevoerd. |
| `DatabaseNietBereikbaar` | Database | `pg_up{job="postgres-exporter"} == 0 or up{job="postgres-exporter"} == 0` gedurende 2 minuten | PostgreSQL is niet bereikbaar voor de exporter, of de exporter zelf is niet bereikbaar. |
| `MQTTNietBereikbaar` | MQTT | `probe_success{job="blackbox_tcp", instance="mqtt:1883"} == 0 or up{job="blackbox_tcp", instance="mqtt:1883"} == 0` gedurende 2 minuten | De MQTT broker accepteert geen TCP-connectie op poort `1883` of de probe kan niet worden uitgevoerd. |
| `AlertmanagerNietBereikbaar` | Monitoring | `up{job="alertmanager"} == 0` gedurende 2 minuten | Prometheus kan Alertmanager niet scrapen, waardoor firing alerts niet kunnen worden doorgestuurd naar latere notificatiekanalen. |
| `PrometheusNietBereikbaar` | Monitoring | `up{job="prometheus"} == 0` gedurende 2 minuten | Prometheus kan de eigen metrics endpoint niet scrapen. |

De alertnamen zijn componentgericht en zonder omgevingsspecifieke waarden gekozen, zodat ze herbruikbaar blijven in lokale, test- en productieomgevingen.

## 10. Logs

Alloy verzamelt logs en schrijft ze naar Loki. Loki bewaart logs volgens `monitoring/loki/loki-config.yaml`; de huidige retention is `30d`.

Centraal verzamelde logbronnen:

| Bron | Labels/inhoud |
|---|---|
| Docker containers | `source="docker"`, `compose_service`, `container`, `server="main"`, `env="dev"` |
| Host logbestanden | `source="host"`, onder andere `auth.log`, `syslog`, `kern.log`, `ufw.log`, `daemon.log`, `docker.log` |
| Systemd journal | `source="journal"`, onder andere `unit`, `host`, `priority` |
| Alloy intern | `source="alloy"`, `job="alloy_internal"` |

Handige LogQL queries in Grafana Explore:

```logql
{source="docker", compose_service="caddy"}
{source="docker", compose_service="backend"} |~ "(?i)(error|exception|unauthorized|mqtt|database)"
{source="docker", compose_service="mqtt"} |~ "(?i)(denied|error|disconnect|connect|acl|listener)"
{source="docker", compose_service="postgres"} |~ "(?i)(error|fatal|deadlock|duration|authentication)"
{source=~"host|journal"} |~ "(?i)(sshd|sudo|kernel|ufw|firewall|docker|restart|failed)"
{source="docker", compose_service=~"prometheus|grafana|loki|alloy"} |~ "(?i)(error|warn|fail|timeout)"
```

## 11. Validatie

Controleer containerstatus:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps
```

Controleer Prometheus targets:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/targets | head
```

Controleer of de alert rules geladen zijn:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/rules | head
```

Controleer de actuele alertstatus:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/alerts | head
```

Controleer of Prometheus Alertmanager kent:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/alertmanagers | head
```

Controleer een paar metric endpoints vanuit Prometheus:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://node-exporter:9100/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://cadvisor:8080/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://mosquitto-exporter:9234/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://postgres-exporter:9187/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://blackbox-exporter:9115/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://alertmanager:9093/-/ready
```

Controleer Loki:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://loki:3100/ready
```

Bekijk logs van de observability services:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 grafana
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 prometheus
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 alertmanager
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 loki
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 alloy
```

## 12. Alerts lokaal testen

Start eerst de volledige stack inclusief monitoring. Simuleer daarna per component uitval door de betreffende container tijdelijk te stoppen. Wacht minimaal 2 minuten, omdat de alert rules een `for: 2m` wachttijd gebruiken.

Backend-uitval:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" stop backend
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/alerts | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" start backend
```

Interne frontend-uitval:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" stop frontend
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/alerts | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" start frontend
```

Database-uitval:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" stop postgres
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/alerts | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" start postgres
```

MQTT-uitval:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" stop mqtt
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/alerts | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" start mqtt
```

In Grafana kun je dezelfde status controleren via Explore met datasource `Prometheus` en query:

```promql
ALERTS{alertstate="firing"}
```

Het dashboard `INNO - Single Dashboard` heeft onder `Bereikbaarheid (blackbox-exporter)` ook het statpanel `Aantal actieve alerts` en de tabel `Alertdetails`. De teller gebruikt:

```promql
count(ALERTS{alertstate=~"pending|firing"}) or vector(0)
```

De detailtabel gebruikt:

```promql
ALERTS{alertstate=~"pending|firing"}
```

Onder de rij `Alertmanager` staan daarnaast:

| Panel | Query | Doel |
|---|---|---|
| `Alertmanager status` | `up{job="alertmanager"}` | Toont of Alertmanager door Prometheus gescraped kan worden. |
| `Alertmanager actieve alerts` | `sum(alertmanager_alerts{state="active"}) or vector(0)` | Toont hoeveel alerts Alertmanager actief kent. |
| `Alertmanager actieve silences` | `sum(alertmanager_silences{state="active"}) or vector(0)` | Toont hoeveel silences actief zijn. |

Externe frontend-uitval test je via de publieke HTTPS-route. Stop lokaal bijvoorbeeld `caddy` als de hardcoded blackbox target naar deze machine wijst:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" stop caddy
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/alerts | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" start caddy
```

Let op: deze externe test werkt alleen betrouwbaar wanneer de HTTPS-target in `monitoring/prometheus/prometheus.yml` naar de omgeving wijst die je lokaal test.

## 13. Dashboards beheren

Nieuw dashboard toevoegen:

1. Exporteer het dashboard als `.json` vanuit Grafana.
2. Plaats het bestand in `monitoring/grafana/dashboards/`.
3. Grafana pakt wijzigingen automatisch op via provisioning.

Bestaand dashboard aanpassen:

1. Pas het dashboard aan in Grafana UI.
2. Exporteer opnieuw naar `.json`.
3. Overschrijf het bestand in `monitoring/grafana/dashboards/`.

Let op: dashboards die via provisioning worden beheerd, moeten uiteindelijk weer als JSON in de repo landen. Anders verdwijnen UI-wijzigingen bij een verse omgeving.

## 14. Veelvoorkomende problemen

### Grafana opent niet via `/grafana`

Controleer of `caddy` en `grafana` draaien:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps caddy grafana
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 caddy
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 grafana
```

Controleer ook of `GF_SERVER_ROOT_URL` klopt wanneer Grafana redirects of assets verkeerd laadt. Verwachte waarde:

```dotenv
GF_SERVER_ROOT_URL=https://<DOMAIN>/grafana/
```

### Prometheus target staat op `DOWN`

Controleer of de exporter-container draait:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps node-exporter cadvisor mosquitto-exporter postgres-exporter blackbox-exporter backend caddy
```

Controleer netwerk/bereikbaarheid vanuit Prometheus:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://node-exporter:9100/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://cadvisor:8080/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://mosquitto-exporter:9234/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://postgres-exporter:9187/metrics | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://caddy:2020/metrics | head
```

### Geen PostgreSQL metrics

Controleer of `postgres-exporter` draait en of de databasevariabelen in `.env` kloppen:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps postgres postgres-exporter
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 postgres-exporter
```

De exporter gebruikt:

```text
postgresql://${DT_PG_MONITOR_USER}:${DT_PG_MONITOR_PASS}@postgres:5432/${DT_PG_DB}?sslmode=require
```


### Geen MQTT metrics

Controleer of Mosquitto bereikbaar is op `mqtt:1883` binnen het compose-netwerk en bekijk de exporter logs:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps mqtt mosquitto-exporter
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 mosquitto-exporter
```

### Geen logs in Grafana/Loki

Controleer of `loki` en `alloy` draaien:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps loki alloy
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 loki
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 alloy
```

Controleer daarna in Grafana Explore met datasource `Loki`:

```logql
{source="docker"}
{source="host"}
{source="journal"}
```

Let op host mounts in `compose.monitoring.yml`: Alloy leest `/var/run/docker.sock`, `/var/log` en `/var/log/journal` read-only. Op hosts zonder systemd journal directory kan de journal-bron leeg blijven.

### Blackbox checks falen

Controleer de probe handmatig:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- "http://blackbox-exporter:9115/probe?target=http://frontend/health&module=http_2xx" | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- "http://blackbox-exporter:9115/probe?target=http://backend:8000/api/v1/health&module=http_2xx" | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- "http://blackbox-exporter:9115/probe?target=mqtt:1883&module=tcp_connect" | head
```

Als de externe URL faalt, controleer DNS, firewall, Caddy en certificaten.

### Alerts worden niet geladen

Controleer of Prometheus de rule file kan lezen:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/rules | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 prometheus
```

Controleer daarna of `monitoring/prometheus/rules/availability-alerts.yml` via `compose.monitoring.yml` read-only is gemount naar `/etc/prometheus/rules`.

### Alertmanager ontvangt geen alerts

Controleer of `alertmanager` draait en of Prometheus de target kent:

```bash
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps prometheus alertmanager
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" exec prometheus wget -qO- http://localhost:9090/api/v1/alertmanagers | head
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs --tail=100 alertmanager
```

Controleer daarna of `monitoring/alertmanager/alertmanager.yml` via `compose.monitoring.yml` read-only is gemount naar `/etc/alertmanager/alertmanager.yml`.

## 15. Data persistentie

Monitoring- en loggingdata blijft behouden in Docker volumes:

- `prometheus_data`: Prometheus time-series data
- `grafana_data`: Grafana metadata, users, settings en plugin state
- `alertmanager_data`: Alertmanager runtime-state, zoals eventuele silences
- `loki_data`: Loki chunks, index en retention data
- `alloy_data`: Alloy runtime-state voor logverzameling

Volumes verwijderen verwijdert ook monitoringhistorie en logs:

```bash
docker compose down -v
```

## 16. Security aandachtspunten

- Gebruik een sterk `GRAFANA_PASSWORD` in `.env`.
- Publiceer Prometheus, Loki en exporters niet direct naar internet.
- Laat externe toegang bij voorkeur via Caddy, VPN, IP allowlist of extra auth lopen.
- Alloy heeft toegang tot Docker metadata en hostlogs; behandel die data als gevoelig.
- Logs kunnen persoonsgegevens, tokens of foutdetails bevatten. Schrijf geen secrets naar applicatielogs.
- Houd container images up-to-date met `docker compose pull`.

## 17. Handige beheercommando's

```bash
# Herstart alleen observability services
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" restart grafana loki alloy prometheus alertmanager node-exporter cadvisor mosquitto-exporter postgres-exporter blackbox-exporter

# Observability logs live volgen
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" logs -f grafana loki alloy prometheus alertmanager node-exporter cadvisor mosquitto-exporter postgres-exporter blackbox-exporter

# Nieuwste images ophalen en stack opnieuw starten
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" pull
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" up -d
```
