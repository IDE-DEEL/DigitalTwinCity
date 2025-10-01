# Functionele Requirements

De functionele requirements laten duidelijk zien wat de opdrachtgever als verwachtingen heeft voor het eindproduct. De functionele requirements worden opgesplitst in verschillende prioriteiten:
- Must have -> Dit houdt in dat in het minimal viable product (MVP) alle must have functionele requirements zitten. Dit zijn dus de belangrijkste requirements bij oplevering
- Should have -> Dit zijn de functionele requirements die belangrijk zijn en goed bij het eindproduct passen. Als het MVP af is wordt er hieraan gewerkt, maar niet alles hoeft hierbij af te zijn.
- Could have -> Deze requirements zijn het minst belangrijk en vooral ideeën voor een later model, of latere versie. Als er tijd over is nadat de must have en should have requirements klaar zijn kan er hieraan gewerkt worden, maar dat is vaak niet het geval.

## Technische Informatica

| Nummer | Beschrijving                                                                 | Prioriteit   |
|--------|-------------------------------------------------------------------------------|--------------|
| TI_F01    | De robot kan een lijn volgen                                                 | Must have    |
| TI_F02    | De locatie van de robot wordt uitgezonden                                    | Must have    |
| TI_F03    | De robot kan vier rijrichtingen en rotondes nemen                            | Must have    |
| TI_F04    | De robot heeft een vorm van obstakeldetectie                                 | Should have  |
| TI_F05    | De robot bevat een algoritme dat de beste route bepaalt van startpunt naar eindpunt | Should have  |
| TI_F06    | De robot kan via RFID-tags baanvlakken reserveren                            | Should have  |
| TI_F07    | De robot kan gereserveerde baanvlakken na gebruik vrijgeven                  | Should have  |
| TI_F08    | De lijn bestaat uit magneetstrippen                                          | Could have   |
| TI_F09    | De robot bevat een camera                                                    | Could have   |
| TI_F10    | De robot biedt logica voor onderhoudsoptimalisatie                           | Could have   |
| TI_F11    | De robot houdt rekening met belangenafweging tussen meerdere robots          | Could have   |

## Software development

| Nummer | Beschrijving| Prioriteit   |
|--------|------------|--------------|
|SD_F01|De simulatie moet kunnen worden uitgevoerd op de website | Must Have|
|SD_F02  | De website bevat parameters die gebruikers kunnen instellen| Must Have|
|SD_F03| De simulatie scenario moet precies hetzelfde zijn als het fysieke gedeelte | Must Have|
|SD_F04| De code moet leesbaar zijn door gebruik van duidelijke functienamen, variabelen en documentatie (ISO 25010 - Usability & Maintainability| Must Have|
|SD_F05| De code moet uitbreidbaar zijn voor toekomstige ontwikkeling (ISO 25010 - Modifiability) | Must Have |
|SD_F06| De code moet onderhoudbaar zijn doormiddel van coding standaarden en principes (SOLID, ICE, etc) (ISO 25010 - Maintainability) | Must Have|
|SD_F07| Unit testen voor business rules (Domein) | Should Have|
|SD_F09| Parameter gegevens en score moeten worden opgeslagen | Could Have|
|SD_F| | |

## Cybersecurity & Cloud

| Nummer     | Beschrijving                                                                                 | Prioriteit   |
|------------|----------------------------------------------------------------------------------------------|--------------|
| CSC_F01    | De cloudomgeving kan berichten ontvangen van zowel de fysieke robots als de we site          | Must have    |
| CSC_F02    | De cloudomgeving heeft een uptime van minimaal 95%                                           | Must have    |
| CSC_F03    | Data uit simulaties en fysieke robots wordt veilig opgeslagen in de database                 | Must have    |
| CSC_F04    | De cloudomgeving kan real-time data doorsturen naar de website                               | Must have    |
| CSC_F05    | Studenten kunnen vanuit huis de website bereiken en benaderen                                | Must have    |
| CSC_F06    | Data privacy wordt gegarandeerd: geen persoonsgegevens worden opgeslagen                     | Must have    |
| CSC_F07    | Toegang tot de cloudomgeving kan gemonitord worden                                           | Should have  |
| CSC_F08    | Beveiliging tegen ongeautoriseerde toegang is aanwezig                                       | Should have  |
| CSC_F09    | Mogelijkheid om alerts te versturen bij storingen of fouten in het systeem                   | Could have   |
| CSC_F10    | Cloud kan updates en patches automatisch doorvoeren zonder downtime                          | Could have   |
