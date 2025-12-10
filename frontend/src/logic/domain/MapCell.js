import { rotation } from '../utils/rotation.js';
import { MapComponent } from './MapComponent.js';

export class MapCell {
    constructor (row, col, rawCell, componentId) {
        this.row = row;
        this.col = col;
        this.key = `${row}-${col}`;
    }
}    