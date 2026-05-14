from backend.digital_sim.domain.car_model import CarModel
from backend.digital_sim.constants import CAR_ROUTE_WAYPOINTS_KEY, CARS_KEY, CAR_TARGET_SPEED_KEY, SCENARIO_KEY, SCENARIO_NAME_KEY, SCENARIO_HOUSES_LIST_KEY, HOUSE_ROAD_COORDS_KEY, SEED_KEY, HOUSES_ON_ROUTES_KEY
import pandas as pd


class SimulationService:
    STEPS_PER_SECOND = 10
    
    def __init__(self):
        self.model = None
        self.is_running = False
    
    def start_simulation(self, parameters: dict):
        """
        Start a new simulation with the given parameters.
        
        Args:
            parameters: Dictionary containing cars, carTargetSpeed, scenario, and housesOnRoutes
        """
        # Clean up any existing model before starting a new simulation
        if self.model is not None:
            self.model = None
            self.is_running = False
        
        cars = parameters.get(CARS_KEY, [])  # TODO: throw error if missing/empty
        car_target_speed = parameters.get(CAR_TARGET_SPEED_KEY, 50)

        scenario = parameters.get(SCENARIO_KEY, {})
        scenario_name = scenario.get(SCENARIO_NAME_KEY, "unknown")
        houses = scenario.get(SCENARIO_HOUSES_LIST_KEY, [])
        houses_on_routes = parameters.get(HOUSES_ON_ROUTES_KEY, {})
        seed = parameters.get(SEED_KEY, None)

        # Convert route waypoints from dicts to tuples for each car
        for car in cars:
            car[CAR_ROUTE_WAYPOINTS_KEY] = self._convert_waypoint_dicts_to_tuples(car.get(CAR_ROUTE_WAYPOINTS_KEY, []))
        
        # Convert house roadCoords from dicts to tuples for each house
        for house in houses:
            house[HOUSE_ROAD_COORDS_KEY] = self._convert_waypoint_dicts_to_tuples(house.get(HOUSE_ROAD_COORDS_KEY, []))
        
        # Create model with configuration
        self.model = CarModel(
            cars=cars,
            car_target_speed=car_target_speed,
            scenario_name=scenario_name,
            houses=houses,
            houses_on_routes=houses_on_routes,
            rng=seed
        )
        self.is_running = True
        return {
            "status": "simulation_started",
            **self.model.get_simulation_state()
        }
    
    def step(self):
        """
        Execute one step of the simulation.
        
        Returns:
            Dictionary with complete simulation state (agents, houses, packages)
        """
        if not self.is_running or not self.model:
            return {"status": "simulation_not_running"}
        
        # Execute one step in the simulation
        self.model.step()
        
        return {
            "status": "simulation_update",
            **self.model.get_simulation_state()
        }

    def stop_simulation(self):
        """Stop the current simulation."""
        self.is_running = False
        final_step = self.model.step_count if self.model else 0

        return {"status": "simulation_stopped", "final_step": final_step}

    def get_current_stats(self):
        """Return per-agent stats from the current simulation.
        
        Returns:
            Dict with stats or None if no simulation is active.
            
            Structure:
            {
                "step_count": int,
                "agents": [
                    {
                        "id": agent_id,
                        "distance_travelled": float,
                        "time_driving_seconds": float
                    },
                    ...
                ],
                "totals": {
                    "total_distance": float,
                    "total_time_driving": float
                }
            }
        """
        if not self.model:
            print("[SimulationService] get_current_stats: No model available")
            return None
        
        if not hasattr(self.model, 'agents') or not self.model.agents:
            print("[SimulationService] get_current_stats: No agents in model")
            return None
        
        stats = {
            "step_count": self.model.step_count,
            "agents": [],
            "totals": {"total_distance": 0.0, "total_time_driving": 0.0}
        }
        
        for agent in self.model.agents:
            agent_stat = {
                "id": agent.unique_id,
                "distance_travelled": round(agent.total_distance_travelled, 2),
                "time_driving_seconds": round(agent.time_driving_seconds, 2)
            }
            stats["agents"].append(agent_stat)
            stats["totals"]["total_distance"] += agent.total_distance_travelled
            stats["totals"]["total_time_driving"] += agent.time_driving_seconds
        
        # Round totals to 2 decimal places
        stats["totals"]["total_distance"] = round(stats["totals"]["total_distance"], 2)
        stats["totals"]["total_time_driving"] = round(stats["totals"]["total_time_driving"], 2)
        
        return stats

    def export_data_as_csv(self):
        """Export Mesa DataCollector agent data as CSV string.
        
        Returns:
            CSV string with all collected agent data or None if no simulation is active.
            
            CSV structure:
            Step,AgentID,total_distance_travelled,time_driving_seconds,status
        """
        if not self.model or not self.model.datacollector:
            return None
        
        try:
            # Get agent variables dataframe from Mesa DataCollector
            agent_data = self.model.datacollector.get_agent_vars_dataframe()
            
            # Round numeric columns to 2 decimal places
            numeric_columns = ['total_distance_travelled', 'time_driving_seconds']
            for col in numeric_columns:
                if col in agent_data.columns:
                    agent_data[col] = agent_data[col].round(2)
            
            # Convert to CSV string
            return agent_data.to_csv()
        except Exception as e:
            print(f"Error exporting data to CSV: {e}")
            return None

    @staticmethod
    def _convert_waypoint_dicts_to_tuples(waypoints):
        """Convert list of waypoints from dict format to list of (x, y) tuples.
        Example input: [{"x": 1.0, "y": 2.0}, {"x": 3.0, "y": 4.0}]
        Output: [(1.0, 2.0), (3.0, 4.0)]
        
        Used for both car route waypoints and house detection zone coordinates.

        Args:
            waypoints: List of dictionaries with 'x' and 'y' keys
        Returns:
            List of (x, y) tuples
        """
        return [(point['x'], point['y']) for point in waypoints]