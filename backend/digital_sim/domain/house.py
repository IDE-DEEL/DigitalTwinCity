from backend.digital_sim.domain.package import Package

class House:
    def __init__(self, id: str, packages: list[Package], road_coords: list[tuple], num_undelivered_packages: int):
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
        return self._point_in_polygon(position, self.road_coords)

    @staticmethod
    def _point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
        """Check if a point is inside a polygon using the ray casting algorithm.
        
        Args:
            point: (x, y) tuple
            polygon: List of (x, y) tuples forming the polygon
            
        Returns:
            True if point is inside polygon, False otherwise
        """
        if len(polygon) < 3:
            return False
        
        x, y = point
        inside = False
        
        p1x, p1y = polygon[0]
        for i in range(1, len(polygon) + 1):
            p2x, p2y = polygon[i % len(polygon)]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside