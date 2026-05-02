from enum import Enum
import random
import mesa

from backend.digital_sim.domain.route import Route
from backend.digital_sim.domain.movement_controller import MovementController
from backend.digital_sim.constants import MAX_DELIVERY_TIME_IN_SECONDS, MIN_DELIVERY_TIME_IN_SECONDS


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
        
        # Delivery state
        self.current_delivery_house = None
        self.delivery_time_remaining = 0.0
        self.delivery_duration = 0.0

    def step(self):
        """Execute one step of the car agent.
        
        First: pick up available packages if parked and has capacity.
        Second: process any delivery logic.
        Third: handle movement along the route.
        """
        dt = getattr(self.model, "delta_time", 0.1)

        # First: pick up packages if parked
        if self.status == CarStatus.PARKED:
            self._pick_up_available_packages()

        # Second: handle delivery logic
        self._process_delivery(dt)
        
        # Third: handle movement
        if not self.controller:
            return

        self.controller.dt = dt
        
        # Only move if not delivering
        if self.current_delivery_house is None:
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
    def total_distance_travelled(self):
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
        - DELIVERING: Currently at a delivery location
        """
        if self.current_delivery_house is not None:
            return CarStatus.DELIVERING
        elif self.actual_speed > 0:
            return CarStatus.DRIVING
        elif (not self.has_started_route) or (self.is_finished):
            return CarStatus.PARKED
        else:
            return CarStatus.IDLE
        
    def _process_delivery(self, dt: float):
        """Process delivery logic: check if in delivery zones and handle ongoing deliveries."""        
        if self.current_delivery_house is not None:
            self._process_ongoing_delivery(dt)
        else:
            self._check_for_delivery_zone()

    def _check_for_delivery_zone(self):
        """Check if the car has entered a delivery zone of any house on its route."""
        if not self.position or not self.packages_in_cargo:
            return
        
        for house in self.route.houses:
            # Check if we have packages for this house
            packages_for_house = [p for p in self.packages_in_cargo if p.destination_house_id == house.id]
            
            if not packages_for_house:
                continue
            
            # Check if current position is in the delivery zone
            if house.is_in_delivery_zone(self.position):
                # Start delivery
                self.current_delivery_house = house
                self.delivery_duration = random.uniform(MIN_DELIVERY_TIME_IN_SECONDS, MAX_DELIVERY_TIME_IN_SECONDS)
                self.delivery_time_remaining = self.delivery_duration
                return

    def _process_ongoing_delivery(self, dt: float):
        """
        Process the ongoing delivery: count down timer and complete delivery when done.
        
        Args:
            dt: Time delta for this step
        """
        self.delivery_time_remaining -= dt
        
        if self.delivery_time_remaining <= 0:
            self._complete_delivery()

    def _complete_delivery(self):
        """Complete the delivery at current house and remove delivered packages from cargo."""
        if not self.current_delivery_house:
            return
        
        house = self.current_delivery_house
        
        # Find and complete delivery of all packages for this house
        packages_to_remove = [p for p in self.packages_in_cargo if p.destination_house_id == house.id]
        
        for package in packages_to_remove:
            package.mark_delivered()
            self.packages_in_cargo.remove(package)
        
        # Resume movement
        self.current_delivery_house = None
        self.delivery_time_remaining = 0.0
        self.delivery_duration = 0.0

    def _pick_up_available_packages(self):
        """Pick up available packages from the route while parked.
        
        Gets packages from the route and assigns them to this agent if there's cargo space.
        """
        if not self.route or len(self.packages_in_cargo) >= self.max_packages:
            return
        
        # Get all available packages from the route
        available_packages = self.route.get_available_packages()
        
        for package in available_packages:
            # Check if we still have capacity
            if len(self.packages_in_cargo) >= self.max_packages:
                break
            
            # Assign package to this agent
            package.assign_to_agent(self.unique_id)
            self.packages_in_cargo.append(package)
