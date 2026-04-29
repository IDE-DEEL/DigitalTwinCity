import mesa

from backend.digital_sim.domain.car_agent import CarAgent
from backend.digital_sim.domain.route import Route
from backend.digital_sim.constants import CAR_ROUTE_NAME_KEY, CAR_ROUTE_WAYPOINTS_KEY


class CarModel(mesa.Model):

    def __init__(self, cars: list[dict], car_target_speed: int, rng=None):
        super().__init__(rng=rng)

        self.num_agents = len(cars)
        self.step_count = 0
        self.car_target_speed = car_target_speed / 100
        self.routes = {}
        
        self._setup_cars_and_routes(cars, self.car_target_speed)
    
    def step(self):
        self.agents.shuffle_do("step")
        self.step_count += 1
    
    def get_agents_status(self):
        """
        Get the current status of all agents.
        
        Returns:
            List of dictionaries containing agent status (id, position, speed, finished)
        """
        agents_status = []
        for agent in self.agents:
            agents_status.append({
                "id": agent.unique_id,
                "position": agent.position,
                "heading_radial": agent.heading,
                "heading_deg": agent.heading_deg,
                "target_speed": agent.target_speed,
                "speed": agent.actual_speed,
                "distance_travelled": agent.distance_travelled,
                "finished": agent.is_finished
            })
        return agents_status

    def _setup_cars_and_routes(self, cars: list[dict], car_target_speed: int):
        """Create routes and agents based on car settings from frontend."""
        routes_added = set()

        for car in cars:
            route_name = car.get(CAR_ROUTE_NAME_KEY)

            # prevent duplicate route objects
            if route_name not in routes_added:
                waypoints = car.get(CAR_ROUTE_WAYPOINTS_KEY)
                self.routes[route_name] = Route(name=route_name, waypoints=waypoints, houses=[])
                routes_added.add(route_name)
            
            route = self.routes[route_name]
            CarAgent(model=self, car_target_speed=car_target_speed, route=route)