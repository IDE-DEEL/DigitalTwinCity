``Tussen backticks als deze staan cues voor het invulling geven aan de topics. Verwijder ze uiteindelijk. Dit ontwikkeldocument is bedoeld als overdrachtsdocument en naslagwerk, voor de opdrachtgever, voor eventuele toekomstige teams die verder werken aan het product, maar ook tijdens de ontwikkeling voor het huidige team. Probeer de huidige staat van de ontwikkeling altijd zo goed mogelijk gesynct te houden met het ontwikkeldocument, zodat die ook helder is voor alle teamleden. Belangrijke Tip: Een valkuil om op verdacht te zijn, is dat het ontwikkeldocument een losse verzameling van ingevulde hoofdstukjes wordt. Dat willen we dus niet. Er dient overal voldoende en heldere tekst toegevoegd te zijn die logica en samenhang (zoals tussen de opeenvolgende hoofdstukken, of voor wat betreft gemaakte keuzes) uitlegt. Tot en met het ontwerp moet het zonder extra mondelinge toelichting duidelijk, samenhangend en makkelijk leesbaar zijn voor een gemiddelde persoon met slechts lichte it-kennis. Een deel van de ontwikkeldocumentatie is afgesplitst van dit document: documentatie t.a.v. het ontwerp en realisatie van het web-subysteem (flask, mongodb, html, css, javascript) is afgesplitst in een apart, ietwat ander type ontwikkeldocument. Ander belangrijk ding: gebruik alleen links naar publieke websites of relatieve links (dus binnen de team-repo, NIET naar je persoonlijke repo), zodat uiteindelijk uit de team-repo een zip gemaakt kan worden voor de opdrachtgever, waarvan de links (nog) werken.``

