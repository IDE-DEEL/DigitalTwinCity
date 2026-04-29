import mesa

from backend.digital_sim.domain.car_agent import CarAgent
from backend.digital_sim.domain.route import Route
from backend.digital_sim.domain.package import Package, PackageStatus
from backend.digital_sim.domain.house import House
from backend.digital_sim.constants import CAR_ROUTE_NAME_KEY, CAR_ROUTE_WAYPOINTS_KEY, HOUSE_PACKAGE_COUNT_KEY, HOUSE_ID_KEY, HOUSE_ROAD_COORDS_KEY, HOUSE_ROUTE_NAMES_LIST_KEY


class CarModel(mesa.Model):

    def __init__(self, cars: list[dict], car_target_speed: int, scenario_name: str, houses: list[dict], rng=None):
        super().__init__(rng=rng)

        self.num_agents = len(cars)
        self.step_count = 0
        self.car_target_speed = car_target_speed / 100
        self.routes = {}
        self.houses = {}
        self.scenario_name = scenario_name
        
        self._setup_cars_and_routes(cars, self.car_target_speed)
        self._setup_houses(houses or [])
    
    def step(self):
        self.agents.shuffle_do("step")
        self.step_count += 1
    
    def get_simulation_state(self):
        """
        Get the complete state of the simulation including agents and houses with package delivery info.
        
        Returns:
            Dictionary containing:
            - agents: list of agent status
            - houses: list of houses with package delivery statistics
            - step: current simulation step
        """        
        return {
            "step": self.step_count,
            "agents": self._get_agents_status(),
            "houses": self._get_houses_status()
        }

    def _get_agents_status(self):
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
    
    def _get_houses_status(self):
        """List of dictionaries containing house status (id, road_coords, total_packages, delivered_packages, undelivered_packages, package details)"""
        houses_status = []

        for house in self.houses.values():
            delivered_count = sum(1 for pkg in house.packages if pkg.status == PackageStatus.DELIVERED)
            total_count = len(house.packages)
            undelivered_count = total_count - delivered_count
            
            houses_status.append({
                "id": house.id,
                "road_coords": house.road_coords,
                "total_packages": total_count,
                "delivered_packages": delivered_count,
                "undelivered_packages": undelivered_count,
                "packages": [
                    {
                        "id": package.id,
                        "status": package.status.name
                    }
                    for package in house.packages
                ]
            })

        return houses_status

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
    
    def _setup_houses(self, houses: list[dict]):
        """Create house objects and link them to routes and packages."""
        # instantiate houses
        for house_data in houses:
            expected_num_packages = house_data.get(HOUSE_PACKAGE_COUNT_KEY)
            packages = [Package(id=i) for i in range(expected_num_packages)]
            house = House(
                id=house_data.get(HOUSE_ID_KEY),
                packages=packages,
                road_coords=house_data.get(HOUSE_ROAD_COORDS_KEY),
                num_undelivered_packages=len(packages),
            )
            # link house to routes
            for route_name in house_data.get(HOUSE_ROUTE_NAMES_LIST_KEY, []):
                if route_name in self.routes:
                    self.routes[route_name].houses.append(house)
            self.houses[house.id] = house