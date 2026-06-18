from backend.digital_sim.domain.package import Package
from backend.digital_sim.utils.polygon_util import point_in_polygon


class House:
    def __init__(self, id: str, packages: list[Package], road_coords: list[tuple[float, float]], num_undelivered_packages: int):
        self.id = id
        self.packages = packages
        self.road_coords = road_coords
        self.num_undelivered_packages = num_undelivered_packages

    def is_in_delivery_zone(self, position: tuple[float, float]) -> bool:
        """Check if the given position is within this house's delivery zone (road_coords polygon).

        Args:
            position: (x, y) tuple

        Returns:
            True if position is inside the delivery zone polygon, False otherwise
        """
        return point_in_polygon(position, self.road_coords)