# GitHub Actions workflows

Deze map bevat de CI/CD workflows voor bouwen, scannen, publiceren en deployen.

Voor de volledige uitleg per workflow staat er nu een apart detaildocument:

- [WORKFLOW_DETAILS.md](./WORKFLOW_DETAILS.md)
- [../../deploy/README.md](../../deploy/README.md) voor de server- en release-runbook

## Snel overzicht

| Workflow | Bestand | Doel |
|---|---|---|
| Backend Build, Scan and Publish Docker Image | `backend-build-scan-publish.yml` | Bouwt, scant en publiceert de backend image. |
| Frontend Build, Scan and Publish Docker Image | `frontend-build-scan-publish.yml` | Bouwt, scant en publiceert de frontend image. |
| Reusable Docker Build, Scan and Publish | `docker-build-scan-publish.yml` | Herbruikbare workflow met de gedeelde Docker build-, Trivy scan- en GHCR publish-stappen. |
| CD Deploy | `cd-deploy.yml` | Bepaalt de release-context, kopieert de serverbundle via SSH en start de remote deployment. |

## Hoofdflow

1. Een push naar `main` of `dev` start de backend- en frontend-build workflows.
2. Beide build workflows gebruiken `docker-build-scan-publish.yml`.
3. De herbruikbare workflow bouwt de Docker image, scant met Trivy en pusht alleen bij toegestane branch-runs naar GHCR.
4. Op `main` start `cd-deploy.yml` automatisch na een succesvolle backend- of frontend-build.
5. De CD workflow wacht logisch tot beide app-images voor dezelfde commit klaar zijn wanneer `backend/`, `frontend/`, `server/` of `deploy/` is gewijzigd.
6. De deployment gebruikt immutable image references: `sha-<short-sha>` tags of `sha256` digests.
7. Op de server promoveert `remote-deploy.sh` de nieuwe release pas nadat healthchecks slagen.

## Belangrijkste regels

- App-images krijgen geen `latest` tag.
- Pull requests bouwen en scannen wel, maar pushen geen image naar GHCR.
- `CRITICAL` Trivy vulnerabilities blokkeren de build.
- `HIGH` en `MEDIUM` findings worden gerapporteerd, maar blokkeren niet automatisch.
- Automatische CD draait alleen voor `main` en gaat door bij wijzigingen in `backend/`, `frontend/`, `server/` of `deploy/`.
- Handmatige CD accepteert alleen lege image-inputs, `sha-*` tags of `sha256` digests.
- De deploy-job draait op een `self-hosted` runner omdat de OpenICT lab VM niet bereikbaar is via een externe SSH-verbinding vanaf GitHub-hosted runners.
- Als de self-hosted runner op dezelfde OpenICT lab VM draait als de deployment-host, zet `DEPLOY_HOST` op `localhost`.

## Vereiste secrets voor CD

| Secret | Verplicht | Doel |
|---|---|---|
| `DEPLOY_HOST` | Ja | Hostname of IP van de deployment-host. Gebruik `localhost` als de self-hosted runner op dezelfde OpenICT lab VM draait. |
| `DEPLOY_USER` | Ja | SSH user op de deployment-host. |
| `DEPLOY_SSH_KEY` | Ja | Private SSH key zonder passphrase. |
| `DEPLOY_PATH` | Ja | Rootmap voor releases, shared config en state. |
| `DEPLOY_PORT` | Nee | SSH poort, standaard `22`. |

GHCR gebruikt `github.actor` en `github.token`. De workflows zetten daarvoor zelf de benodigde permissions.

## Waar kijk je bij fouten?

| Probleem | Eerste plek om te kijken |
|---|---|
| Build faalt op scan | Job summary en artifact `*-trivy-reports-*`. |
| Image wordt niet gepusht | Controleer of de run geen pull request is en op `main` of `dev` draait. |
| CD wordt overgeslagen | Job `Prepare deployment context`, output `should_deploy`. |
| CD mist secrets | Job `Deploy application`, stap `Copy and run deployment`. |
| SSH faalt | `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` en server `authorized_keys`. |
| Healthcheck faalt | Logs in de CD job en daarna `docker compose ps/logs` op de server. |

Meer details staan in [WORKFLOW_DETAILS.md](./WORKFLOW_DETAILS.md).
