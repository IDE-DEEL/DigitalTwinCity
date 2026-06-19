from typing import Optional

import mesa

from backend.digital_sim.domain.car_agent import CarAgent, CarStatus
from backend.digital_sim.domain.route import Route
from backend.digital_sim.domain.package import Package, PackageStatus
from backend.digital_sim.domain.house import House
from backend.digital_sim.utils.coordinate_util import convert_position_math_to_svg
from backend.digital_sim.constants import (
    CAR_ROUTE_NAME_KEY, CAR_ROUTE_WAYPOINTS_KEY, CAR_MAX_PACKAGES_KEY,
    HOUSE_PACKAGE_COUNT_KEY, HOUSE_ID_KEY, HOUSE_ROAD_COORDS_KEY,
    DELTA_TIME_PER_STEP_IN_SECONDS, CAR_MAIN_ID_KEY, AGENT_POSITION_KEY,
    AGENT_STATUS_KEY, AGENT_DISTANCE_TRAVELLED_KEY, AGENT_PACKAGES_DELIVERED_KEY,
    AGENT_PACKAGES_IN_CARGO_COUNT_KEY, AGENT_DEPOT_LOAD_COUNT_KEY, AGENT_STATE_OF_CHARGE_KEY,
    AGENT_TIME_DRIVING_SECONDS_KEY, AGENT_TIME_DELIVERING_SECONDS_KEY,
    AGENT_TIME_PARKED_SECONDS_KEY, AGENT_TIME_LOADING_PACKAGES_SECONDS_KEY,
    MODEL_TOTAL_PACKAGES_IN_SCENARIO_KEY, MODEL_TOTAL_PACKAGES_UNDELIVERED_KEY,
)


class CarModel(mesa.Model):

    def __init__(self, cars: list[dict], car_target_speed: int, scenario_name: str, houses: list[dict], map_rows: int, houses_on_routes: Optional[dict] = None, rng=None):
        super().__init__(rng=rng)

        self.num_agents = len(cars)
        self.delta_time = DELTA_TIME_PER_STEP_IN_SECONDS
        self.simulation_time = 0.0
        self.car_target_speed = car_target_speed / 100
        self.houses = {}
        self.scenario_name = scenario_name
        self.map_rows = map_rows

        routes = self._setup_cars_and_routes(cars, self.car_target_speed)
        self._setup_houses(houses or [], houses_on_routes or {}, routes)

        self.datacollector = mesa.DataCollector(
            model_reporters={
                MODEL_TOTAL_PACKAGES_IN_SCENARIO_KEY: lambda m: sum(len(h.packages) for h in m.houses.values()),
                MODEL_TOTAL_PACKAGES_UNDELIVERED_KEY: lambda m: sum(
                    len([p for p in h.packages if p.status != PackageStatus.DELIVERED])
                    for h in m.houses.values()
                ),
            },
            agent_reporters={
                AGENT_STATUS_KEY: lambda agent: agent.status.name,  # enum name of the agent's status
                AGENT_POSITION_KEY: lambda agent: agent.svg_position,
                AGENT_DISTANCE_TRAVELLED_KEY: "distance_travelled",
                AGENT_STATE_OF_CHARGE_KEY: lambda agent: round(agent.state_of_charge, 2),
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

        Executes step for all agents. Each agent handles:
        - Package pickup (when parked with capacity)
        - Delivery logic (zone detection, delivery countdown)
        - Movement along route
        - Status time tracking
        Then collects simulation data.
        """
        self.agents.do("agent_cycle")

        self.datacollector.collect(self)

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
            List of dictionaries containing information about each agent
        """
        agents_status = []

        for agent in self.agents:
            agents_status.append({
                "mesa_id": agent.unique_id,
                "id": agent.id,
                "position": agent.svg_position,
                "heading_radial": agent.heading,
                "heading_deg": agent.heading_deg,
                "target_speed": agent.target_speed,
                "actual_speed": agent.actual_speed,
                "distance_travelled": agent.distance_travelled,
                "finished": agent.is_finished,
                "maxPackages": agent.max_packages,
                "status": agent.status.name,
                "initial_state_of_charge": agent.initial_state_of_charge,
                "state_of_charge": round(agent.state_of_charge, 2),
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
                "virtual_sensor_left": agent.svg_virtual_sensor_left,
                "virtual_sensor_right": agent.svg_virtual_sensor_right,
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

    def _setup_cars_and_routes(self, cars: list[dict], car_target_speed: int) -> dict:
        """Create routes and agents based on car settings from frontend."""
        routes_by_name = {}

        for car in cars:
            id = car.get(CAR_MAIN_ID_KEY)
            route_name = car.get(CAR_ROUTE_NAME_KEY)
            max_packages = car.get(CAR_MAX_PACKAGES_KEY, 1)
            waypoints = car.get(CAR_ROUTE_WAYPOINTS_KEY)

            route = Route(name=route_name, waypoints=waypoints, houses=[])
            if route_name not in routes_by_name:
                routes_by_name[route_name] = []
            routes_by_name[route_name].append(route)

            CarAgent(model=self, id=id, car_target_speed=car_target_speed, route=route, max_packages=max_packages)

        return routes_by_name

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

    def _setup_houses(self, houses: list[dict], houses_on_routes: dict, routes_by_name: dict):
        """Create House objects from the house definitions and link them to routes.

        Houses are linked to routes using `houses_on_routes`, which maps each
        route name to an ordered list of house ids.
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

        # Link houses to routes using houses_on_routes
        for route_name, route_houses_data in houses_on_routes.items():
            routes = routes_by_name.get(route_name, [])
            for route in routes:
                for house_id in route_houses_data:
                    house = self.houses.get(house_id)
                    if house:
                        route.houses.append(house)