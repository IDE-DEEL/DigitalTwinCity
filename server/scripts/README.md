# Scripts

Deze map bevat losse beheerscripts voor de deployment-host. Ze worden door de CD workflow meegekopieerd naar elke release, maar niet automatisch uitgevoerd door `remote-deploy.sh`.

## Inhoud

```text
scripts/
├─ README.md
└─ new-user.sh
```

## Belangrijke aannames

De scripts zijn serverbeheer-scripts en hebben defaults voor de huidige OpenICT lab VM setup:

- deployment root: `/opt/digital-twin`, te overschrijven met `DEPLOY_ROOT`
- Linux group voor teambeheer: `team`
- Docker group voor beheerders: `docker`
- Mosquitto UID: `1883`
- PostgreSQL is alleen binnen Docker bereikbaar via de service `postgres`

Als `DEPLOY_PATH` in GitHub Actions niet `/opt/digital-twin` is, voer de scripts uit met dezelfde root:

```bash
sudo DEPLOY_ROOT=<DEPLOY_PATH> ./new-user.sh <username>
```

## `new-user.sh`

Maakt een nieuwe Linux user aan voor beheer op de VM.

Gebruik:

```bash
sudo ./new-user.sh <username>
```

Wat het script doet:

1. Controleert dat het als root draait.
2. Maakt de groep `team` aan als die nog niet bestaat.
3. Zet rechten op `DEPLOY_ROOT` naar beheer via `root:team`.
4. Zet setgid-bit op directories onder `DEPLOY_ROOT`, zodat nieuwe bestanden de teamgroup houden.
5. Corrigeert rechten op `DEPLOY_ROOT/shared/mosquitto/password` voor Mosquitto.
6. Maakt de Linux user aan als die nog niet bestaat.
7. Verwijdert wachtwoordlogin voor de user met `passwd -d`.
8. Zet de home directory op `700`.
9. Voegt de user toe aan `team` en `docker`.
10. Maakt `~/.ssh/authorized_keys` aan met correcte rechten.

Na uitvoeren moet de publieke SSH key van de gebruiker nog handmatig in:

```text
/home/<username>/.ssh/authorized_keys
```

Let op: membership van de `docker` group geeft praktisch rootrechten op de host. Geef dit alleen aan beheerders die Docker op de VM mogen beheren.

## Productie-context

Voor reguliere stackcommando's gebruik je liever de release-context:

```bash
export DEPLOY_PATH="/opt/digital-twin"
cd "$DEPLOY_PATH"
set -a
. "$DEPLOY_PATH/state/current-release.env"
set +a
cd "$RELEASE_DIR"
docker compose --env-file "$APP_ENV_FILE" -f compose.yml -f compose.monitoring.yml --project-name "$COMPOSE_PROJECT_NAME" ps
```

Gebruik de scripts vooral voor hostbeheer of gerichte controles die niet in `remote-deploy.sh` zitten.

## Security

- Draai scripts alleen op de deployment-host.
- Controleer hardcoded paden voordat je ze uitvoert.
- Voeg alleen vertrouwde users toe aan de `docker` group.
- Commit geen private keys, wachtwoorden of ingevulde env files.
