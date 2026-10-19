import logging

from backend.core.error_logging import log_unexpected_error

from backend.digital_sim.domain.car_model import CarModel
from backend.digital_sim.constants import (
    CAR_ROUTE_WAYPOINTS_KEY, CARS_KEY, CAR_TARGET_SPEED_KEY, SCENARIO_KEY, 
    SCENARIO_NAME_KEY, SCENARIO_HOUSES_LIST_KEY, HOUSE_ROAD_COORDS_KEY, 
    HOUSES_ON_ROUTES_KEY, NUMERIC_AGENT_REPORTER_KEYS,
    MAP_ROWS_KEY,
)
from backend.digital_sim.utils.coordinate_util import convert_waypoints_array_from_svg_to_math
from backend.digital_sim.service.simulation_statistics import get_simulation_statistics
from backend.digital_sim.service.simulation_scoring import calculate_simulation_scores
import gc


logger = logging.getLogger(__name__)


class SimulationExportError(Exception):
    pass


class SimulationService:
    def __init__(self):
        self.model = None
        self.is_running = False
        self.is_paused = False
    
    def start_simulation(self, parameters: dict):
        """
        Start a new simulation with the given parameters.
        
        Args:
            parameters: Dictionary containing cars, carTargetSpeed, scenario, and housesOnRoutes
        """
        # Clean up any existing model before starting a new simulation
        if self.model is not None:
            self.dispose()
        
        cars = parameters.get(CARS_KEY, [])
        car_target_speed = parameters.get(CAR_TARGET_SPEED_KEY, 50)

        scenario = parameters.get(SCENARIO_KEY, {})
        scenario_name = scenario.get(SCENARIO_NAME_KEY, "unknown")
        houses = scenario.get(SCENARIO_HOUSES_LIST_KEY, [])
        houses_on_routes = parameters.get(HOUSES_ON_ROUTES_KEY, {})
        map_rows = parameters.get(MAP_ROWS_KEY, 7)

        # Convert route waypoints from SVG coordinates to mathematical coordinates for each car
        for car in cars:
            car[CAR_ROUTE_WAYPOINTS_KEY] = convert_waypoints_array_from_svg_to_math(car.get(CAR_ROUTE_WAYPOINTS_KEY, []), map_rows)
        
        # Convert house roadCoords from SVG coordinates to mathematical coordinates for each house
        for house in houses:
            house[HOUSE_ROAD_COORDS_KEY] = convert_waypoints_array_from_svg_to_math(house.get(HOUSE_ROAD_COORDS_KEY, []), map_rows)
        
        demo_mode = parameters.get("demoMode", False)
        demo_routes = {}
        if demo_mode:
            for route in parameters.get("demoRoutes", []):
                demo_routes.setdefault(route["carId"], []).append({
                    "name": route["routeName"],
                    "waypoints": convert_waypoints_array_from_svg_to_math(
                        route["routeWaypoints"], map_rows
                    ),
                })

        # Pass the complete configuration when creating the model.
        self.model = CarModel(
            cars=cars,
            car_target_speed=car_target_speed,
            scenario_name=scenario_name,
            houses=houses,
            houses_on_routes=houses_on_routes,
            map_rows=map_rows,
            demo_mode=demo_mode,
            demo_routes=demo_routes,
        )
        self.is_paused = False
        self.is_running = True

        return {
            "status": "simulation_started",
            **self.model.get_simulation_state()
        }

    
    def execute_step(self):
        """
        Execute one step of the simulation.
        
        Checks if simulation should auto-complete after each step.
        
        Returns:
            Dictionary with complete simulation state (agents, houses, packages)
        """
        if not self.is_running or not self.model:
            return {"status": "simulation_not_running"}

        self.model.step()

        if self.model.demo_mode:
            status = "simulation_running"
        elif self.model.is_simulation_complete():
            self.is_running = False
            status = "simulation_completed"
        elif self.model.is_deadlocked():
            self.is_running = False
            status = "simulation_deadlocked"
        else:
            status = "simulation_running"

        return {
            "status": status,
            **self.model.get_simulation_state(),
            **self.get_current_statistics(),
        }

    def stop_simulation(self):
        """Stop the current simulation."""
        self.is_paused = False
        self.is_running = False

        result = {
            "status": "simulation_stopped",
        }

        if self.model is not None:
            result.update(self.model.get_simulation_state())
            result.update(self.get_current_statistics())

        return result

    def get_current_statistics(self):
        simulation_stats = get_simulation_statistics(self.model)
        trip_scores = calculate_simulation_scores(self.model)

        return {
            "simulation_stats": simulation_stats,
            "trip_scores": trip_scores,
        }

    def export_data_as_csv(self):
        """Export Mesa DataCollector agent and model data as combined CSV string.
        
        Returns:
            CSV string with all collected agent and model data or None if no simulation is active.
            
            CSV structure includes:
            - Step, AgentID (from agent data)
            - Agent metrics: distance_travelled, time_driving_seconds, status, etc.
            - Model metrics: total_packages_in_scenario, total_packages_undelivered
        """
        if not self.model or not self.model.datacollector:
            return None
        
        try:
            # Get both agent and model variables dataframes from Mesa DataCollector
            agent_data = self.model.datacollector.get_agent_vars_dataframe()
            model_data = self.model.datacollector.get_model_vars_dataframe()
            
            # Round numeric columns in agent data to 2 decimal places
            for col in NUMERIC_AGENT_REPORTER_KEYS:
                if col in agent_data.columns:
                    agent_data[col] = agent_data[col].round(2)
            
            # Merge agent and model data on Step index
            merged_data = agent_data.copy()
            for col in model_data.columns:
                merged_data[col] = agent_data.index.get_level_values('Step').map(model_data[col])
            
            # Convert to CSV string
            return merged_data.to_csv()
        except Exception as e:
            log_unexpected_error(logger, "Simulation CSV export failed", e)
            raise SimulationExportError("Simulation export failed") from None
    
    def dispose(self):
        """Destroy all simulation data."""

        self.is_running = False
        self.model = None

        gc.collect()
