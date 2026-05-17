import mesa

from backend.digital_sim.domain.car_agent import CarAgent, CarStatus
from backend.digital_sim.domain.route import Route
from backend.digital_sim.domain.package import Package, PackageStatus
from backend.digital_sim.domain.house import House
from backend.digital_sim.constants import (
    CAR_ROUTE_NAME_KEY, CAR_ROUTE_WAYPOINTS_KEY, CAR_MAX_PACKAGES_KEY, 
    HOUSE_PACKAGE_COUNT_KEY, HOUSE_ID_KEY, HOUSE_ROAD_COORDS_KEY, 
    DELTA_TIME_PER_STEP_IN_SECONDS,
    AGENT_STATUS_KEY, AGENT_DISTANCE_TRAVELLED_KEY, AGENT_PACKAGES_DELIVERED_KEY,
    AGENT_PACKAGES_IN_CARGO_COUNT_KEY, AGENT_DEPOT_LOAD_COUNT_KEY,
    AGENT_TIME_DRIVING_SECONDS_KEY, AGENT_TIME_DELIVERING_SECONDS_KEY,
    AGENT_TIME_PARKED_SECONDS_KEY, AGENT_TIME_LOADING_PACKAGES_SECONDS_KEY,
)


class CarModel(mesa.Model):

    def __init__(self, cars: list[dict], car_target_speed: int, scenario_name: str, houses: list[dict], houses_on_routes: dict = None, rng=None):
        super().__init__(rng=rng)

        self.num_agents = len(cars)
        self.delta_time = DELTA_TIME_PER_STEP_IN_SECONDS
        self.simulation_time = 0.0
        self.car_target_speed = car_target_speed / 100
        self.routes = {}
        self.houses = {}
        self.scenario_name = scenario_name
        
        self._setup_cars_and_routes(cars, self.car_target_speed)
        self._setup_houses(houses or [], houses_on_routes or {})
        
        self.datacollector = mesa.DataCollector(
            agent_reporters={
                AGENT_STATUS_KEY: lambda agent: agent.status.name, # enum name of the agent's status
                AGENT_DISTANCE_TRAVELLED_KEY: "distance_travelled",
                AGENT_PACKAGES_DELIVERED_KEY: "packages_delivered",
                AGENT_PACKAGES_IN_CARGO_COUNT_KEY: "packages_in_cargo_count",
                AGENT_DEPOT_LOAD_COUNT_KEY: "depot_load_count",
                AGENT_TIME_DRIVING_SECONDS_KEY: "time_driving_seconds",
                AGENT_TIME_DELIVERING_SECONDS_KEY: "time_delivering_seconds",
                AGENT_TIME_PARKED_SECONDS_KEY: "time_parked_seconds",
                AGENT_TIME_LOADING_PACKAGES_SECONDS_KEY: "time_loading_packages_seconds",
            }
        )
    
    def step(self):
        """Execute one simulation step.
        
        Executes step for all agents. Each agent autonomously handles:
        - Package pickup (when parked with capacity)
        - Delivery logic (zone detection, delivery countdown)
        - Movement along route
        """
        self.datacollector.collect(self)
        
        self.agents.do("step")

        super().step()
        self.simulation_time += self.delta_time
    
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
            "step": self.steps,
            "sim_time_seconds": round(self.simulation_time, 2),
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
                "finished": agent.is_finished,
                "maxPackages": agent.max_packages,
                "status": agent.status.name,
                "packages_in_cargo": [
                    {
                        "id": package.id,
                        "status": package.status.name
                    }
                    for package in agent.packages_in_cargo
                ],
                "packages_in_cargo_count": agent.packages_in_cargo_count,
                "packages_delivered": agent.packages_delivered,
                "depot_load_count": agent.depot_load_count,
                "time_driving_seconds": round(agent.time_driving_seconds, 2),
                "time_delivering_seconds": round(agent.time_delivering_seconds, 2),
                "time_parked_seconds": round(agent.time_parked_seconds, 2),
                "time_loading_packages_seconds": round(agent.time_loading_packages_seconds, 2),
            })

        return agents_status
    
    def _get_houses_status(self):
        """List of dictionaries containing house status;
        (id, road_coords, total_packages, delivered_packages, undelivered_packages, package details)."""
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
            max_packages = car.get(CAR_MAX_PACKAGES_KEY, 1)

            # Prevent duplicate route objects
            if route_name not in routes_added:
                waypoints = car.get(CAR_ROUTE_WAYPOINTS_KEY)
                self.routes[route_name] = Route(name=route_name, waypoints=waypoints, houses=[])
                routes_added.add(route_name)
            
            route = self.routes[route_name]
            CarAgent(model=self, car_target_speed=car_target_speed, route=route, max_packages=max_packages)
    
    def is_simulation_complete(self) -> bool:
        """
        Check if simulation should stop.
        
        Conditions:
        1. All cars are PARKED
        2. No packages with IN_DEPOT status remain on any car's route
        
        Returns:
            True if both conditions are met, False otherwise
        """
        for agent in self.agents:
            if agent.status != CarStatus.PARKED:
                return False
            
            if agent.route and self._route_has_remaining_packages(agent.route):
                return False
        
        return True
    
    def _route_has_remaining_packages(self, route: Route) -> bool:
        """
        Check if a route has any packages still in IN_DEPOT status.
        
        Args:
            route: The Route object to check
            
        Returns:
            True if any house on the route has IN_DEPOT packages, False otherwise
        """
        for house in route.houses:
            if any(pkg.status == PackageStatus.IN_DEPOT for pkg in house.packages):
                return True
        return False
    
    def _setup_houses(self, houses: list[dict], houses_on_routes: dict):
        """Create house objects and link them to routes and packages.
        
        Uses housesOnRoutes if provided (new format with ordered houses per route),
        otherwise falls back to HOUSE_ROUTE_NAMES_LIST_KEY per house (old format).
        """
        # Instantiate all house objects
        for house_data in houses:
            house_id = house_data.get(HOUSE_ID_KEY)
            expected_num_packages = house_data.get(HOUSE_PACKAGE_COUNT_KEY)
            packages = [Package(id=f"{house_id}_{i}", destination_house_id=house_id) for i in range(expected_num_packages)]
            house = House(
                id=house_id,
                packages=packages,
                road_coords=house_data.get(HOUSE_ROAD_COORDS_KEY),
                num_undelivered_packages=len(packages),
            )
            self.houses[house.id] = house
        
        # Link houses to routes using housesOnRoutes
        for route_name, route_houses_data in houses_on_routes.items():
            route = self.routes.get(route_name)
            if not route:
                continue
            for house_id in route_houses_data:
                house = self.houses.get(house_id)
                if house:
                    route.houses.append(house)