import { computed } from 'vue';
import { MapCell } from '../logic/domain/MapCell';
/**
 * Encapsuleert de logica voor het berekenen van de map styling en componenten.
 * @param {Ref<Array>} mapData  De array van MapCell objecten.
 * @param {Ref<Object>} componentDefinitions  De component lookup tabel.
 * @returns {Object} { gridStyle, mapComponents, getComponentPosition }
 */
const MAP_DIMENSION = 5;
const MAX_MAP_SCALE = 70;

export function mapRenderer(mapData, componentDefinitions) {

    const gridStyle = computed(() => {
        const dynamicSize = `${MAX_MAP_SCALE}vmin`;
        return {
            display: 'grid',
            gridTemplateColumns: `repeat(${MAP_DIMENSION}, 1fr)`,
            gridTemplateRows: `repeat(${MAP_DIMENSION}, 1fr)`,
            width: dynamicSize,
            height: dynamicSize,
            maxWidth: '800px',
            maxHeight: '800px',
            border: '2px solid #333',
        };
    });
    
    const mapComponents = computed(() => {
        return mapData.value.map(item => {
            const def = componentDefinitions.value[item.type];
            if (!def) return null;
            return new MapCell(item.x, item.y, item, def);
        }).filter(item => item !== null);    
    });

    const getComponentPosition = (component) => {
        return {
            gridColumnStart: component.x + 1, 
            gridRowStart: component.y + 1,
        };
    };

    return {
        gridStyle,
        mapComponents,
        getComponentPosition
    };
};

