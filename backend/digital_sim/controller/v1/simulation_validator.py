from pydantic import BaseModel, Field, field_validator

class Waypoint(BaseModel):
    """Een waypoint met x en y coördinaten"""
    x: float = Field(..., description="X-coordinate")
    y: float = Field(..., description="Y-coordinate")

class Car(BaseModel):
    """Validatie voor een individuele auto"""
    id: int = Field(..., ge=1, le=5, description="ID of the car (1-5)")
    maxPackages: int = Field(..., ge=1, le=25, description="Maximum number of packages the car can carry (1-25)")
    routeName: str = Field(..., min_length=1, description="Name of the route")
    routeWaypoints: list[Waypoint] = Field(..., min_items=1, description="List of waypoints for the route, must contain at least one waypoint")
    
    @field_validator('routeWaypoints', mode='before')
    @classmethod
    def validate_waypoints(cls, v):
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError('routeWaypoints must be a non-empty list of waypoints')
        return v

class Scenario(BaseModel):
    """Validatie voor scenario"""
    name: str = Field(..., min_length=1, description="Name of the scenario")
    houses: list[dict] = Field(..., min_items=1, description="List of houses in the scenario")

class DemoRoute(BaseModel):
    carId: int = Field(..., ge=1, le=5)
    routeName: str = Field(..., min_length=1)
    routeWaypoints: list[Waypoint] = Field(..., min_items=2) 

class SimulationStartPayload(BaseModel):
    demoMode: bool = False
    demoRoutes: list[DemoRoute] = Field(default_factory=list)
    carTargetSpeed: int = Field(..., ge=1, le=100, description="Target speed for the cars (1-100)")
    simulationSpeed: int = Field(..., ge=1, le=4, description="Simulation speed (1=1x, 2=5x, 3=10x, 4=maximum)")
    cars: list[Car] = Field(..., min_items=1, max_items=5, description="List of cars, must contain 1-5 cars")
    scenario: Scenario = Field(..., description="Scenario configuration")
    housesOnRoutes: dict[str, list[str]] = Field(..., description="Dictionary mapping route names to lists of houses on those routes")
    mapRows: int = Field(..., ge=7, le=7, description="Number of rows in the map - used for coordinate conversion (Y-coordinate)")

    @field_validator('cars')
    @classmethod
    def validate_cars_count(cls, v):
        if len(v) > 5:
            raise ValueError('Maximum of 5 cars allowed')
        return v
    
    @field_validator('housesOnRoutes')
    @classmethod
    def validate_houses_on_routes(cls, v):
        if not isinstance(v, dict) or len(v) == 0:
            raise ValueError('housesOnRoutes may not be empty')
        return v
    
    @field_validator('cars')
    @classmethod
    def validate_route_names_match(cls, v, info):
        """Ensure that all route names in cars are present in housesOnRoutes"""
        if 'housesOnRoutes' in info.data:
            route_names_in_houses = set(info.data['housesOnRoutes'].keys())
            route_names_in_cars = {car.routeName for car in v}
            
            # Every car must have a route that is present in housesOnRoutes
            missing_routes = route_names_in_cars - route_names_in_houses
            if missing_routes:
                raise ValueError(f'Routes in cars must be present in housesOnRoutes: {missing_routes}')
        return v
    
class SetSpeedPayload(BaseModel):
    """Validatie voor set_speed command"""
    simulationSpeed: int = Field(..., ge=1, le=4, description="Simulation speed (1=1x, 2=5x, 3=10x, 4=maximum)")