# INNO-Institute-for-Design-Engineering
Ontwikkelomgeving voor het Innovation project (HU). In samenwerking met het Institute for Design & Engineering.

## Frontend - Simulation Dashboard

De frontend is een Vue.js applicatie die een simulatiedashboard weergeeft met een modulaire kaart van wegcomponenten.

### Vereisten

- Node.js (v18 of hoger)
- npm

### Installatie

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Open de browser op `http://localhost:5173` om de applicatie te bekijken.

### Bouwen

```bash
npm run build
```

### Tests

```bash
npm run test
```

### Structuur

```
frontend/
├── public/
│   ├── assets/           # SVG afbeeldingen voor wegcomponenten
│   │   ├── straight.svg  # Recht wegstuk
│   │   ├── curve.svg     # Bocht
│   │   ├── t_split.svg   # T-splitsing
│   │   ├── cross_split.svg # Kruispunt
│   │   └── roundabout.svg # Rotonde
│   └── data/
│       ├── map-components.json  # Definities van wegcomponenten
│       └── test-map.json        # Test kaart met grid layout
├── src/
│   ├── components/
│   │   ├── SimulationDisplay.vue  # Kaartweergave met rotatie
│   │   ├── ControlPanel.vue       # Bedieningspaneel
│   │   ├── TopBar.vue             # Bovenbalk
│   │   └── BottomBar.vue          # Onderbalk met Start/Stop
│   ├── logic/
│   │   ├── domain/
│   │   │   ├── MapCell.js      # Kaartcel met componentId en rotatie
│   │   │   └── MapComponent.js # Wegcomponent definitie
│   │   ├── service/
│   │   │   └── mapService.js   # Laad kaart en componenten
│   │   └── utils/
│   │       └── rotation.js     # Rotatie hulpfuncties (0/90/180/270°)
│   ├── __tests__/              # Unit tests
│   ├── App.vue
│   └── main.js
└── package.json
```

### Kaart Componenten

De kaart ondersteunt de volgende wegcomponenten:
- **straight** - Recht wegstuk
- **curve** - Bocht (90 graden)
- **t_split** - T-splitsing
- **cross_split** - Kruispunt
- **roundabout** - Rotonde

Elk component kan worden geroteerd met 0, 90, 180, of 270 graden.

### Kaart JSON Formaat

Het `test-map.json` bestand bevat:
- `width` / `height` - Afmetingen van het grid
- `grid` - 2D array van cellen met `componentId` en `rotation`

Voorbeeld:
```json
{
  "width": 8,
  "height": 8,
  "grid": [
    [{"componentId": "straight", "rotation": 90}, ...],
    ...
  ]
}
```
