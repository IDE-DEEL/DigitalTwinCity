from backend.digital_sim.domain.house import House
from backend.digital_sim.domain.package import PackageStatus


class Route:

    def __init__(self, name: str, waypoints: list[dict[str, float]], houses: list[House]):
        self.name = name
        self.waypoints = waypoints
        self.houses = houses

    def get_available_packages(self):
        """Get all available packages from houses on this route in route order.

        Returns:
            List of Package objects that are IN_DEPOT and not yet assigned to any agent
        """
        available_packages = []
        
        for house in self.houses:
            for package in house.packages:
                if package.status == PackageStatus.IN_DEPOT and package.assigned_car_id is None:
                    available_packages.append(package)
        return available_packages