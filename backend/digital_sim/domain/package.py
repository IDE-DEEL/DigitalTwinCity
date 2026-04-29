from enum import Enum

class PackageStatus(Enum):
    IN_DEPOT = "in_depot"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"

class Package:
    def __init__(self, id: str, status: PackageStatus = PackageStatus.IN_DEPOT):
        self.id = id
        self.status = status
        self.assigned_car_id = None
