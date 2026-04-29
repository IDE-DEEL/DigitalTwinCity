from backend.digital_sim.domain.package import Package

class House:
    def __init__(self, id: str, packages: list[Package], road_coords: list[tuple], num_undelivered_packages: int):
        self.id = id
        self.packages = packages
        self.road_coords = road_coords
        self.num_undelivered_packages = num_undelivered_packages