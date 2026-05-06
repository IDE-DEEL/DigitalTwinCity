# CI-documentatie: Docker images

## Doel

Deze documentatie beschrijft de GitHub Actions CI-configuratie voor de Docker
images van de backend en frontend. Beide workflows bouwen een Docker image,
voeren een Trivy beveiligingsscan uit en publiceren de gescande image naar
GitHub Container Registry (GHCR) wanneer de run op `main` of `dev` draait.

De workflows zijn vrijwel gelijk opgezet. Het verschil zit vooral in de map die
gebouwd wordt, de Dockerfile die gebruikt wordt, de image-naam en de
artifactnaam.

## Workflowbestanden

| Onderdeel | Workflowbestand |
| --- | --- |
| Backend | `.github/workflows/backend-build-scan-publish.yml` |
| Frontend | `.github/workflows/frontend-build-scan-publish.yml` |

## Wanneer draaien de workflows?

Beide workflows starten in drie situaties:

- Bij een `push` naar de branches `main` of `dev`, maar alleen als er relevante
  bestanden zijn gewijzigd.
- Bij een `pull_request`, maar alleen als er relevante bestanden zijn gewijzigd.
- Handmatig via `workflow_dispatch` in GitHub Actions.

De padfilters verschillen per workflow:

| Onderdeel | Padfilters |
| --- | --- |
| Backend | `backend/**` en `.github/workflows/backend-build-scan-publish.yml` |
| Frontend | `frontend/**` en `.github/workflows/frontend-build-scan-publish.yml` |

Door deze padfilters draait de backend workflow alleen bij backend-wijzigingen
en draait de frontend workflow alleen bij frontend-wijzigingen. Dit voorkomt
onnodige CI-runs.

## Rechten en gelijktijdigheid

Beide workflows gebruiken dezelfde GitHub Actions permissies:

| Permissie | Reden |
| --- | --- |
| `contents: read` | Nodig om de repository te kunnen uitchecken. |
| `packages: write` | Nodig om Docker images naar GHCR te publiceren. |
| `actions: read` | Nodig voor het lezen van Actions-context binnen de run. |

Per workflow is een concurrency group ingesteld:

| Onderdeel | Concurrency group |
| --- | --- |
| Backend | `backend-build-scan-publish-${{ github.ref }}` |
| Frontend | `frontend-build-scan-publish-${{ github.ref }}` |

Als er voor dezelfde branch of pull request een nieuwe run start, wordt de oudere
run automatisch gestopt. Daardoor wordt alleen de nieuwste wijziging gebouwd en
gescand.

## Jobopzet

Beide workflows bevatten een Docker job die draait op `ubuntu-latest`.

| Onderdeel | Jobnaam |
| --- | --- |
| Backend | `Build, scan and publish backend image` |
| Frontend | `Build, scan and publish frontend image` |

De jobs leveren dezelfde soort outputs op:

| Output | Betekenis |
| --- | --- |
| `image_ref` | De image tag die door Trivy is gescand. |
| `critical_count` | Aantal gevonden kritieke kwetsbaarheden. |
| `high_count` | Aantal gevonden hoge kwetsbaarheden. |
| `medium_count` | Aantal gevonden medium kwetsbaarheden. |

## Stappen in de workflows

### 1. Repository uitchecken

De workflows gebruiken `actions/checkout@v4` om de broncode beschikbaar te maken
op de GitHub runner.

### 2. Docker Buildx instellen

Met `docker/setup-buildx-action@v3` wordt Docker Buildx klaargezet. Buildx wordt
gebruikt voor het bouwen van de Docker images.

### 3. Inloggen op GitHub Container Registry

De workflows loggen alleen in op GHCR als de run geen pull request is en draait
op `main` of `dev`.

Voor pull requests wordt niet ingelogd en wordt er niets gepubliceerd. Pull
requests bouwen en scannen dus wel, maar krijgen geen publicatierechten.

### 4. Repositorynaam normaliseren

De repositorynaam wordt omgezet naar kleine letters. Dit is nodig omdat GHCR
image namen in kleine letters verwacht.

### 5. Image tags bepalen

Elke image krijgt altijd een SHA-tag:

