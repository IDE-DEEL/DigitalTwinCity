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
        self.packages_in_cargo = []

    def step(self):
        """Execute one step of the car agent.
        
        Movement is executed along the route. Package assignment is handled
        by the CarModel before agents step (see PackageAssigner).
        """
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
    def has_started_route(self):
        """Check if the car has started moving along its route."""
        if self.controller:
            return self.controller.total_distance_travelled > 0
        return False

    @property
    def status(self):
        """
        Get the current status of the car based on its movement and route progress.
        
        - PARKED: Not started (total_distance_travelled=0) OR finished route (is_finished=True) AND actual_speed=0
        - IDLE: Underway on route AND actual_speed=0
        - DRIVING: actual_speed > 0
        """
        if self.actual_speed > 0:
            return CarStatus.DRIVING
        elif not self.has_started_route or self.is_finished:
            return CarStatus.PARKED
        else:
            return CarStatus.IDLE
