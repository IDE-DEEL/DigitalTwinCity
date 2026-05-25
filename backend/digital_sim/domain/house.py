from backend.digital_sim.domain.package import Package

class House:
    def __init__(self, id: str, packages: list[Package], waypoint_label: dict[int, int], waypoint_detection: dict[int, int]):
        self.id = id
        self.packages = packages
        self.waypoint_label = waypoint_label
        self.waypoint_detection = waypoint_detection