/**
 * Centralized UI labels for all components
 */

const defaultLanguage = 'nl'; // Default language is Dutch
const currentLanguage = document.documentElement.lang || defaultLanguage;

const LABELS = {
  nl: {
    // websocket status
    websocketNotConnected: 'Niet verbonden met server',
    websocketRefresh: '⟳',

    // ControlPanel parameters
    carSpeed: "Auto snelheid",
    scenario: "Scenario's",

    // ControlPanel car table
    tableHeader: "Auto's",
    carId: "Auto ID",
    packages: "Max. pakketten",
    route: "Route",
    route_visibility: "Visualisatie",

    // ControlPanel simulation controls
    simulationSpeed: "Simulatie snelheid",
    startButton: "Start",
    stopButton: "Stop",

    // Statistics modal
    statisticsButton: "Statistieken",
    emptyState: "Geen simulatiedata beschikbaar",
    loadingState: "Simulatiedata laden...",
    statisticsTitle: "Simulatie Statistieken",
    distance: "Afstand",
    drivingTime: "Rij tijd",
    packagesDelivered: "Bezorgde pakketten",
    statsTotals: "Totalen",
    totalDistance: "Totale afstand:",
    totalDrivingTime: "Totale rij tijd:",
    totalPackages: "Totaal bezorgde pakketten:",
    totalsSteps: "Stappen:",
    downloadCsv: "Download CSV",
    downloadingCsv: "Bezig met downloaden...",

    // Misc
    closeButton: "x",
  },
};

export function getLabel(key) {
  const langMap = LABELS[currentLanguage] || LABELS[defaultLanguage] || {};
  return langMap[key] || key;
}