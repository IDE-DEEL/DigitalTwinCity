# GitHub Actions workflows

Deze map bevat de CI/CD workflows voor bouwen, scannen, publiceren en deployen.

Meer detail staat in:

- [WORKFLOW_DETAILS.md](./WORKFLOW_DETAILS.md)
- [../../deploy/README.md](../../deploy/README.md) voor de server- en release-runbook

## Snel overzicht

| Workflow | Bestand | Doel |
|---|---|---|
| CI/CD Pipeline | `ci-cd.yml` | Bouwt en scant backend en frontend, publiceert images en deployt op `main` of handmatig. |
| Reusable Docker Build, Scan and Publish | `docker-build-scan-publish.yml` | Herbruikbare workflow met de gedeelde Docker build-, Trivy scan- en GHCR publish-stappen. |

## Hoofdflow

1. Een push naar `main` of `dev` met wijzigingen in `backend/`, `frontend/`, `server/`, `deploy/` of `.github/workflows/` start `ci-cd.yml`.
2. Een pull request naar `main` met dezelfde padfilters start ook `ci-cd.yml`.
3. `ci-cd.yml` roept `docker-build-scan-publish.yml` twee keer aan: een keer voor backend en een keer voor frontend.
4. De herbruikbare workflow bouwt de Docker image lokaal, scant met Trivy en pusht alleen buiten pull requests op `main` of `dev`, of bij handmatige `workflow_dispatch` runs, naar GHCR.
5. Pull requests bouwen en scannen wel, maar publiceren of deployen niet.
6. Een push naar `main` deployt na succesvolle backend- en frontend-builds.
7. Een push naar `dev` bouwt, scant en publiceert images, maar deployt niet.
8. Handmatige `workflow_dispatch` runs bouwen, scannen, publiceren en deployen.
9. De deployment gebruikt standaard image tags van de vorm `sha-<short-sha>`.
10. Op de server promoveert `remote-deploy.sh` de nieuwe release pas nadat healthchecks slagen.

## Belangrijkste regels

- App-images krijgen geen `latest` tag vanuit de workflow.
- Pull requests naar `main` bouwen en scannen wel, maar pushen geen image naar GHCR.
- Handmatige `workflow_dispatch` runs bouwen, scannen, pushen en deployen.
- `CRITICAL` Trivy vulnerabilities blokkeren de build en dus ook de publish/deploy.
- `HIGH` en `MEDIUM` findings worden gerapporteerd, maar blokkeren niet automatisch.
- Automatische deployment draait alleen op push naar `main`.
- `dev` publiceert images naar GHCR, maar deployt niet.
- De deploy-job draait op een `self-hosted` runner omdat de OpenICT lab VM niet bereikbaar is via een externe SSH-verbinding vanaf GitHub-hosted runners.
- Als de self-hosted runner op dezelfde OpenICT lab VM draait als de deployment-host, zet `DEPLOY_HOST` op `localhost`.

## Handmatige deployment inputs

| Input | Betekenis |
|---|---|
| `backend_image` | Optionele backend image reference. Leeg betekent `ghcr.io/<owner>/<repo>/backend:sha-<short-sha>`. Een losse tag wordt aangevuld als backend-image tag. |
| `frontend_image` | Optionele frontend image reference. Leeg betekent `ghcr.io/<owner>/<repo>/frontend:sha-<short-sha>`. Een losse tag wordt aangevuld als frontend-image tag. |
| `rollback_on_failure` | `true` of `false`, standaard `true`. |

Gebruik bij voorkeur lege inputs of immutable `sha-*` image references. De workflow valideert de image-inputs niet inhoudelijk, dus vul geen mutable tags zoals `latest` in.

## Vereiste secrets voor deployment

| Secret | Verplicht | Doel |
|---|---|---|
| `DEPLOY_HOST` | Ja | Hostname of IP van de deployment-host. Gebruik `localhost` als de self-hosted runner op dezelfde OpenICT lab VM draait. |
| `DEPLOY_USER` | Ja | SSH user op de deployment-host. |
| `DEPLOY_SSH_KEY` | Ja | Private SSH key zonder passphrase. |
| `DEPLOY_PATH` | Ja | Rootmap voor releases en shared config. |
| `DEPLOY_PORT` | Nee | SSH poort, standaard `22`. |

GHCR gebruikt `github.actor` en `github.token`. De workflows zetten daarvoor zelf de benodigde permissions.

## Waar kijk je bij fouten?

| Probleem | Eerste plek om te kijken |
|---|---|
| Build faalt op scan | Job summary en artifact `*-trivy-reports-*`. |
| Image wordt niet gepusht | Controleer of de run geen pull request is en op `main` of `dev` draait, of handmatig via `workflow_dispatch` is gestart. |
| Deployment wordt overgeslagen | Controleer of de run een push naar `main` of een handmatige `workflow_dispatch` run is. |
| Deployment mist secrets | Job `Deploy application`, stap `Execute remote deploy`. |
| SSH faalt | `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` en server `authorized_keys`. |
| Healthcheck faalt | Logs in de deploy-job en daarna `docker compose ps/logs` op de server. |

Meer details staan in [WORKFLOW_DETAILS.md](./WORKFLOW_DETAILS.md).
