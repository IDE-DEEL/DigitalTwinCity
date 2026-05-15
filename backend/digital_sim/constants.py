# --- --- --- --- --- --- --- --- --- --- ---
# Payload keys
# General simulation properties
CAR_TARGET_SPEED_KEY = "carTargetSpeed"
SEED_KEY = "seed"
SIMULATION_SPEED_KEY = "simulationSpeed"
HOUSES_ON_ROUTES_KEY = "housesOnRoutes"

# Car properties
CARS_KEY = "cars"
CAR_ID_KEY = "id"
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

# Update frequency
STEPS_PER_SECOND = 20
DELTA_TIME_PER_STEP_IN_SECONDS = 1.0 / STEPS_PER_SECOND

# Coordinate indices for waypoints
X_COORD_IDX = 0
Y_COORD_IDX = 1

# Packages
MIN_DELIVERY_TIME_IN_SECONDS = 5
MAX_DELIVERY_TIME_IN_SECONDS = 10
PACKAGE_DELIVERY_TIME_IN_SECONDS = 1.0
PACKAGE_PICKUP_TIME_IN_SECONDS = 0.5