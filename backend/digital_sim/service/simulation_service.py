from backend.digital_sim.domain.car_model import CarModel
from backend.digital_sim.constants import (
    CAR_ROUTE_WAYPOINTS_KEY, CARS_KEY, CAR_TARGET_SPEED_KEY, SCENARIO_KEY, 
    SCENARIO_NAME_KEY, SCENARIO_HOUSES_LIST_KEY, HOUSE_ROAD_COORDS_KEY, 
    HOUSES_ON_ROUTES_KEY, NUMERIC_AGENT_REPORTER_KEYS, CAR_MAIN_ID_KEY,
    AGENT_DISTANCE_TRAVELLED_KEY, AGENT_TIME_DRIVING_SECONDS_KEY, AGENT_PACKAGES_DELIVERED_KEY,
)
from backend.digital_sim.utils.coordinate_util import convert_waypoint_dicts_to_tuples
from backend.score.scoreCalculator import TripData, calculate_score
from backend.score.config import WEIGHTS
import gc

EXTRA_CONFIG = {
    "wear_factor": 0.1,                 # arbitrary wear factor for EVs
    "co2_emission_g_per_km": 0.0,       # EV = 0 emissions
    "cost_per_km": 0.30,                # 30 cents per km
    "revenue_per_package": 8.0,         # €8 per package delivered
    "total_budget": 500.0,              # total budget for normalization
    "is_rush_hour": False,
}

class SimulationService:
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
            self.dispose()
        
        cars = parameters.get(CARS_KEY, [])  # TODO: throw error if missing/empty
        car_target_speed = parameters.get(CAR_TARGET_SPEED_KEY, 50)

        scenario = parameters.get(SCENARIO_KEY, {})
        scenario_name = scenario.get(SCENARIO_NAME_KEY, "unknown")
        houses = scenario.get(SCENARIO_HOUSES_LIST_KEY, [])
        houses_on_routes = parameters.get(HOUSES_ON_ROUTES_KEY, {})

        # Convert route waypoints from dicts to tuples for each car
        for car in cars:
            car[CAR_ROUTE_WAYPOINTS_KEY] = convert_waypoint_dicts_to_tuples(car.get(CAR_ROUTE_WAYPOINTS_KEY, []))
        
        # Convert house roadCoords from dicts to tuples for each house
        for house in houses:
            house[HOUSE_ROAD_COORDS_KEY] = convert_waypoint_dicts_to_tuples(house.get(HOUSE_ROAD_COORDS_KEY, []))
        
        # Create model with configuration
        self.model = CarModel(
            cars=cars,
            car_target_speed=car_target_speed,
            scenario_name=scenario_name,
            houses=houses,
            houses_on_routes=houses_on_routes,
        )
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
        
        # Execute one step in the simulation
        self.model.step()
        
        # Check if simulation should auto-complete
        if self.model.is_simulation_complete():
            self.is_running = False
        
        return {
            "status": "simulation_update",
            **self.model.get_simulation_state()
        }

    def stop_simulation(self):
        """Stop the current simulation."""
        self.is_running = False
        final_step = self.model.steps if self.model else 0

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
                        "id": agent.id,
                        "distance_travelled": float,
                        "packages_delivered": int,
                        "time_driving_seconds": float,
                    },
                    ...
                ],
                "totals": {
                    "total_distance": float,
                    "total_packages_delivered": int,
                    "total_time_driving": float,
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
            "step_count": self.model.steps,
            "agents": [],
            "totals": {
                "total_distance": 0.0,
                "total_packages_delivered": 0,
                "total_time_driving": 0.0,
            }
        }
        
        for agent in self.model.agents:
            agent_stat = {
                CAR_MAIN_ID_KEY: getattr(agent, CAR_MAIN_ID_KEY),
                AGENT_DISTANCE_TRAVELLED_KEY: round(getattr(agent, AGENT_DISTANCE_TRAVELLED_KEY), 2),
                AGENT_TIME_DRIVING_SECONDS_KEY: round(getattr(agent, AGENT_TIME_DRIVING_SECONDS_KEY), 2),
                AGENT_PACKAGES_DELIVERED_KEY: getattr(agent, AGENT_PACKAGES_DELIVERED_KEY),
            }
            stats["agents"].append(agent_stat)
            stats["totals"]["total_distance"] += getattr(agent, AGENT_DISTANCE_TRAVELLED_KEY)
            stats["totals"]["total_packages_delivered"] += getattr(agent, AGENT_PACKAGES_DELIVERED_KEY)
            stats["totals"]["total_time_driving"] += getattr(agent, AGENT_TIME_DRIVING_SECONDS_KEY)
        
        # Round totals to 2 decimal places
        stats["totals"]["total_distance"] = round(stats["totals"]["total_distance"], 2)
        stats["totals"]["total_time_driving"] = round(stats["totals"]["total_time_driving"], 2)
        
        return stats

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
            print(f"Error exporting data to CSV: {e}")
            return None

    def calculate_trip_scores(self) -> list[dict] | None:
        """Calculate and return scores for each agent based on current simulation data."""
        if not self.model or not self.model.agents:
            return None

        results = []

        for agent in self.model.agents:
            total_cost = EXTRA_CONFIG["cost_per_km"] * agent.distance_travelled
            total_revenue = EXTRA_CONFIG["revenue_per_package"] * agent.packages_delivered
            budget_used_pct = (total_cost / EXTRA_CONFIG["total_budget"]) * 100

            trip = TripData(
                co2_emission_g_per_km   = EXTRA_CONFIG["co2_emission_g_per_km"],
                wear_factor             = EXTRA_CONFIG["wear_factor"],
                distance_km             = agent.distance_travelled,
                cost_per_km             = EXTRA_CONFIG["cost_per_km"],
                revenue_per_package     = total_revenue,                # total revenue based on packages delivered
                budget_used_pct         = min(budget_used_pct, 100),
                is_rush_hour            = EXTRA_CONFIG["is_rush_hour"],
                soc_start_pct           = agent.state_of_charge,         # NOT IMPLEMENTED: SoC decay
                soc_end_pct             = agent.state_of_charge,
                is_wrong_way            = False,
                idle_time_sec           = agent.time_delivering_seconds,
                speed_value             = agent.target_speed * 100,
            )

            score = calculate_score(trip, WEIGHTS)
            results.append({
                "id": agent.id,
                **score
            })

        return results
        
    def dispose(self):
        """Destroy all simulation data."""

        self.is_running = False
        self.model = None

        gc.collect()
