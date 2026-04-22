import mesa

from backend.digital_sim.domain.route import Route


class CarAgent(mesa.Agent):
    def __init__(self, model, car_speed: int = 50, route: Route = None):
        super().__init__(model)

        self.car_speed = car_speed
        self.route = route
    
    def step(self):
        """Execute one step of the car agent."""
        # TODO: implement car movement logic
        pass
