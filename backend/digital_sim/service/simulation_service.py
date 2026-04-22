from backend.digital_sim.domain.car_model import CarModel


class SimulationService:
    STEPS_PER_SECOND = 10
    
    def __init__(self):
        self.model = None
        self.is_running = False
    
    def start_simulation(self, parameters: dict):
        """
        Start a new simulation with the given parameters.
        
        Args:
            parameters: Dictionary containing carSettings, carSpeed, and scenario
        """
        car_settings = parameters.get("carSettings", [])  # TODO: throw error if missing/empty
        car_speed = parameters.get("carSpeed", 50)
        scenario = parameters.get("scenario", "rustig") # TODO: pass scenario to model later
        
        # Create model with configuration
        self.model = CarModel(
            car_settings=car_settings,
            car_speed=car_speed,
        )
        self.is_running = True
        return {"status": "simulation_started", "agents": len(self.model.agents)}
    
    def step(self):
        """
        Execute one step of the simulation.
        
        Returns:
            Dictionary with step information
        """
        if not self.is_running or not self.model:
            return {"status": "simulation_not_running"}
        
        # Execute one step in the simulation
        self.model.step()
        
        return {"step": self.model.step_count}
    
    def stop_simulation(self):
        """Stop the current simulation."""
        self.is_running = False
        final_step = self.model.step_count if self.model else 0
        self.model = None
        return {"status": "simulation_stopped", "final_step": final_step}
