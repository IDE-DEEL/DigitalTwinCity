from enum import Enum

class PackageStatus(Enum):
    IN_DEPOT = 1
    IN_TRANSIT = 2
    DELIVERED = 3

class Package:
    def __init__(self, id: int, status: PackageStatus = PackageStatus.IN_DEPOT):
        self.id = id
        self.status = status
