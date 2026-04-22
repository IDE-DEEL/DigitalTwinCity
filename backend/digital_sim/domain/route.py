from backend.digital_sim.domain.house import House

class Route:
    def __init__(self, name: str, waypoints: list[dict[str, float]], houses: list[House]):
        self.name = name
        self.waypoints = waypoints
        self.houses = houses