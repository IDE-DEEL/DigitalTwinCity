import { normalizeDegree } from '../utils/rotation.js';

/**
 * Laadt de kaartdata en componentdefinities van de server.
 * @returns {Promise<Object>} Een object met geladen data.
 */
export async function fetchMapData() {

    try{
        const [mapRes, compRes, rfidRes] = await Promise.all([
            fetch('/data/test-map2.json'), 
            fetch('/data/map-components.json'),
            fetch('/data/rfid.json')
        ]);

        const mapData = await mapRes.json();
        const defsArray = await compRes.json();
        const rfidData = await rfidRes.json();
        
        const componentDefinitions = defsArray.reduce((lookup, definition) => {
            lookup[definition.id] = definition;
            return lookup;
        }, {});

        return {
            mapData,
            componentDefinitions,
            rfidData
        };
    } catch (error) {
            console.error("Fout bij laden mapdata in mapService:", error);
            throw new Error("Map data laden mislukt");
        }
}

/**
 * Exporteert de volledige map layout als een georganiseerde 2D structuur.
 * @param {Array} mapData De ruwe map data uit de JSON.
 * @param {Object} componentDefinitions De lookup tabel van definities.
 * @param {number} dimension De dimensie van de kaart.
 * @returns {Array} Een 2D-array van MapCell objecten.
 */
export function createMapGrid(mapData, componentDefinitions, dimension) {
    const grid = Array(dimension).fill(0).map(() => Array(dimension).fill(null));

    mapData.forEach(rawItem => {
        const def = componentDefinitions[rawItem.type];
        if (def && rawItem.x < dimension && rawItem.y < dimension) {
            grid[rawItem.y][rawItem.x] = new MapCell(rawItem.x, rawItem.y, rawItem, def);
        }
    });

    for (let y = 0; y < dimension; y++) {
        for (let x = 0; x < dimension; x++) {
            if (grid[y][x] === null) {
                grid[y][x] = new MapCell(x, y, {type: 'empty', rotation: 0}, {
                    label: 'Empty', imagePath: '', pathConnections: []
                });
            }
        }
    }

    return grid;
}