Zie [plantuml tutorial in S3](https://github.com/HU-TI-DEV/TI-S3/blob/main/software/modelleren/plantuml/README.md) voor de tutorial in S3 ove plantuml. 

# Ontwikkeldocument Project ``projectnaam``

Versie ``bla.bla.bla``
Team ``naam``

## Inhoudsopgave

- [Ontwikkeldocument Project ``projectnaam``](#ontwikkeldocument-project-projectnaam)
  - [Inhoudsopgave](#inhoudsopgave)
  - [Inleiding](#inleiding)
  - [Leeswijzer](#leeswijzer)
  - [Uitgangspunten](#uitgangspunten)
    - [Systeem Context](#systeem-context)
    - [Identificatie en prioritering van Key Drivers](#identificatie-en-prioritering-van-key-drivers)
  - [Requirements](#requirements)
    - [Functionele Requirements](#functionele-requirements)
    - [Niet-Functionele Requirements](#niet-functionele-requirements)
    - [Constraints](#constraints)
    - [Use Cases](#use-cases)
    - [Activity Diagrammen](#activity-diagrammen)
  - [Ontwerp](#ontwerp)
    - [Functionele decompositie / (sub)systems and interfaces](#functionele-decompositie--subsystems-and-interfaces)
    - [Objectmodellen](#objectmodellen)
      - [Lijst met Objecten](#lijst-met-objecten)
    - [Taakstructurering](#taakstructurering)
      - [Taaksoort en deadline](#taaksoort-en-deadline)
      - [Taken samenvoegen](#taken-samenvoegen)
    - [Klassediagrammen](#klassediagrammen)
    - [STD's](#stds)
  - [Realisatie](#realisatie)
    - [Fysieke View](#fysieke-view)
    - [Code](#code)
    - [Unit Tests](#unit-tests)
    - [Integratie Tests](#integratie-tests)
    - [Eindresultaat](#eindresultaat)
  - [Conclusie en Advies](#conclusie-en-advies)
  - [Appendices](#appendices)
    - [Appendix 1: Mindmaps](#appendix-1-mindmaps)
    - [Appendix 2: Gespreksverslagen](#appendix-2-gespreksverslagen)
      - [Notities bij Kickoff-Meeting](#notities-bij-kickoff-meeting)
    - [Appendix 3: Upgradeonderzoeksverslagen](#appendix-3-upgradeonderzoeksverslagen)
    - [Appendix 4: Referenties](#appendix-4-referenties)

## Inleiding

``Van wie komt de opdracht? Waar gaat de opdracht in hoofdlijnen over? Leg verder uit dat dit document bedoeld is om op heldere wijze overzicht en samenhang te geven voor het team tijdens het werken aan het project, en na afloop als overdrachts-document voor eventuele follow-ups.``

## Leeswijzer

``leg uit wat er in de hoogste-niveau-hoofdstukken wordt behandeld en hoe deze onderwerpen met elkaar in verband staan``

## Uitgangspunten

``Leg uit dat dit hoofdstuk de uitgangspunten voor de requirements inventariseert. Verwijs naar een appendix met genoteerde input (verslag van speech, gespreksverslagen) van de opdrachtgever - (de echte, tijdens de kickoff-meeting of diens vervanger (Marius,Bart) erna) ``

### Systeem Context

Dit project richt zich op het opzetten van betrouwbare communicatie tussen de **robot** en een **backend**. De robot verstuurt statusinformatie, telemetrie en (waar nodig) logs naar de backend en kan vanuit de backend commando’s en configuratie-updates ontvangen. De backend fungeert als centrale laag voor verwerking, opslag en doorsturing van robotdata naar overige systemen (bijv. dashboards, monitoring of integraties). Belangrijke aandachtspunten binnen deze context zijn **veiligheid (authenticatie/authorisatie)**, **betrouwbaarheid bij wegvallende verbindingen**, **berichtformaten & versiebeheer**, en **observability** (logging/metrics) om communicatieproblemen snel te kunnen diagnosticeren.

### Identificatie en prioritering van Key Drivers

``Voor semester 3 beperken we ons tot 3 stakeholders: opdrachtgever, klant en gebruiker. Geef middels een tabel een overzicht van de key drivers weer. Belangrijkere key drivers staan hoger in de tabel. Er is ook een kolom die aangeeft voor welke stakeholder het van toepassing is, en een kolom voor omschrijving. Licht de ordening van de key drivers toe in de begeleidende tekst.``

## Requirements

``leg uit hoe de requirements opgesteld worden door de samenhang te verwoorden van de onderwerpen uit de sub-hoofdstukken.``

### Functionele Requirements
#### FR communicatie

| Naam                | ``FR C01 - Communicatie opzetten``                                                          |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Omschrijving        | De robot moet kunnen verbinden met en internet en kunnen worden aangemeld op de mqtt server |
| Rationale           |                                                                                             |
| Business prioriteit | Must have                                                                                   |

| Naam                | `FR C02 - Multi-robot identificatie & adressering`                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Omschrijving        | Het systeem moet meerdere robots uniek kunnen identificeren en per robot aparte MQTT topics/kanalen kunnen gebruiken. |
| Rationale           | Voorkomt dat commando’s/data van verschillende robots door elkaar lopen en maakt gerichte aansturing mogelijk.        |
| Business prioriteit | Must have                                                                                                             |

| Naam                | ``FR C03 - Aansturing``                                    |
| ------------------- | ---------------------------------------------------------- |
| Omschrijving        | De robot moet aangestuurd kunnen worden vanaf de frontend. |
| Rationale           |                                                            |
| Business prioriteit | Must have                                                  |

| Naam                | ``FR C04 - data feedback``                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Omschrijving        | De robot moet data kunnen sturen naar de backand zodat deze opgeslagen kan worden in de database en kan worden weergegeven op de frontend. |
| Rationale           |                                                                                                                                            |
| Business prioriteit | Must have                                                                                                                                  |

| Naam                | `FR C05 - Verbinding bewaken & automatisch herverbinden`                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Omschrijving        | De robot moet de MQTT/connectiviteit continu bewaken (heartbeat/status) en bij verbindingsverlies automatisch opnieuw verbinden. |
| Rationale           | Zorgt voor betrouwbaarheid tijdens tests en beperkt uitval door tijdelijke netwerkproblemen.                                     |
| Business prioriteit | Must have                                                                                                                        |

| Naam                | `FR C06 - Security (authenticatie + encryptie)`                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Omschrijving        | De communicatie tussen robot, backend en MQTT broker moet beveiligd zijn met authenticatie en versleuteling. |
| Rationale           | Voorkomt ongeautoriseerde toegang en manipulatie van robots/telemetrie.                                      |
| Business prioriteit | Must have                                                                                                    |

| Naam                | `FR C07 - Configuratie op afstand (parameters updaten)`                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Omschrijving        | De robot moet configuratieparameters (bijv. snelheid-limieten, update-frequentie, topic-namen) op afstand kunnen ontvangen en toepassen via de communicatie-laag. |
| Rationale           | Maakt snelle iteratie tijdens testen mogelijk zonder telkens fysiek in te grijpen.                                                                                |
| Business prioriteit | Should have                                                                                                                                                       |

| Naam                | `FR C8 - Rate limiting & flood protection`                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Omschrijving        | De communicatie-laag moet rate limiting toepassen op commando’s en telemetrie om overbelasting van robot, broker of netwerk te voorkomen. |
| Rationale           | Voorkomt vertragingen/packet loss wanneer meerdere robots tegelijk veel data sturen.                                                      |
| Business prioriteit | Could have                                                                                                                                |
#### Navigatie en Robotgedrag

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

#### Simulatie en Logica

| Nummer | Beschrijving                                                                                                                       | Prioriteit  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| FR_S01 | De simulatie kan worden uitgevoerd via de webomgeving                                                                              | Must have   |
| FR_S02 | Gebruikers kunnen parameters instellen in de webinterface                                                                          | Must have   |
| FR_S03 | De simulatieomgeving weerspiegelt de fysieke omgeving één-op-één (duidelijke koppeling fysiek ↔ digitaal)                          | Must have   |
| FR_S04 | De code is leesbaar door gebruik van duidelijke functienamen, variabelen en documentatie (ISO 25010 - Usability & Maintainability) | Must have   |
| FR_S05 | De code is uitbreidbaar voor toekomstige ontwikkeling (ISO 25010 - Modifiability)                                                  | Must have   |
| FR_S06 | De code is onderhoudbaar volgens coding standaarden en principes (SOLID, ICE, etc.) (ISO 25010 - Maintainability)                  | Must have   |
| FR_S07 | Er zijn unit tests voor business rules, bijvoorbeeld het berekenen van snelheid                                                    | Should have |
| FR_S08 | De website toont resultaten zoals een score of prestatie-indicatoren op basis van simulatie-uitkomsten                             | Should have |
| FR_S09 | Parametergegevens en scores worden opgeslagen voor latere analyse                                                                  | Should have |

#### Cloud en Beveiliging

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


### Niet-Functionele Requirements

| Naam                | ``NFR C01 - Locatie update``                           |
| ------------------- | ------------------------------------------------------ |
| Omschrijving        | De robot stuurt minimaal 1x per seconden zijn locatie. |
| Rationale           | Zo is altijd bekend waar de robot zich bevind.         |
| Business prioriteit | Must have                                              |
#### Navigatie en Robotgedrag

| Koppeling | Nr | Beschrijving |
|------------|----|---------------|
| FR_N01 | NFR_N1.1 | De robot blijft binnen een afwijking van **±2 cm** van de lijn. |
| FR_N02 | NFR_N2.1 | De robot stuurt minimaal **1x per seconde** een signaal van zijn huidige locatie. |
| FR_N02 | NFR_N2.2 | De robot stuurt signalen via **MQTT**. |
| FR_N03 | NFR_N3.1 | De robot kan stabiel rijden op rotondes en in vier richtingen sturen met een foutmarge kleiner dan **5°**. |
| FR_N04 | NFR_N4.1 | De afstandssensoren detecteren obstakels binnen **10 cm**. |
| FR_N04 | NFR_N4.2 | De robot stopt automatisch als een obstakel binnen **5 cm** komt. |
| FR_N05 | NFR_N5.1 | Het route-algoritme bepaalt de optimale route binnen **3 seconden**. |
| FR_N06 | NFR_N6.1 | De RFID-scanner bevindt zich aan de onderzijde van de robot voor optimale detectie. |
| FR_N06 | NFR_N6.2 | Wanneer de robot over een RFID-tag rijdt, wordt deze **3 seconde** gereserveerd. |
| FR_N07 | NFR_N7.1 | Een gereserveerd baanvlak wordt vrijgegeven als het niet binnen **3 seconde** opnieuw wordt gescand. |
| FR_N08 | NFR_N8.1 | De robotsoftware is modulair opgebouwd zodat extra sensoren en toepassingen eenvoudig kunnen worden toegevoegd. |
| FR_N09 | NFR_N9.1 | De robot weet waar andere robots zich bevinden met een nauwkeurigheid van **≤5 cm**. |
| FR_N09 | NFR_N9.2 | Robots kunnen hun route aanpassen op basis van de realtime locatie van andere robots. |

---

#### Simulatie en Logica

| Koppeling | Nr | Beschrijving |
|------------|----|---------------|
| FR_S01 | NFR_S1.1 | De webpagina toont een laadscherm totdat de simulatie volledig is geladen (geen blanco scherm). |
| FR_S02 | NFR_S2.1 | Gebruikersparameters kunnen **real-time** worden aangepast zonder herstart van de simulatie. |
| FR_S03 | NFR_S3.1 | Minimaal **80% van de testers** beoordeelt de overeenkomst tussen fysiek en digitaal model met een score van **8 of hoger**. |
| FR_S04 | NFR_S4.1 | Code is leesbaar volgens interne richtlijnen (namen, indents, documentatie consistent). |
| FR_S05 | NFR_S5.1 | Nieuwe functionaliteiten kunnen worden toegevoegd zonder bestaande functies te breken. |
| FR_S06 | NFR_S6.1 | Code is onderhoudbaar door toepassing van **SOLID-principes** en modulaire structuur. |
| FR_S07 | NFR_S7.1 | Unit tests dekken minimaal **75% van de business rules**. |
| FR_S09 | NFR_S9.1 | Parametergegevens en scores worden persistent opgeslagen. |

---

#### Cloud en Beveiliging

| Koppeling | Nr        | Beschrijving                                                                                            |
| --------- | --------- | ------------------------------------------------------------------------------------------------------- |
| FR_C01    | NFR_C1.1  | De cloud verwerkt berichten binnen **3 seconden** na ontvangst.                                         |
| FR_C01    | NFR_C1.2  | De cloud kan minimaal **30 berichten per seconde** parallel verwerken.                                  |
| FR_C02    | NFR_C2.1  | De cloud heeft een uptime van minimaal **95% per maand**.                                               |
| FR_C03    | NFR_C3.1  | Alle data wordt opgeslagen met **AES-256 encryptie**.                                                   |
| FR_C04    | NFR_C4.1  | Data-updates van cloud naar website hebben een maximale vertraging van **3 seconden**.                  |
| FR_C04    | NFR_C4.2  | Communicatie tussen robots en cloud verloopt via **MQTT**.                                              |
| FR_C05    | NFR_C5.1  | De website laadt volledig binnen **3 seconden** bij een standaard internetverbinding.                   |
| FR_C06    | NFR_C6.1  | Alle verzamelde data wordt **anoniem** opgeslagen (geen namen, e-mails of ID’s).                        |
| FR_C07    | NFR_C7.1  | Toegang tot de cloud wordt gelogd met **timestamp** en **sessie-ID**.                                   |
| FR_C08    | NFR_C8.1  | Alle communicatie verloopt via **HTTPS/TLS**.                                                           |
| FR_C08    | NFR_C8.2  | Firewall en inputvalidatie beschermen tegen ongeautoriseerde toegang.                                   |
| FR_C09    | NFR_C9.1  | Alerts worden binnen **5 minuten** verzonden bij storingen of fouten.                                   |
| FR_C10    | NFR_C10.1 | Updates en patches worden uitgevoerd met maximaal **30 minuten downtime**, bij voorkeur in het weekend. |

### Constraints

| Naam         | ``C02 - Gebruik MQTT``                  |
| ------------ | --------------------------------------- |
| Omschrijving | Het systeem moet mqtt gebruiken.        |
| Rationale    | Dit is al opgezet door de vorige groep. |

### Use Cases

`` Een of meerdere use case diagram(men) met bijbehorende use case beschrijvingen ``

| Naam           | ``UC04 - Lamp Selecteren``                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actor          | ``gebruiker``                                                                                                                                                                                                                              |
| Samenvatting   | ``evt. een beschrijving, voor zover de naam het niet al voldoende dekt``                                                                                                                                                                   |
| Preconditie    | ``alleen voor zover niet triviaal. typisch alleen nodig indien onderdeel van een parent-usecase, bijvoorbeeld "Lamp Selectie Menu" is geselecteerd in het hoofdmenu``                                                                      |
| Scenario       | ``voorbeeld van een typische volgorde van interacties, bij voorkeur geschreven vanuit het gezichtspunt van het systeem.``                                                                                                                  |
| Scenario 2     | ``... indien nodig additionele``                                                                                                                                                                                                           |
| Invariant      | ``Iets waarvoor het systeem voortdurend zorgt, waardoor dat niet steeds herhaald hoeft te worden. (kan soms van toepassing zijn. Bijvoorbeeld: 'ten alle tijde kan "apply" worden geselecteerd om aangepaste eigenschappen op te slaan')`` |
| Postconditie   | ``alleen voor zover niet triviaal. typisch alleen indien onderdeel van parent-usecase. bijvoorbeeld teruggekeerd naar het parent menu``                                                                                                    |
| Uitzonderingen | ``alleen als er tijdens het scenario iets gebeurt wat niet in lijn is met de oorspronkelijke bedoeling van de usecase.``                                                                                                                   |

### Activity Diagrammen

`` Voor belangrijke, wat complexere usecases kan het extra verduidelijking opleveren om er SysML - activity diagrammen bij te maken. ``

## Ontwerp

``leg uit hoe het ontwerp volgt door het volgen van de stappen die in de sub-hoofdstukken worden behandeld en hoe deze onderwerpen met elkaar in verband staan``

### Functionele decompositie / (sub)systems and interfaces

`` Geef met een functionele decompositie van het systeem grafisch weer hoe de verschillende functies (uit de functionele requirements) van het systeem met elkaar samenhangen. Dat geeft goede handvaten voor de decompositie van software en hardware verder op de rit. ``

### Objectmodellen

`` Ontwerp, uitgaande van use case beschrijvingen en activity diagrammen, de delen van het objectmodel die dat kunnen waarmaken. Beperk de interactie met het web-subsysteem tot een enkel object (een web proxy object oid). Een gedetailleerde uitwerking van het web-subsysteem is in een apart ontwikkeldocument te vinden.``

#### Lijst met Objecten

`` Voeg elk object uit de objectmodellen toe in de "lijst met objecten" Let op dat de beschrijvingen niet de relatie tussen de objecten duiden, maar louter wat objecten "los bekeken" doen. Dus niet: InstelControl stuurt een signaal naar .. Maar Instelcontrol is de "dirigent" van de usecase "Instellen" (meteen link toevoegen naar die usecase).``

| Object Naam   | Stereotype | Beschrijving                                                    |
| ------------- | ---------- | --------------------------------------------------------------- |
| InstelControl | Control    | "Dirigent" van de use case "Instellen" (zie use case Instellen) |
| Display       | Boundary   | Stuurt display hardware aan.                                    |
| etc..         |            |                                                                 |

### Taakstructurering

``leg uit wat het doel is van taakstructurering en hoe de deelstappen (sub-hoofdstukken) samen dat doel reliseren``

#### Taaksoort en deadline

`` Maak een tabel die per object taaksoort, deadline, periode en prioriteit weergeeft. Belangrijk: Deadline is zo lang mogelijk waarbij het nog net geen irritatie oplevert. Deadline <= Periode, Prioriteit is omgekeerd evenredig met deadline ``

| Object Naam   | Taaksoort     | Periode | Deadline | Prioriteit |
| ------------- | ------------- | ------- | -------- | ---------- |
| InstelControl | Demand Driven |         | 30ms     | 1          |
| PlusKnop      | Periodiek     | 60ms    | 60ms     | 2          |
| etc..         |               |         |          |            |

#### Taken samenvoegen

`` Maak een tabel waarin je laat zien welke objecten een eigen taak hebben en van welke de taken worden samenvoegd in een enkele "Taak". Noem in het laatste geval het object (bijvoorbeeld een handler) dat eigenaar wordt van die Taak als eerste.``

| Taak Naam  | Object Naam                            | Taaksoort     | Periode | Deadline | Prioriteit |
| ---------- | -------------------------------------- | ------------- | ------- | -------- | ---------- |
| InstelTaak | InstelControl                          | Demand Driven |         | 30ms     | 1          |
| ButtonTaak | <u>ButtonHandler</u> PlusKnop, MinKnop | Periodiek     | 60ms    | 60ms     | 2          |
| etc..      |                                        |               |         |          |            |

### Klassediagrammen

`` Ontwerp, uitgaande van de objectmodellen de bijbehorende klassediagrammen. Vergroot eventueel in latere verbeteringsronden de herbruikbaarheid en het gebruiksgemak van de klassen door het toepassen van geschikte Design Patterns of templating. Voeg de klassen ook toe in de Requirements Traceability diagrammen zodat duidelijk is welke requirements de klasse adresseert``

### STD's

``Ontwerp voor elke Taak de STD van de bijbehorende klasse(n), indien van toepassing vanuit activity diagram of usecase beschrijving, protocol of anderszins. Belangrijk: alle toestanden moeten gerepresenteerd worden in het diagram. Code zonder toestanden en zonder directe invloed op de flow tussen de toestanden kunnen gerepresenteerd worden door calls naar helper-functies. Vergeet niet bovenaan een geschikte STD-interface toe te voegen``

## Realisatie

``leg uit waarin de realisatie zich onderscheidt van het ontwerp, en noem kort de rollen van de subhoofdstukken``

### Fysieke View

``Ontwerp de fysieke decompositie (een SysML Bdd). (de functionele decompositie biedt daarvoor meestal goede aanknopingspunten). Verduidelijk fysieke compositie-relaties middels "Constraints" (NB: dat zijn in dit geval gekwantificeerde ontwerpkeuzes die zowel uit de eerdere constraints als de niet-functionele requirements bestaan.``

### Code

``Ontwerp vanuit de STD's de bijbehorende code. Geef waar nodig additionele toelichting. Voeg per STD een link toe naar de betreffende code in de team repo. Voeg ook links naar de overige code toe``

### Unit Tests

``Voeg in dit hoofdstuk sub-hoofdstukken toe met Unit Tests, elk bestaande uit een Testplan, een link naar de testcode, een samenvatting van de bevindingen van de meest recente uitvoer van die test en een link naar een bestand met die meest recente test-output.``

### Integratie Tests

``Voeg in dit hoofdstuk sub-hoofdstukken toe met Integratie Tests, elk bestaande uit een Testplan, een link naar de testcode, een samenvatting van de bevindingen van de meest recente uitvoer van die test en een link naar een bestand met die meest recente test-output. Belangrijke integratie-tests zijn uiteraard ook de tests van het complete product. Hoe goed doet het product wat het moet doen?``

``Verder zou je in dit hoofdstuk Realisatie ook subhoofdstukken kunnen opnemen met : beslissingstabellen, waarin gemaakte realisatiekeuzes worden verantwoord, Failure Mode Effect Analyses, en andere realisatie gerelateerde overwegingen.``

### Eindresultaat

`` Nog eens op een rijtje de behaalde functionaliteiten en de performance. ``

## Conclusie en Advies

`` Reflecteer op in welke mate de aanvankelijk opgestelde requirements daadwerkelijk zijn behaald. Geef goed onderbouwde aanbevelingen t.a.v. mogelijke toekomstige doorontwikkeling.`` 

## Appendices

### Appendix 1: Mindmaps

`` Bijvoorbeeld voorafgaand aan het maken van het systeem context diagram is een mooi moment om met zijn allen een mindmap te maken die een samenhang duidt van alles wat je als team maar kunt bedenken in relatie tot het systeem. ``

### Appendix 2: Gespreksverslagen

#### Notities bij Kickoff-Meeting

``... etc``

### Appendix 3: Upgradeonderzoeksverslagen

``zet hier een lijst met links naar de upgradeonderzoeksverslagen. Licht het toe met wat tekst met de belangrijkste samenvatttingen ervan.``

### Appendix 4: Referenties

`` lijst 3rd party materiaal waar naar verwezen is. Boeken, site-links.``

`` Verder mogelijk nog appendices over: de geschiedenis van de ontwikkeling van het product in grote lijnen (inclusief inmiddels afgeschoten tussenproducten), over het opzetten van de ontwikkelomgevingen, over hoe te debuggen. Houdt het bij samenvattende dingen. Lange teksten (zoals testuitvoer) niet in de appendices maar via links naar bestanden opnemen.``
