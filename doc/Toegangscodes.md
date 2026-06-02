# Tijdelijke toegangscodes

## Doel

De DEEL Digital Twin omgeving kan worden gebruikt door studenten en bezoekers zonder vast account. Een beheerder maakt hiervoor tijdelijke toegangscodes aan. Met zo'n code kan een gebruiker tijdelijk inloggen en toegang krijgen tot de omgeving.

## Beheer door beheerder

Beheerders gebruiken het adminpaneel op `/admin` om toegangscodes te beheren. Na het inloggen als beheerder kan een beheerder:

- een nieuwe toegangscode aanmaken met een naam en vervaltijd;
- actieve, verlopen en ingetrokken codes bekijken;
- een bestaande code intrekken;
- de vervaltijd van een bestaande code verlengen;
- codes verwijderen uit het beheerderoverzicht.

Alle beheeracties lopen via de beveiligde admin-endpoints onder `/api/v1/admin/access-codes`. Deze endpoints vereisen een geldig admin-token met de rol `admin`.

## Aanmaken van codes

Bij het aanmaken voert de beheerder een herkenbare naam en een vervaltijd in. De backend genereert daarna zelf de ruwe toegangscode in het formaat `XXXXX-XXXXX`, waarbij de codegroepen alleen hoofdletters en cijfers bevatten. Deze ruwe code wordt eenmalig teruggegeven aan de frontend, zodat de beheerder de code kan delen met studenten of bezoekers.

De ruwe toegangscode wordt niet leesbaar opgeslagen. Alleen een bcrypt-hash van de code staat in de database. Daardoor kan een bestaande code later wel worden gecontroleerd, maar niet opnieuw worden uitgelezen.

## Inloggen met tijdelijke code

Gebruikers voeren hun tijdelijke code in op `/login`. De backend controleert of:

- de code bestaat;
- de code niet is verlopen;
- de code niet handmatig is ingetrokken.

Bij een geldige code krijgt de gebruiker een JWT-sessie. De vervaltijd van die sessie is gelijk aan de vervaltijd van de toegangscode. Zodra de code verloopt, verloopt de sessie dus ook.

Bij een ongeldige, verlopen of ingetrokken code krijgt de gebruiker een duidelijke foutmelding en wordt er geen toegang verleend.

## Automatisch verlopen van toegang

De frontend controleert bij navigatie of het opgeslagen JWT-token nog geldig is. Als het token verlopen is, worden de lokale sessiegegevens verwijderd en wordt de gebruiker teruggestuurd naar `/login`.

Daarnaast plant de frontend na het laden van een geldige sessie een automatische logout op basis van de `exp`-waarde in het token. Hierdoor vervalt toegang ook wanneer de gebruiker op dezelfde pagina blijft staan.

## Logging

De backend logt belangrijke beheeracties, zoals het aanmaken, intrekken, verlengen en verwijderen van toegangscodes. Ook mislukte en succesvolle inlogpogingen met tijdelijke codes worden gelogd.
