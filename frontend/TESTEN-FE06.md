# FE-06 – Frontend regressietests

De bestaande Vitest/V8-omgeving is hergebruikt. Nieuwe tests staan in `src/stores/__tests__` en `src/composables/__tests__`.

## Lokaal uitvoeren

```bash
npm ci
npm run test
npm run test:coverage
npm run build
```

De testdekking van de hele frontend is nog niet vastgesteld. Een hoog percentage voor één composable is **geen** volledige frontenddekking. Voor Vue-componenttests zijn aanvullende componenttests en mogelijk `@vue/test-utils` nodig.

## Toegevoegde scenario's

- Simulatiestatus: starten, stoppen, resetten, pauze-regressie, verbindingverlies, wijzigingen aan scenario en routes.
- Simulatieparameters: auto-instellingen, zichtbaarheid, payload, lege kaart en kaartstore.
- WebSocket: verbinden, berichten, response handlers, foutmeldingen, disconnect en reconnect.
- Auto-kleuren: bekende en onbekende auto's.

## Vervolg voor 90% dekking

Breid de tests uit met de Digital Twin-store, overige composables, services en Vue-componenten. Meet daarna de dekking van alle relevante bronbestanden en voeg gerichte regressietests toe voor ontbrekende branches.
