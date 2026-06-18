from enum import Enum
from typing import Optional


class PackageStatus(Enum):
    IN_DEPOT = "in_depot"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"


class Package:
    def __init__(self, id: str, destination_house_id: str, status: PackageStatus = PackageStatus.IN_DEPOT):
        self.id = id
        self.destination_house_id = destination_house_id
        self.status = status
        self.assigned_car_id: Optional[int] = None

    def mark_delivered(self):
        """Mark this package as delivered."""
        self.status = PackageStatus.DELIVERED

    def assign_to_agent(self, agent_id: int):
        """Assign this package to an agent and mark it as in transit.

        Args:
            agent_id: Unique ID of the CarAgent to assign this package to
        """
        self.assigned_car_id = agent_id
        self.status = PackageStatus.IN_TRANSIT