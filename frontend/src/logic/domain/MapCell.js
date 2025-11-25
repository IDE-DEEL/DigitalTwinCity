import { normalizeDegree } from '../utils/rotation.js';
/**
     * Creëert een MapCell object.
     * Dit object combineert layoutdata (map.json) en definitiedata (components.json).
     * * @param {number} x  X coördinaat.
     * @param {number} y  Y coördinaat.
     * @param {object} rawMapItem  Item uit map.json.
     * @param {object} componentDefinition  Definitie uit components.json.
     */
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