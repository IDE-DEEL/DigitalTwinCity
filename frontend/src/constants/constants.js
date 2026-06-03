// map dimensions
export const MAP_COLUMNS = 5;  // X range: 0-5
export const MAP_ROWS = 4;     // Y range: 0-4

// map tiles
export const DEPOT_TILE = { x: 4, y: 2 };

// identifiers for different houses on the same tile (irrelevant with the current map)
export const HOUSE_POSITION_FIRST = 'A';

// cars
export const MAX_CARS = 5;
export const MIN_CARS = 1;

// simulation speeds
export const SIMULATION_SPEED_OPTIONS = [
    { value: '1x', numericValue: 1 },
    { value: '2x', numericValue: 2 },
    { value: 'Super snel', numericValue: 3 },
];

// custom colors for cars and routes
export const CAR_ROUTE_COLORS = {
    '1': 'blue',
    '2': 'red',
    '3': 'green',
    '4': 'yellow',
    '5': 'purple',
};