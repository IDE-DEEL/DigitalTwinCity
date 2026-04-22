import mesa

from backend.digital_sim.domain.car_agent import CarAgent
from backend.digital_sim.domain.route import Route


class CarModel(mesa.Model):

    def __init__(self, car_settings: list[dict], car_speed: int, rng=None):
        super().__init__(rng=rng)

        self.num_agents = len(car_settings)
        self.step_count = 0
        self.car_speed = car_speed
        self.routes = {}
        
        self._setup_cars_and_routes(car_settings, car_speed)
    
    def step(self):
        self.agents.shuffle_do("step")
        self.step_count += 1

    def _setup_cars_and_routes(self, car_settings: list[dict], car_speed: int):
        """Create routes and agents based on car settings from frontend."""
        routes_added = set()

        for car_config in car_settings:
            route_name = car_config.get("routeName")

            # prevent duplicate route objects
            if route_name not in routes_added:
                waypoints = car_config.get("waypoints")
                self.routes[route_name] = Route(name=route_name, waypoints=waypoints, houses=[])
                routes_added.add(route_name)
            
            route = self.routes[route_name]
            CarAgent(model=self, car_speed=car_speed, route=route)