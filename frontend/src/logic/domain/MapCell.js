/**
 * Represents a cell in the map grid.
 * Each cell contains a component ID and rotation angle.
 */
export class MapCell {
  constructor(componentId, rotation = 0) {
    this.componentId = componentId;
    this.rotation = rotation;
  }
}