```text
ghcr.io/<owner>/<repository>/<onderdeel>:sha-<korte-commit-sha>
```

Voor runs op `main` wordt daarnaast ook de tag `latest` toegevoegd:

```text
ghcr.io/<owner>/<repository>/<onderdeel>:latest
```

De concrete image namen zijn:

| Onderdeel | Image |
| --- | --- |
| Backend | `ghcr.io/<owner>/<repository>/backend` |
| Frontend | `ghcr.io/<owner>/<repository>/frontend` |

De scan gebruikt altijd de SHA-tag. Daardoor is duidelijk welke exacte commit is
gebouwd en gecontroleerd.

### 6. Docker image lokaal bouwen

De workflows bouwen de image eerst lokaal op de runner. Daarna scant Trivy exact
dezelfde image die later gepubliceerd kan worden.

| Onderdeel | Build context | Dockerfile |
| --- | --- | --- |
| Backend | `./backend` | `./backend/Dockerfile` |
| Frontend | `./frontend` | `./frontend/Dockerfile` |

Beide builds gebruiken:

- `push: false` — image niet direct naar registry pushen
- `load: true` — image laden in Docker daemon voor lokale scanning
- `pull: true` — altijd verse versies van base images ophalen
- `cache-from: type=gha` — build cache uit GitHub Actions gebruiken
- `cache-to: type=gha,mode=max,ignore-error=true` — cache terugschrijven voor volgende runs

### 7. Trivy beveiligingsscan uitvoeren

Beide workflows gebruiken `aquasecurity/trivy-action@v0.36.0` om de image te
scannen. De scan zoekt naar:

- kwetsbaarheden (`vuln`)
- secrets (`secret`)
- misconfiguraties (`misconfig`)

De scan kijkt naar OS-packages en library dependencies. Alleen bevindingen met
severity `MEDIUM`, `HIGH` en `CRITICAL` worden meegenomen. `ignore-unfixed: true`
zorgt ervoor dat kwetsbaarheden zonder beschikbare fix niet meetellen in het
rapport.

Trivy schrijft het volledige JSON-rapport naar: trivy-report.json

De Trivy-stap zelf gebruikt `exit-code: "0"`. Daardoor kan de workflow eerst een
leesbare samenvatting maken voordat de workflow eventueel faalt.

### 8. Kwetsbaarheidsoverzicht maken

Na de Trivy-scan maken de workflows met `jq` een overzicht voor ontwikkelaars.
Hierin staan:

- de gescande image
- het aantal `CRITICAL`, `HIGH` en `MEDIUM` bevindingen
- de blocking criteria
- maximaal 50 topbevindingen, gesorteerd op severity en package

Het overzicht wordt op twee plekken geplaatst:

- in de GitHub Actions job summary
- in het bestand `trivy-overview.md`

### 9. Rapporten uploaden als artifact

Beide workflows uploaden dezelfde rapportbestanden:

```text
trivy-report.json
trivy-overview.md
```

De artifactnaam verschilt per onderdeel:

| Onderdeel | Artifactnaam |
| --- | --- |
| Backend | `backend-trivy-reports-<run_number>` |
| Frontend | `frontend-trivy-reports-<run_number>` |

Als de bestanden ontbreken, faalt de uploadstap door `if-no-files-found: error`.

### 10. Workflow laten falen bij kritieke kwetsbaarheden

De workflows falen wanneer `critical_count` niet gelijk is aan `0`.

Dat betekent:

- `CRITICAL` kwetsbaarheden blokkeren de workflow.
- `HIGH` en `MEDIUM` kwetsbaarheden zijn zichtbaar in de summary en artifacts,
  maar blokkeren de workflow niet automatisch.

Ontwikkelaars moeten `HIGH` en `MEDIUM` bevindingen triageren en waar nodig
oplossen.

### 11. Image publiceren naar GHCR

De image wordt alleen gepubliceerd als:

- de run geen pull request is
- de branch `main` of `dev` is
- de workflow niet eerder is gefaald door kritieke kwetsbaarheden

De workflows pushen alle berekende tags naar GHCR. Op `dev` is dat alleen de
SHA-tag. Op `main` zijn dat de SHA-tag en `latest`.
