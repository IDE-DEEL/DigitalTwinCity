import { MapComponent } from '../domain/MapComponent.js';
import { MapCell } from '../domain/MapCell.js';

/**
 * Loads the map components from the JSON file.
 * @returns {Promise<MapComponent[]>} Array of map components
 */
export async function loadMapComponents() {
  const response = await fetch('/data/map-components.json');
  const data = await response.json();
  return data.components.map(c => new MapComponent(c.id, c.name, c.image));
}

/**
 * Loads a map from a JSON file.
 * @param {string} mapFile - The map file name
 * @returns {Promise<{width: number, height: number, cells: MapCell[][]}>} The map data
 */
export async function loadMap(mapFile = 'test-map.json') {
  const response = await fetch(`/data/${mapFile}`);
  const data = await response.json();
  
  const cells = data.grid.map(row => 
    row.map(cell => new MapCell(cell.componentId, cell.rotation))
  );
  
  return {
    width: data.width,
    height: data.height,
    cells
  };
}

/**
 * Gets a component by its ID from the components list.
 * @param {MapComponent[]} components - Array of map components
 * @param {string} componentId - The component ID to find
 * @returns {MapComponent|undefined} The found component or undefined
 */
export function getComponentById(components, componentId) {
  return components.find(c => c.id === componentId);
}
