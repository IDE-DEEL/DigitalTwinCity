from enum import Enum
import mesa

from backend.digital_sim.domain.route import Route
from backend.digital_sim.domain.movement_controller import MovementController


class CarStatus(Enum):
    PARKED = "parked"
    IDLE = "idle"
    DRIVING = "driving"
    DELIVERING = "delivering"

class CarAgent(mesa.Agent):
    def __init__(self, model, car_target_speed: int = 50, route: Route = None, max_packages: int = 1):
        super().__init__(model)

        self.target_speed = car_target_speed
        self.route = route
        self.max_packages = max_packages
        self.controller = MovementController(waypoints=route.waypoints, target_speed=self.target_speed)

    def step(self):
        """Execute one step of the car agent."""
        if not self.controller:
            return

        dt = getattr(self.model, "delta_time", 0.1)
        self.controller.dt = dt

        self.controller.update()

    @property
    def position(self):
        """Get current position as (x, y) tuple."""
        if self.controller:
            return self.controller.position_tuple
        return None

    @property
    def actual_speed(self):
        """Get current speed."""
        if self.controller:
            return self.controller.actual_speed
        return 0.0

    @property
    def is_finished(self):
        """Check if the agent has reached the end of its route."""
        if self.controller:
            return self.controller.finished
        return False

    @property
    def heading(self):
        """Get current heading in radians."""
        if self.controller:
            return self.controller.heading
        return 0.0

    @property
    def heading_deg(self):
        """Get compass heading in degrees (0-360): 0=North, 90=East, 180=South, 270=West."""
        if self.controller:
            return self.controller.heading_deg
        return 0.0

    @property
    def distance_travelled(self):
        """Get total distance travelled."""
        if self.controller:
            return self.controller.total_distance_travelled
        return 0.0

    @property
    def status(self):
        """
        Get the current status of the car based on its movement.
        Returns DRIVING if actual_speed > 0, otherwise IDLE.
        """
        if self.actual_speed > 0:
            return CarStatus.DRIVING
        return CarStatus.PARKED
