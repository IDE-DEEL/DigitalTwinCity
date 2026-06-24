from enum import Enum
from typing import Optional

import mesa

from backend.digital_sim.domain.route import Route
from backend.digital_sim.domain.movement_controller import MovementController
from backend.digital_sim.constants import PACKAGE_PICKUP_TIME_IN_SECONDS, PACKAGE_DELIVERY_TIME_IN_SECONDS, METERS_PER_TILE
from backend.digital_sim.utils.coordinate_util import convert_position_math_to_svg


class CarStatus(Enum):
    PARKED = "parked"
    IDLE = "idle"
    LOADING_PACKAGES = "loading_packages"
    DRIVING = "driving"
    DELIVERING = "delivering"
    DEADLOCKED = "deadlocked"


class CarAgent(mesa.Agent):

    def __init__(self, model, id: int, car_scaled_speed: int = 50, route: Optional[Route] = None, max_packages: int = 1):
        super().__init__(model)

        self.id = id
        self.target_speed = car_scaled_speed
        self.route = route
        self.max_packages = max_packages
        self._movement_controller = MovementController(waypoints=route.waypoints, target_speed=self.target_speed)
        self.packages_in_cargo = []
        self._last_distance_travelled = 0.0
        self.initial_state_of_charge = 100.0
        self.state_of_charge = 100.0

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

    def agent_cycle(self):
        """Execute one step of the car agent.

        Orchestrates the agent's actions in order:
        1. Package pickup
        2. Package delivery
        3. Movement along route
        4. Status time tracking
        5. Battery usage tracking
        """
        dt = self.model.delta_time
        self._handle_package_pickup(dt)
        self._handle_package_delivery(dt)
        self._handle_movement(dt)
        self._update_status_tracking(dt)
        self._update_battery_usage()

    def _handle_package_pickup(self, dt: float):
        """Handle package pickup logic.

        First: pick up available packages if parked and has capacity.
        Second: process package pickup time if currently loading packages.

        Args:
            dt: Time delta for this step
        """
        # First: start loading packages if parked and has capacity
        if self.status == CarStatus.PARKED:
            self._select_packages_for_pickup()

        # Second: process package pickup time
        self._pickup_packages(dt)

    def _handle_package_delivery(self, dt: float):
        """Handle package delivery logic.

        Checks if in delivery zones and handles ongoing deliveries.

        Args:
            dt: Time delta for this step
        """
        if self.current_delivery_house is not None:
            self._deliver_packages(dt)
        else:
            self._check_for_delivery_zone()

    def _handle_movement(self, dt: float):
        """Handle movement along the route.

        Args:
            dt: Time delta for this step
        """
        if not self._movement_controller:
            return

        self._movement_controller.dt = dt

        # Only move if:
        # not delivering AND not picking up AND (has cargo OR has already started the route)
        has_cargo = len(self.packages_in_cargo) > 0
        has_started = self.has_started_route
        can_move = self.current_delivery_house is None and not self.is_picking_up and (has_cargo or has_started)

        if can_move:
            self._movement_controller.update()

    def _update_status_tracking(self, dt: float):
        """Track time spent in each status.

        Args:
            dt: Time delta for this step
        """
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
        """Get current position as (x, y) dictionary."""
        if self._movement_controller:
            return self._movement_controller.position_dict
        return None
    
    @property
    def svg_position(self):
        """Get current position as (x, y) dictionary for SVG rendering."""
        if self._movement_controller:
            return convert_position_math_to_svg(self._movement_controller.position_dict, self.model.map_rows)
        return None

    @property
    def actual_speed(self):
        """Get current speed."""
        if self._movement_controller:
            return self._movement_controller.actual_speed
        return 0.0

    @property
    def is_finished(self):
        """Check if the agent has reached the end of its route."""
        if self._movement_controller:
            return self._movement_controller.finished
        return False

    @property
    def heading(self):
        """Get current heading in radians."""
        if self._movement_controller:
            return self._movement_controller.heading
        return 0.0

    @property
    def heading_deg(self):
        """Get compass heading in degrees (0-360): 0=North, 90=East, 180=South, 270=West."""
        if self._movement_controller:
            return self._movement_controller.heading_deg
        return 0.0

    @property
    def distance_travelled(self):
        """Get total distance travelled."""
        if self._movement_controller:
            return self._movement_controller.distance_travelled
        return 0.0
    
    @property
    def distance_travelled_km(self):
        """Get total distance travelled in kilometers, scaled to kilometers based on the map tile scale."""
        ONE_KM_IN_METERS = 1000
        return self.distance_travelled * METERS_PER_TILE / ONE_KM_IN_METERS

    @property
    def has_started_route(self):
        """Check if the car has started moving along its route."""
        if self._movement_controller:
            return self._movement_controller.distance_travelled > 0
        return False

    @property
    def packages_in_cargo_count(self):
        """Get the current number of packages in cargo."""
        return len(self.packages_in_cargo)

    @property
    def virtual_sensor_left(self):
        """Get position of left virtual magnetometer as (x, y) dictionary."""
        if self._movement_controller:
            sensor = self._movement_controller.virtual_sensor_left
            return sensor if sensor else None
        return None
    
    @property
    def svg_virtual_sensor_left(self):
        """Get position of left virtual magnetometer as (x, y) dictionary for SVG rendering."""
        if self._movement_controller:
            sensor = self._movement_controller.virtual_sensor_left
            return convert_position_math_to_svg(sensor, self.model.map_rows) if sensor else None
        return None

    @property
    def virtual_sensor_right(self):
        """Get position of right virtual magnetometer as (x, y) dictionary."""
        if self._movement_controller:
            sensor = self._movement_controller.virtual_sensor_right
            return sensor if sensor else None
        return None
    
    @property
    def svg_virtual_sensor_right(self):
        """Get position of right virtual magnetometer as (x, y) dictionary for SVG rendering."""
        if self._movement_controller:
            sensor = self._movement_controller.virtual_sensor_right
            return convert_position_math_to_svg(sensor, self.model.map_rows) if sensor else None
        return None
    
    @property
    def went_out_of_lane(self):
        """Check if the car went out of lane based on distance from route."""
        if self._movement_controller:
            return self._movement_controller.went_out_of_lane
        return False
    
    @property
    def is_out_of_lane(self):
        """Check if the car is currently out of lane based on distance from route."""
        if self._movement_controller:
            return self._movement_controller.is_out_of_lane
        return False

    @property
    def status(self):
        """Get the current status of the car based on its movement and route progress.

        Checks are evaluated in priority order:
        - LOADING_PACKAGES: currently loading packages at the depot
        - DELIVERING: currently delivering packages at a house
        - DRIVING: actual_speed > 0
        - PARKED: not moving, AND either hasn't started its route yet or has finished it
        - IDLE: not moving, but underway on the route (started, not finished)
        """
        if self.is_picking_up:
            return CarStatus.LOADING_PACKAGES
        elif self._check_for_deadlock():
            return CarStatus.DEADLOCKED
        elif self.current_delivery_house is not None:
            return CarStatus.DELIVERING
        elif self.actual_speed > 0:
            return CarStatus.DRIVING
        elif (not self.has_started_route) or (self.is_finished):
            return CarStatus.PARKED
        else:
            return CarStatus.IDLE

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

    def _deliver_packages(self, dt: float):
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

    def _pickup_packages(self, dt: float):
        """Process picking up packages: load packages one by one.

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

    def _reset_route(self) -> None:
        """Reset the movement controller to the start position so the agent
        can traverse the route again.
        """
        if self._movement_controller:
            self._movement_controller.reset_for_new_trip()

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

    def _select_packages_for_pickup(self):
        """Selects available packages from the route while parked.

        Gets packages from the route and assigns them to this agent if there's cargo space.
        Packages are queued for loading (not immediately added to cargo).
        Loading duration is calculated as: number_of_packages * PACKAGE_PICKUP_TIME_IN_SECONDS.
        Packages are loaded one by one, with each taking PACKAGE_PICKUP_TIME_IN_SECONDS.
        If we pick up packages or still have packages in cargo after a completed trip, reset the route.
        """
        packages_picked_up = False
        
        has_capacity = (len(self.packages_in_cargo) + len(self.packages_pending_load)) < self.max_packages
        if self.route and has_capacity:

            # Get all available packages from the route
            available_packages = self.route.get_available_packages()

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

        # If we finish the route and picked up new packages or still have packages in cargo, reset for another trip
        if self._movement_controller.finished and packages_picked_up:
            self._reset_route()
    
    def _check_for_deadlock(self) -> bool:
        """Check if the car is deadlocked.

        Conditions:
        1. A car completes its route without having delivered any packages from its cargo.

        Returns:
            bool: True if the car is deadlocked, False otherwise.
        """
        return len(self.packages_in_cargo) == self.max_packages and self.is_finished

    def _update_battery_usage(self) -> None:
        """Update the battery state-of-charge statistic based on distance travelled this step.
        """
        distance_this_step = self.distance_travelled - self._last_distance_travelled
        self._last_distance_travelled = self.distance_travelled

        # Battery decay is currently tracked purely for statistics;
        # it doesn't affect thecar's ability to move or deliver packages.
        BATTERY_DRAIN = 0.05
        battery_used = distance_this_step * BATTERY_DRAIN

        self.state_of_charge = max(0.0, self.state_of_charge - battery_used)