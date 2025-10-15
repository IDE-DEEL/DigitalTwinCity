# Functionele Requirements

De functionele requirements laten duidelijk zien wat de opdrachtgever als verwachtingen heeft voor het eindproduct. De functionele requirements worden opgesplitst in verschillende prioriteiten:
- Must have -> Dit houdt in dat in het minimal viable product (MVP) alle must have functionele requirements zitten. Dit zijn dus de belangrijkste requirements bij oplevering
- Should have -> Dit zijn de functionele requirements die belangrijk zijn en goed bij het eindproduct passen. Als het MVP af is wordt er hieraan gewerkt, maar niet alles hoeft hierbij af te zijn.
- Could have -> Deze requirements zijn het minst belangrijk en vooral ideeën voor een later model, of latere versie. Als er tijd over is nadat de must have en should have requirements klaar zijn kan er hieraan gewerkt worden, maar dat is vaak niet het geval.
- 
---

## 1. Robotfunctionaliteit (Technische Informatica)

| Nummer | Beschrijving | Prioriteit |
|--------|---------------|------------|
| TI_F01 | De robot kan een lijn volgen | Must have |
| TI_F02 | De robot weet waar hij zich bevindt (locatiebepaling) | Must have |
| TI_F03 | De robot kan vier rijrichtingen nemen en rotondes volgen | Must have |
| TI_F04 | De robot kan obstakels detecteren en vermijden (doel: niet aanrijden of botsen) | Should have |
| TI_F05 | De robot bepaalt zelfstandig de beste route van start- naar eindpunt | Should have |
| TI_F06 | Het systeem kan baanvlakken reserveren via RFID-tags (niet de robot zelf) | Should have |
| TI_F07 | De robot kan gereserveerde baanvlakken na gebruik vrijgeven | Should have |
| TI_F08 | De robot biedt logica voor onderhoudsoptimalisatie | Could have |
| TI_F09 | De robot houdt rekening met belangenafweging tussen meerdere robots | Could have |

---

## 2. Digitale Simulatie en Webomgeving (Software Development)

| Nummer | Beschrijving | Prioriteit |
|--------|---------------|------------|
| SD_F01 | De simulatie kan worden uitgevoerd via de webomgeving | Must have |
| SD_F02 | Gebruikers kunnen parameters instellen in de webinterface | Must have |
| SD_F03 | De simulatieomgeving weerspiegelt de fysieke omgeving één-op-één (duidelijke koppeling fysiek ↔ digitaal) | Must have |
| SD_F04 | De code is leesbaar door gebruik van duidelijke functienamen, variabelen en documentatie (ISO 25010 - Usability & Maintainability) | Must have |
| SD_F05 | De code is uitbreidbaar voor toekomstige ontwikkeling (ISO 25010 - Modifiability) | Must have |
| SD_F06 | De code is onderhoudbaar volgens coding standaarden en principes (SOLID, ICE, etc.) (ISO 25010 - Maintainability) | Must have |
| SD_F07 | Er zijn unit tests voor business rules, bijvoorbeeld het berekenen van snelheid | Should have |
| SD_F08 | De website toont resultaten, zoals een score of prestatie-indicatoren, op basis van simulatie-uitkomsten | Should have |
| SD_F09 | Parametergegevens en scores worden opgeslagen voor latere analyse | Could have |

---

## 3. Cloud en Beveiliging (Cybersecurity & Cloud)

| Nummer | Beschrijving | Prioriteit |
|--------|---------------|------------|
| CSC_F01 | De cloudomgeving ontvangt berichten van zowel de fysieke robot als de website | Must have |
| CSC_F02 | De cloudomgeving is operationeel met hoge beschikbaarheid (uptime) | Must have |
| CSC_F03 | Data uit simulaties en fysieke robots wordt veilig opgeslagen in de database | Must have |
| CSC_F04 | De cloudomgeving verstuurt real-time data naar de webomgeving | Must have |
| CSC_F05 | De website is bereikbaar vanuit externe locaties (bijv. thuis of park) | Must have |
| CSC_F06 | Er worden geen persoonsgegevens opgeslagen; dataprivacy is gegarandeerd | Must have |
| CSC_F07 | Toegang tot de cloudomgeving kan worden gemonitord | Should have |
| CSC_F08 | Beveiliging tegen ongeautoriseerde toegang is aanwezig | Should have |
| CSC_F09 | Het systeem kan alerts versturen bij storingen of fouten | Could have |
| CSC_F10 | De cloud kan updates en patches uitvoeren zonder downtime | Could have |

---
