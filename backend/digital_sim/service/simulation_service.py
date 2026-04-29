from backend.digital_sim.domain.car_model import CarModel
from backend.digital_sim.constants import CAR_ROUTE_WAYPOINTS_KEY, CARS_KEY, CAR_TARGET_SPEED_KEY, SCENARIO_KEY, SCENARIO_NAME_KEY, SCENARIO_HOUSES_LIST_KEY


class SimulationService:
    STEPS_PER_SECOND = 10
    
    def __init__(self):
        self.model = None
        self.is_running = False
    
    def start_simulation(self, parameters: dict):
        """
        Start a new simulation with the given parameters.
        
        Args:
            parameters: Dictionary containing cars, carTargetSpeed, and scenario
        """
        cars = parameters.get(CARS_KEY, [])  # TODO: throw error if missing/empty
        car_target_speed = parameters.get(CAR_TARGET_SPEED_KEY, 50)
        
        scenario = parameters.get(SCENARIO_KEY, {})
        scenario_name = scenario.get(SCENARIO_NAME_KEY, "unknown")
        houses = scenario.get(SCENARIO_HOUSES_LIST_KEY, [])

        # Convert route waypoints from dicts to tuples for each car configuration
        for car in cars:
            car[CAR_ROUTE_WAYPOINTS_KEY] = self._convert_waypoint_dicts_to_tuples(car.get(CAR_ROUTE_WAYPOINTS_KEY, []))
        
        # Create model with configuration
        self.model = CarModel(
            cars=cars,
            car_target_speed=car_target_speed,
            scenario_name=scenario_name,
            houses=houses
        )
        self.is_running = True
        return {"status": "simulation_started", "agents": len(self.model.agents)}
    
    def step(self):
        """
        Execute one step of the simulation.
        
        Returns:
            Dictionary with step information and agent status
        """
        if not self.is_running or not self.model:
            return {"status": "simulation_not_running"}
        
        # Execute one step in the simulation
        self.model.step()
        
        return {
            "step": self.model.step_count,
            "agents": self.model.get_agents_status()
        }
    
    def stop_simulation(self):
        """Stop the current simulation."""
        self.is_running = False
        final_step = self.model.step_count if self.model else 0
        self.model = None
        return {"status": "simulation_stopped", "final_step": final_step}

    @staticmethod
    def _convert_waypoint_dicts_to_tuples(waypoints):
        """Convert list of waypoints from dict format to list of (x, y) tuples.
        Example input: [{"x": 1.0, "y": 2.0}, {"x": 3.0, "y": 4.0}]
        Output: [(1.0, 2.0), (3.0, 4.0)]

        Args:
            waypoints: List of dictionaries with 'x' and 'y' keys
        Returns:
            List of (x, y) tuples
        """
        return [(point['x'], point['y']) for point in waypoints]