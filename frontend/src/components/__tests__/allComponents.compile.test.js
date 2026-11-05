import { describe, it, expect } from 'vitest';
import { parse, compileTemplate, compileScript } from '@vue/compiler-sfc';

// Vite verwerkt de bronbestanden als tekst. Deze tests vereisen geen browser of DOM.
const sources = import.meta.glob('../**/*.vue', { query: '?raw', import: 'default', eager: true });

const components = [
  "admin/AdminCodeForm.vue",
  "admin/AdminCodeTable.vue",
  "admin/AdminLogin.vue",
  "advanced/AdminPanel.vue",
  "advanced/ControlPanel.vue",
  "advanced/SimulationControls.vue",
  "advanced/SimulationDisplay.vue",
  "advanced/SimulationRunStats.vue",
  "advanced/SimulationTable.vue",
  "advanced/StatisticsModal.vue",
  "advanced/Timer.vue",
  "advanced/TripScore.vue",
  "advanced/VisualizePanel.vue",
  "auth/Login.vue",
  "base/BaseButton.vue",
  "base/DropDown.vue",
  "base/Input.vue",
  "base/RadioGroup.vue",
  "base/Slider.vue",
  "base/Switch.vue",
  "base/Table.vue",
  "layout/LangToggle.vue",
  "layout/TopBar.vue",
  "pages/AdminPage.vue",
  "pages/DigitalTwinPage.vue",
  "pages/SimulationPage.vue",
  "status/WebSocketStatus.vue",
  "visualization/BarChart.vue",
  "visualization/Car.vue",
  "visualization/HouseLabelsOverlay.vue",
  "visualization/RoutePolyline.vue",
  "visualization/TagsVisualizer.vue"
];

describe('Vue componenten: syntaxis en template-compilatie', () => {
  it.each(components)('%s compileert zonder template- of scriptfouten', (name) => {
    const filename = `../${name}`;
    const source = sources[filename];
    expect(source, `Ontbrekend component: ${filename}`).toBeTypeOf('string');
    const { descriptor, errors } = parse(source, { filename });
    expect(errors).toEqual([]);
    expect(descriptor.template, `${name} mist een template`).toBeTruthy();
    expect(descriptor.script || descriptor.scriptSetup, `${name} mist een script`).toBeTruthy();
    const result = compileTemplate({
      source: descriptor.template.content,
      filename,
      id: `fe06-${name.replace(/[^a-z0-9]/gi, '-')}`,
    });
    expect(result.errors).toEqual([]);
    // Compileer de setup-code ook: controleert onder meer defineProps/defineEmits.
    if (descriptor.scriptSetup) {
      expect(() => compileScript(descriptor, { id: `fe06-${name.replace(/[^a-z0-9]/gi, '-')}` })).not.toThrow();
    }
  });
});

describe('Kritieke UI-contracten', () => {
  it('SimulationControls heeft start, stop, pauze en reset-acties', () => {
    const s = sources['../advanced/SimulationControls.vue'];
    for (const event of ["'start'", "'stop'", "'pause'", "'reset'"]) expect(s).toContain(event);
    for (const handler of ['@click="start"', '@click="stop"', '@click="pause"', '@click="reset"']) expect(s).toContain(handler);
  });
  it('WebSocketStatus biedt reconnect en respecteert cooldown', () => {
    const s = sources['../status/WebSocketStatus.vue'];
    expect(s).toContain("defineEmits(['reconnect'])");
    expect(s).toContain(':disabled="reconnectCooldown"');
    expect(s).toContain("$emit('reconnect')");
  });
  it('SimulationDisplay heeft een laad- en foutpad', () => {
    const s = sources['../advanced/SimulationDisplay.vue'];
    expect(s).toContain('isLoading');
    expect(s).toContain('mapError');
    expect(s).toContain('onMounted(loadMap)');
  });
  it('de navigatieswitch verwijst naar beide hoofdschermen', () => {
    const s = sources['../base/Switch.vue'];
    expect(s).toContain('to="/digital_twin"');
    expect(s).toContain('to="/simulation"');
  });
});
