# Functionele Requirements

De functionele requirements laten duidelijk zien wat de opdrachtgever als verwachtingen heeft voor het eindproduct. De functionele requirements worden opgesplitst in verschillende prioriteiten:
- Must have -> Dit houdt in dat in het minimal viable product (MVP) alle must have functionele requirements zitten. Dit zijn dus de belangrijkste requirements bij oplevering
- Should have -> Dit zijn de functionele requirements die belangrijk zijn en goed bij het eindproduct passen. Als het MVP af is wordt er hieraan gewerkt, maar niet alles hoeft hierbij af te zijn.
- Could have -> Deze requirements zijn het minst belangrijk en vooral ideeën voor een later model, of latere versie. Als er tijd over is nadat de must have en should have requirements klaar zijn kan er hieraan gewerkt worden, maar dat is vaak niet het geval.

---

## Navigatie en Robotgedrag

| Nummer | Beschrijving | Prioriteit |
|--------|---------------|------------|
| FR_N01 | De robot kan een lijn volgen | Must have |
| FR_N02 | De robot weet waar hij zich bevindt (locatiebepaling) | Must have |
| FR_N03 | De robot kan vier rijrichtingen nemen en rotondes volgen | Must have |
| FR_N04 | De robot kan obstakels detecteren en vermijden (doel: niet aanrijden of botsen) | Should have |
| FR_N05 | De robot bepaalt zelfstandig de beste route van start- naar eindpunt | Should have |
| FR_N06 | Het systeem kan baanvlakken reserveren via RFID-tags (niet de robot zelf) | Should have |
| FR_N07 | De robot kan gereserveerde baanvlakken na gebruik vrijgeven | Should have |
| FR_N08 | De robot biedt logica voor onderhoudsoptimalisatie | Could have |
| FR_N09 | De robot houdt rekening met belangenafweging tussen meerdere robots | Could have |

---

## Simulatie en Logica

| Nummer | Beschrijving | Prioriteit |
|--------|---------------|------------|
| FR_S01 | De simulatie kan worden uitgevoerd via de webomgeving | Must have |
| FR_S02 | Gebruikers kunnen parameters instellen in de webinterface | Must have |
| FR_S03 | De simulatieomgeving weerspiegelt de fysieke omgeving één-op-één (duidelijke koppeling fysiek ↔ digitaal) | Must have |
| FR_S04 | De code is leesbaar door gebruik van duidelijke functienamen, variabelen en documentatie (ISO 25010 - Usability & Maintainability) | Must have |
| FR_S05 | De code is uitbreidbaar voor toekomstige ontwikkeling (ISO 25010 - Modifiability) | Must have |
| FR_S06 | De code is onderhoudbaar volgens coding standaarden en principes (SOLID, ICE, etc.) (ISO 25010 - Maintainability) | Must have |
| FR_S07 | Er zijn unit tests voor business rules, bijvoorbeeld het berekenen van snelheid | Should have |
| FR_S08 | De website toont resultaten zoals een score of prestatie-indicatoren op basis van simulatie-uitkomsten | Should have |
| FR_S09 | Parametergegevens en scores worden opgeslagen voor latere analyse | Should have |

---

## Cloud en Beveiliging

| Nummer | Beschrijving | Prioriteit |
|--------|---------------|------------|
| FR_C01 | De cloudomgeving ontvangt berichten van zowel de fysieke robot als de website | Must have |
| FR_C02 | De cloudomgeving is operationeel met hoge beschikbaarheid (uptime) | Must have |
| FR_C03 | Data uit simulaties en fysieke robots wordt veilig opgeslagen in de database | Must have |
| FR_C04 | De cloudomgeving verstuurt real-time data naar de webomgeving | Must have |
| FR_C05 | De website is bereikbaar vanuit externe locaties (bijv. thuis of park) | Must have |
| FR_C06 | Er worden geen persoonsgegevens opgeslagen; dataprivacy is gegarandeerd | Must have |
| FR_C07 | Toegang tot de cloudomgeving kan worden gemonitord | Should have |
| FR_C08 | Beveiliging tegen ongeautoriseerde toegang is aanwezig | Should have |
| FR_C09 | Het systeem kan alerts versturen bij storingen of fouten | Could have |
| FR_C10 | De cloud kan updates en patches uitvoeren zonder downtime | Could have |

---
