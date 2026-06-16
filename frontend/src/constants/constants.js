// map dimensions
export const MAP_COLUMNS = 7;           // X range: 0-6
export const MAP_ROWS = MAP_COLUMNS;    // Y range: 0-6

// map tiles
export const DEPOT_ENTRANCE = { x: 4, y: 6 };
export const DEPOT_EXIT = { x: 6, y: 4 };

// cars
export const MAX_CARS = 5;
export const MIN_CARS = 1;

// car speed
export const MIN_SPEED = "1";
export const MAX_SPEED = "100";

// simulation speeds
export const SIMULATION_SPEED_OPTIONS = [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
];

// custom colors for cars and routes
export const CAR_ROUTE_COLORS = {
    '1': 'blue',
    '2': 'red',
    '3': 'green',
    '4': 'yellow',
    '5': 'purple',
};