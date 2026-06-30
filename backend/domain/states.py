class SimulationState:
    def __init__(self):
        self.start = False
        self.chosen_route = {
            "auto_A": "route_1",
            "auto_B": "route_1",
            "auto_C": "route_1",
            "auto_D": "route_1",
            "auto_E": "route_1"
        }

state = SimulationState()