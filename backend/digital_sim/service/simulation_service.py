from backend.digital_sim.domain.car_model import CarModel
from backend.digital_sim.constants import (
    AGENT_DISTANCE_TRAVELLED_KM_KEY, CAR_ROUTE_WAYPOINTS_KEY, CARS_KEY, CAR_TARGET_SPEED_KEY, SCENARIO_KEY, 
    SCENARIO_NAME_KEY, SCENARIO_HOUSES_LIST_KEY, HOUSE_ROAD_COORDS_KEY, 
    HOUSES_ON_ROUTES_KEY, NUMERIC_AGENT_REPORTER_KEYS, CAR_MAIN_ID_KEY,
    AGENT_TIME_DRIVING_SECONDS_KEY, AGENT_PACKAGES_DELIVERED_KEY, MAP_ROWS_KEY,
)
from backend.digital_sim.utils.coordinate_util import convert_waypoints_array_from_svg_to_math
from backend.score.scoreCalculator import TripData, calculate_score
from backend.score.config import WEIGHTS, TRIP
import gc


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
        
        # Create model with configuration
        self.model = CarModel(
            cars=cars,
            car_target_speed=car_target_speed,
            scenario_name=scenario_name,
            houses=houses,
            houses_on_routes=houses_on_routes,
            map_rows=map_rows,
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
        
        # Determine status of the simulation
        if self.model.is_simulation_complete():
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
        self.is_running = False

        result = {
            "status": "simulation_stopped",
        }

        if self.model is not None:
            result.update(self.model.get_simulation_state())
            result.update(self.get_current_statistics())

        return result

    def get_current_statistics(self):
        simulation_stats = self._get_simulation_stats()
        trip_scores = self._calculate_trip_scores()

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
            print(f"Error exporting data to CSV: {e}")
            return None
    
    def _get_simulation_stats(self) -> dict:
        """Return per-agent stats from the current simulation.
        
        Returns:
            Dict with stats or None if no simulation is active.
            
            Structure:
            {
                "step_count": int,
                "agents": [
                    {
                        "id": agent.id,
                        "distance_travelled_km": float,
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
                AGENT_DISTANCE_TRAVELLED_KM_KEY: round(getattr(agent, AGENT_DISTANCE_TRAVELLED_KM_KEY), 2),
                AGENT_TIME_DRIVING_SECONDS_KEY: round(getattr(agent, AGENT_TIME_DRIVING_SECONDS_KEY), 2),
                AGENT_PACKAGES_DELIVERED_KEY: getattr(agent, AGENT_PACKAGES_DELIVERED_KEY),
            }
            stats["agents"].append(agent_stat)
            stats["totals"]["total_distance"] += getattr(agent, AGENT_DISTANCE_TRAVELLED_KM_KEY)
            stats["totals"]["total_packages_delivered"] += getattr(agent, AGENT_PACKAGES_DELIVERED_KEY)
            stats["totals"]["total_time_driving"] += getattr(agent, AGENT_TIME_DRIVING_SECONDS_KEY)
        
        # Round totals to 2 decimal places
        stats["totals"]["total_distance"] = round(stats["totals"]["total_distance"], 2)
        stats["totals"]["total_time_driving"] = round(stats["totals"]["total_time_driving"], 2)
        stats["totals"]["total_undelivered_packages"] = self.model.get_total_packages_undelivered() 
        
        return stats


    def _calculate_trip_scores(self) -> dict | None:
        """Calculate one aggregated score for the entire simulation run,
        based on combined data from all agents."""
        if not self.model or not self.model.agents:
            return None

        agents = self.model.agents
        num_agents = len(agents)

        # ── Sum ──────────────────────────────
        total_distance_km = sum(agent.distance_travelled_km for agent in agents)
        total_packages_delivered = sum(agent.packages_delivered for agent in agents)
        total_idle_time = sum(agent.time_delivering_seconds for agent in agents)

        # ── Averages ───────────────────────────
        avg_soc_start = sum(agent.initial_state_of_charge for agent in agents) / num_agents
        avg_soc_end = sum(agent.state_of_charge for agent in agents) / num_agents
        avg_target_speed = self.model.car_target_speed

        # ── Cost/revenue over the entire run ────
        total_cost = TRIP.cost_per_km * total_distance_km
        total_revenue = TRIP.revenue_per_package * total_packages_delivered
        
        #  ── Emissions over the entire run ──────
        total_emissions = TRIP.co2_emission_g_per_km * total_distance_km

        # ── Booleans: if 1 agent = true, count for the run ──
        any_wrong_way = any(agent.went_out_of_lane for agent in agents)

        trip = TripData(
            co2_emission_g_per_km    = total_emissions,
            distance_km              = total_distance_km,
            cost_per_km              = TRIP.cost_per_km,
            revenue_per_package      = total_revenue,
            start_budget             = TRIP.start_budget,
            budget_spent             = total_cost,
            is_rush_hour             = TRIP.is_rush_hour,
            soc_start_pct            = avg_soc_start,
            soc_end_pct              = avg_soc_end,
            is_wrong_way             = any_wrong_way,
            idle_time_sec            = total_idle_time,
            speed_value              = avg_target_speed * 100,
            pid_crash_value          = TRIP.pid_crash_value,
            pid_wear_value           = TRIP.pid_wear_value
        )

        score = calculate_score(trip, WEIGHTS)

        return score
        
    def dispose(self):
        """Destroy all simulation data."""

        self.is_running = False
        self.model = None

        gc.collect()
