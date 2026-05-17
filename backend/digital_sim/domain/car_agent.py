from enum import Enum
import mesa

from backend.digital_sim.domain.route import Route
from backend.digital_sim.domain.movement_controller import MovementController
from backend.digital_sim.constants import PACKAGE_PICKUP_TIME_IN_SECONDS, PACKAGE_DELIVERY_TIME_IN_SECONDS


class CarStatus(Enum):
    PARKED = "parked"
    IDLE = "idle"
    LOADING_PACKAGES = "loading_packages"
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
        self._reset_delivery_state()
        self.packages_pending_delivery = []
        
        # Pickup state
        self._reset_pickup_state()
        self.packages_pending_load = []
        
        # Statistics tracking
        self.packages_delivered = 0
        self.depot_load_count = 0
        self.time_driving_seconds = 0.0
        self.time_delivering_seconds = 0.0
        self.time_parked_seconds = 0.0
        self.time_loading_packages_seconds = 0.0
        self._last_status = None

    def step(self):
        """Execute one step of the car agent.
        
        First: pick up available packages if parked and has capacity.
        Second: process package pickup time if currently loading packages.
        Third: process any delivery logic.
        Fourth: handle movement along the route.
        """
        dt = self.model.delta_time

        # First: start loading packages if parked and has capacity
        if self.status == CarStatus.PARKED:
            self._pick_up_available_packages()
        
        # Second: process package pickup time
        self._process_pickup(dt)

        # Third: handle delivery logic
        self._process_delivery(dt)
        
        # Fourth: handle movement
        if not self.controller:
            return

        self.controller.dt = dt
        
        # Only move if:
        # - Not delivering AND
        # - Not picking up AND
        # - Either has cargo in cargo bay OR has already started the route
        has_cargo = len(self.packages_in_cargo) > 0
        has_started = self.has_started_route
        can_move = self.current_delivery_house is None and not self.is_picking_up and (has_cargo or has_started)
        
        if can_move:
            self.controller.update()
        
        # Track time per status
        current_status = self.status
        if self._last_status is None:
            self._last_status = current_status
        
        if current_status == CarStatus.DRIVING:
            self.time_driving_seconds += dt
        elif current_status == CarStatus.DELIVERING:
            self.time_delivering_seconds += dt
        elif current_status == CarStatus.PARKED:
            self.time_parked_seconds += dt
        elif current_status == CarStatus.LOADING_PACKAGES:
            self.time_loading_packages_seconds += dt
        
        self._last_status = current_status

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
            return self.controller.distance_travelled
        return 0.0

    @property
    def has_started_route(self):
        """Check if the car has started moving along its route."""
        if self.controller:
            return self.controller.distance_travelled > 0
        return False
    
    @property
    def packages_in_cargo_count(self):
        """Get the current number of packages in cargo."""
        return len(self.packages_in_cargo)

    @property
    def status(self):
        """Get the current status of the car based on its movement and route progress.
        
        - PARKED: Not started (distance_travelled=0) OR finished route (is_finished=True) AND actual_speed=0
        - LOADING_PACKAGES: Currently loading packages
        - IDLE: Underway on route AND actual_speed=0
        - DRIVING: actual_speed > 0
        - DELIVERING: Currently at a delivery location
        """
        if self.is_picking_up:
            return CarStatus.LOADING_PACKAGES
        elif self.current_delivery_house is not None:
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
                # Prepare delivery by queuing packages for this house
                self.current_delivery_house = house
                self.packages_pending_delivery = packages_for_house.copy()
                self.delivery_duration = len(self.packages_pending_delivery) * PACKAGE_DELIVERY_TIME_IN_SECONDS
                self.delivery_time_remaining = PACKAGE_DELIVERY_TIME_IN_SECONDS
                return

    def _process_ongoing_delivery(self, dt: float):
        """Process ongoing delivery: deliver packages one by one.
        
        Each package takes PACKAGE_DELIVERY_TIME_IN_SECONDS to deliver. Packages are removed
        from cargo one at a time as their delivery time completes.
        
        Args:
            dt: Time delta for this step
        """
        if self.current_delivery_house is None:
            return
        
        if self.packages_pending_delivery:
            self.delivery_time_remaining -= dt
            
            # When enough time has passed for one package to deliver
            while self.delivery_time_remaining <= 0 and self.packages_pending_delivery:
                # Deliver first pending package
                package = self.packages_pending_delivery.pop(0)
                package.mark_delivered()
                self.packages_in_cargo.remove(package)
                self.packages_delivered += 1
                
                # Reset timer for next package
                self.delivery_time_remaining += PACKAGE_DELIVERY_TIME_IN_SECONDS
            
            # All packages delivered when none remaining
            if not self.packages_pending_delivery:
                self._reset_delivery_state()
        else:
            # No pending packages but still in delivery state - reset
            self._reset_delivery_state()

    def _process_pickup(self, dt: float):
        """Process pickup loading time: load packages one by one.
        
        Each package takes PACKAGE_PICKUP_TIME_IN_SECONDS to load. Packages are added
        to cargo one at a time as their loading time completes.
        """
        if self.is_picking_up and self.packages_pending_load:
            self.pickup_time_remaining -= dt
            
            # When enough time has passed for one package to load
            while self.pickup_time_remaining <= 0 and self.packages_pending_load:
                # Move first pending package to cargo
                package = self.packages_pending_load.pop(0)
                self.packages_in_cargo.append(package)
                
                # Reset timer for next package
                self.pickup_time_remaining += PACKAGE_PICKUP_TIME_IN_SECONDS
            
            # All packages loaded when none remaining
            if not self.packages_pending_load:
                self._reset_pickup_state()
    
    def _get_random_duration(self, min_seconds: int, max_seconds: int) -> int:
        """Generate a random duration between min and max seconds.
        
        Args:
            min_seconds: Minimum duration
            max_seconds: Maximum duration
            
        Returns:
            Random duration value
        """
        return self.model.random.randint(min_seconds, max_seconds)
    
    def _reset_route(self) -> None:
        """Resets the controller to start position and prepares the agent
        to traverse the route again.
        """
        if self.controller:
            self.controller.reset_for_new_trip()

    def _reset_delivery_state(self) -> None:
        """Reset the delivery state variables to their initial values."""
        self.current_delivery_house = None
        self.delivery_time_remaining = 0.0
        self.delivery_duration = 0.0
        self.packages_pending_delivery = []

    def _reset_pickup_state(self) -> None:
        """Reset the pickup state variables to their initial values."""
        self.is_picking_up = False
        self.pickup_time_remaining = 0.0
        self.pickup_duration = 0.0

    def _pick_up_available_packages(self):
        """Pick up available packages from the route while parked.
        
        Gets packages from the route and assigns them to this agent if there's cargo space.
        Packages are queued for loading (not immediately added to cargo).
        Loading duration is calculated as: number_of_packages * PACKAGE_PICKUP_TIME_IN_SECONDS.
        Packages are loaded one by one, with each taking PACKAGE_PICKUP_TIME_IN_SECONDS.
        If we pick up packages after a completed trip, reset the route.
        """
        if not self.route or (len(self.packages_in_cargo) + len(self.packages_pending_load)) >= self.max_packages:
            return
        
        # Get all available packages from the route
        available_packages = self.route.get_available_packages()
        
        packages_picked_up = False
        for package in available_packages:
            # Check if we still have capacity (including pending packages)
            if len(self.packages_in_cargo) + len(self.packages_pending_load) >= self.max_packages:
                break
            
            # Assign package to this agent and queue for loading
            package.assign_to_agent(self.unique_id)
            self.packages_pending_load.append(package)
            packages_picked_up = True
        
        # Start pickup loading time if we picked up packages and increment depot load count
        if packages_picked_up:
            self.depot_load_count += 1
            self.is_picking_up = True
            self.pickup_duration = len(self.packages_pending_load) * PACKAGE_PICKUP_TIME_IN_SECONDS
            # Timer for first package
            self.pickup_time_remaining = PACKAGE_PICKUP_TIME_IN_SECONDS
        
        # If we picked up packages and the route is already finished, reset for another trip
        if packages_picked_up and self.controller.finished:
            self._reset_route()
