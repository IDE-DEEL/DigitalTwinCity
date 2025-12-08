import { normalizeDegree } from '../utils/rotation.js';

/**
 * Laadt de kaartdata en componentdefinities van de server.
 * @returns {Promise<Object>} Een object met geladen data.
 */
export async function fetchMapData() {

    try{
        const [mapRes, compRes] = await Promise.all([
            fetch('/data/test-map.json'), 
            fetch('/data/map-components.json')
        ]);

        const mapData = await mapRes.json();
        const defsArray = await compRes.json();
        
        const componentDefinitions = defsArray.reduce((lookup, definition) => {
            lookup[definition.id] = definition;
            return lookup;
        }, {});

        return {
            mapData,
            componentDefinitions
        };
    } catch (error) {
            console.error("Fout bij laden mapdata in mapService:", error);
            throw new Error("Map data laden mislukt");
        }
}