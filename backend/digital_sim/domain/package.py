from enum import Enum

class PackageStatus(Enum):
    IN_DEPOT = "in_depot"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"

class Package:
    def __init__(self, id: str, destination_house_id: str, status: PackageStatus = PackageStatus.IN_DEPOT):
        self.id = id
        self.destination_house_id = destination_house_id
        self.status = status
        self.assigned_car_id = None

    def mark_delivered(self):
        """Mark this package as delivered."""
        self.status = PackageStatus.DELIVERED
