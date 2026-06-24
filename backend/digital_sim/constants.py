# --- --- --- --- --- --- --- --- --- --- ---
# Simulation start payload keys
# General simulation properties
CAR_TARGET_SPEED_KEY = "carTargetSpeed"
SIMULATION_SPEED_KEY = "simulationSpeed"
HOUSES_ON_ROUTES_KEY = "housesOnRoutes"
MAP_ROWS_KEY = "mapRows"
METERS_PER_TILE = 100

# Car properties
CARS_KEY = "cars"
CAR_MESA_ID_KEY = "mesaId"
CAR_MAIN_ID_KEY = "id"
CAR_MAX_PACKAGES_KEY = "maxPackages"
CAR_ROUTE_NAME_KEY = "routeName"
CAR_ROUTE_WAYPOINTS_KEY = "routeWaypoints"

# Scenario/house properties
SCENARIO_KEY = "scenario"
SCENARIO_NAME_KEY = "name"
SCENARIO_HOUSES_LIST_KEY = "houses"
HOUSE_ID_KEY = "houseInstanceId"
HOUSE_PACKAGE_COUNT_KEY = "expectedPackages"
HOUSE_ROAD_COORDS_KEY = "roadCoords"
HOUSE_ROUTE_NAMES_LIST_KEY = "routeNames"
# --- --- --- --- --- --- --- --- --- --- ---

# Simulation update frequency
UPDATES_PER_SECOND = 10
DELTA_TIME_PER_STEP_IN_SECONDS = 1.0 / UPDATES_PER_SECOND

# Coordinate indices for waypoints
X_COORD_KEY = "x"
Y_COORD_KEY = "y"

# Packages
PACKAGE_DELIVERY_TIME_IN_SECONDS = 1.0
PACKAGE_PICKUP_TIME_IN_SECONDS = 0.5

# Car speed
CAR_SPEED_SCALE = 0.7

# --- --- --- --- --- --- --- --- --- --- ---
# Mesa DataCollector reporter keys
# Agent property keys
AGENT_STATUS_KEY = "status"
AGENT_POSITION_KEY = "position"
AGENT_IS_OUT_OF_LANE_KEY = "is_out_of_lane"
AGENT_DISTANCE_TRAVELLED_KEY = "distance_travelled"
AGENT_DISTANCE_TRAVELLED_KM_KEY = "distance_travelled_km"
AGENT_STATE_OF_CHARGE_KEY = "state_of_charge"
AGENT_PACKAGES_DELIVERED_KEY = "packages_delivered"
AGENT_PACKAGES_IN_CARGO_COUNT_KEY = "packages_in_cargo_count"
AGENT_DEPOT_LOAD_COUNT_KEY = "depot_load_count"
AGENT_TIME_DRIVING_SECONDS_KEY = "time_driving_seconds"
AGENT_TIME_DELIVERING_SECONDS_KEY = "time_delivering_seconds"
AGENT_TIME_PARKED_SECONDS_KEY = "time_parked_seconds"
AGENT_TIME_LOADING_PACKAGES_SECONDS_KEY = "time_loading_packages_seconds"

# Model property keys
MODEL_TOTAL_PACKAGES_IN_SCENARIO_KEY = "total_packages_in_scenario"
MODEL_TOTAL_PACKAGES_UNDELIVERED_KEY = "total_packages_undelivered"

# Numeric agent reporter keys (for rounding in CSV export)
NUMERIC_AGENT_REPORTER_KEYS = [
    AGENT_DISTANCE_TRAVELLED_KEY,
    AGENT_TIME_DRIVING_SECONDS_KEY,
    AGENT_TIME_DELIVERING_SECONDS_KEY,
    AGENT_TIME_PARKED_SECONDS_KEY,
    AGENT_TIME_LOADING_PACKAGES_SECONDS_KEY,
]
# --- --- --- --- --- --- --- --- --- --- ---
