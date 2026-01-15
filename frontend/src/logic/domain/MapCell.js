import { rotation } from '../utils/rotation.js';
import { MapComponent } from './mapComponent.js';

export class MapCell {
    
    constructor (x, y, rawMapItem, componentDefinition) {
        this.x = x;
        this.y = y;
        this.key = `${x}-${y}`;
        
        this.type = rawMapItem.type;
        this.rotation = normalizeDegree(rawMapItem.rotation || 0);
        this.label = componentDefinition.label;
        this.imagePath = componentDefinition.imagePath;

        // belangrijk voor het connecten van paden
        this.pathConnections = componentDefinition.pathConnections || []; 
    }

    /**
     * helper om te controleren of de cel een weg is.
     * @returns {boolean}
     */
    get isRoad() {
        return this.type !== 'empty'; 
    }
}