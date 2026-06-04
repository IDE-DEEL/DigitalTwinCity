/**
 * Centralized UI labels for all components
 */

const defaultLanguage = 'nl'; // Default language is Dutch
const currentLanguage = document.documentElement.lang || defaultLanguage;

const LABELS = {
  nl: {
    // ControlPanel parameters
    carSpeed: 'Auto snelheid',
    scenario: 'Scenario\'s',

    // ControlPanel simulation controls
    simulationSpeed: 'Simulatie snelheid',
    startButton: 'Start',
    stopButton: 'Stop',
  },
};

export function getLabel(key) {
  const langMap = LABELS[currentLanguage] || LABELS[defaultLanguage] || {};
  return langMap[key] || key;
}