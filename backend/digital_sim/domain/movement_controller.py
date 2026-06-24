import math
from typing import Tuple

from backend.digital_sim.constants import X_COORD_KEY, Y_COORD_KEY
from backend.digital_sim.domain.pid_controller import PIDController


Point = dict[str, float]


class MovementController:
    """
    Simulates the physical movement of the car.

    Follows a route using PID-based steering logic, modeled on virtual
    magnetometer sensors placed on the left and right side of the car.

    Deliberately decoupled from the mesa CarAgent so this simulation can be
    replaced independently in the future. The PIDController used internally
    for lateral steering is an implementation detail of this class, not
    part of its public interface.
    """

    # How many segments ahead of the current one to search when locating the
    # closest point on the route (to the car itself, or to a sensor).
    _ROUTE_SEARCH_WINDOW = 5
    _SENSOR_SEARCH_WINDOW = 3

    # Virtual magnetometer sensor placement, in the car-local frame
    # (x = forward, y = left). Both sensors sit slightly ahead of the car's
    # center, offset to either side of the centerline.
    _SENSOR_FORWARD_OFFSET_M = 0.05
    _SENSOR_LATERAL_OFFSET_M = 0.05

    def __init__(self, waypoints: list[Point], target_speed: float, dt: float = 0.1):
        """
        Args:
            waypoints: List of waypoints as {"x": ..., "y": ...} dicts
            target_speed: Speed the car will accelerate/decelerate towards
            dt: Timestep in seconds
        """
        if not waypoints or len(waypoints) < 2:
            raise ValueError("At least 2 waypoints are required")

        self.waypoints = waypoints
        self.dt = dt

        # Position and heading
        start = self.waypoints[0]
        self.position = {X_COORD_KEY: float(start[X_COORD_KEY]), Y_COORD_KEY: float(start[Y_COORD_KEY])}
        self.heading = self._initial_heading()
        self.segment_index = 0

        # Speed
        self.actual_speed = 0.0
        self.target_speed = target_speed

        # Status
        self.finished = False
        self.is_out_of_lane = False
        self.went_out_of_lane = False

        # Distance tracking
        self.distance_travelled = 0.0

        # PID controller for steering, based on the virtual magnetometer simulation.
        self._steering_pid = PIDController(kp=6.0, ki=0.02, kd=3.5, imax=15.0)

        self.sensor_left_offset = {X_COORD_KEY: self._SENSOR_FORWARD_OFFSET_M, Y_COORD_KEY: self._SENSOR_LATERAL_OFFSET_M}
        self.sensor_right_offset = {X_COORD_KEY: self._SENSOR_FORWARD_OFFSET_M, Y_COORD_KEY: -self._SENSOR_LATERAL_OFFSET_M}

        # Tuning parameters
        self.max_steer = 0.18 # radians per step
        self.acceleration = 0.2 # units/s^2 for speeding up
        self.deceleration = 0.3 # units/s^2 for braking
        self.goal_tolerance = 0.12
        self.out_of_lane_threshold = 0.12

    def update(self) -> None:
        """
        Advance the simulated movement by one timestep.

        Updates actual_speed towards target_speed, then advances position
        and heading along the route if the car is currently moving.
        """
        if self.finished:
            self.actual_speed = 0.0
            return

        # 1. Update actual_speed (acceleration/deceleration)
        self._update_speed()

        # 2. Update position and heading
        if self.actual_speed >= 0.01:
            self.is_out_of_lane = False
            self._update_position()
            self._check_route_finished()

    def _update_speed(self) -> None:
        """Move actual_speed towards target_speed."""
        self.actual_speed = self.target_speed

        # Clamp to 0 if very small
        if abs(self.actual_speed) < 0.01:
            self.actual_speed = 0.0

    def _update_position(self) -> None:
        """
        Move the car along the route using PID-based steering.

        Simulates magnetometer sensors on the left and right side of the
        car, computes the lateral error relative to the route, and steers
        using the PID controller.
        """
        # Find the closest point on the route
        best_seg, _proj_point, _proj_t, dist_to_route = self._find_closest_point_on_route()

        if dist_to_route > self.out_of_lane_threshold:
            self.went_out_of_lane = True
            self.is_out_of_lane = True

        self.segment_index = best_seg

        # Compute the virtual magnetometer sensor positions (in the car-local
        # frame, then rotated into world coordinates)
        sensor_left_world = self._rotate_point_to_world(self.sensor_left_offset)
        sensor_right_world = self._rotate_point_to_world(self.sensor_right_offset)

        # Compute the distance from both sensors to the route
        dist_left = self._distance_to_route(sensor_left_world, best_seg)
        dist_right = self._distance_to_route(sensor_right_world, best_seg)

        # Error: right - left (positive = car has drifted right, steer left to correct)
        error = dist_right - dist_left

        # The PID controller turns the error into a steering angle
        steer_output = self._steering_pid.update(error)

        # Clamp the steering angle to max_steer
        steer = max(-self.max_steer, min(self.max_steer, steer_output))
        self.heading = self._wrap_angle(self.heading + steer)

        # Move the car
        move_distance = self.actual_speed * self.dt
        prev_pos = {X_COORD_KEY: self.position[X_COORD_KEY], Y_COORD_KEY: self.position[Y_COORD_KEY]}
        self.position[X_COORD_KEY] += math.cos(self.heading) * move_distance
        self.position[Y_COORD_KEY] += math.sin(self.heading) * move_distance

        # Add the distance actually travelled
        new_pos = {X_COORD_KEY: self.position[X_COORD_KEY], Y_COORD_KEY: self.position[Y_COORD_KEY]}
        self.distance_travelled += math.hypot(new_pos[X_COORD_KEY] - prev_pos[X_COORD_KEY], new_pos[Y_COORD_KEY] - prev_pos[Y_COORD_KEY])

    def _find_closest_point_on_route(self) -> Tuple[int, Point, float, float]:
        """
        Find the closest point on the route to the car's current position.

        Returns:
            (segment_index, projection_point, t_on_segment, distance_to_projection)
        """
        pos = {X_COORD_KEY: self.position[X_COORD_KEY], Y_COORD_KEY: self.position[Y_COORD_KEY]}
        waypoints = self.waypoints

        # Search the current segment and the next few segments
        best_seg = self.segment_index
        best_point = None
        best_t = 0.0
        best_dist = float("inf")

        search_end = min(self.segment_index + self._ROUTE_SEARCH_WINDOW, len(waypoints) - 1)

        for i in range(self.segment_index, search_end):
            p1 = {X_COORD_KEY: waypoints[i][X_COORD_KEY], Y_COORD_KEY: waypoints[i][Y_COORD_KEY]}
            p2 = {X_COORD_KEY: waypoints[i + 1][X_COORD_KEY], Y_COORD_KEY: waypoints[i + 1][Y_COORD_KEY]}

            proj, t, dist = self._project_point_on_segment(pos, p1, p2)

            if dist < best_dist:
                best_dist = dist
                best_seg = i
                best_point = proj
                best_t = t

        return best_seg, best_point, best_t, best_dist

    def _check_route_finished(self) -> None:
        """Check whether the end of the route has been reached."""
        final = {X_COORD_KEY: self.waypoints[-1][X_COORD_KEY], Y_COORD_KEY: self.waypoints[-1][Y_COORD_KEY]}
        dist_to_goal = math.hypot(
            self.position[X_COORD_KEY] - final[X_COORD_KEY],
            self.position[Y_COORD_KEY] - final[Y_COORD_KEY]
        )

        # Only check once we're on the last segment
        if self.segment_index >= len(self.waypoints) - 2:
            if dist_to_goal <= self.goal_tolerance:
                self.position = {X_COORD_KEY: final[X_COORD_KEY], Y_COORD_KEY: final[Y_COORD_KEY]}
                self.finished = True

    def _initial_heading(self) -> float:
        """Determine the initial heading from the first segment of the route."""
        p1 = self.waypoints[0]
        p2 = self.waypoints[1]
        return math.atan2(p2[Y_COORD_KEY] - p1[Y_COORD_KEY], p2[X_COORD_KEY] - p1[X_COORD_KEY])

    def reset_for_new_trip(self) -> None:
        """Reset controller to start position for a new trip.

        Resets position to first waypoint, heading to initial direction,
        clears finished flag, and prepares for another route traversal.
        """
        self.finished = False
        self.segment_index = 0
        self.position = {X_COORD_KEY: float(self.waypoints[0][X_COORD_KEY]), Y_COORD_KEY: float(self.waypoints[0][Y_COORD_KEY])}
        self.heading = self._initial_heading()
        self.actual_speed = 0.0
        self._steering_pid.reset() # Reset PID state for a clean start

    def _rotate_point_to_world(self, local_point: Point) -> Point:
        """
        Rotate a point from the car-local frame into the world frame.

        The car's forward direction is given by its heading angle.
        Local frame: x = forward, y = left.

        Args:
            local_point: {"x": ..., "y": ...} dict in the car-local frame

        Returns:
            {"x": ..., "y": ...} dict in the world frame
        """
        cos_h = math.cos(self.heading)
        sin_h = math.sin(self.heading)

        local_x, local_y = local_point[X_COORD_KEY], local_point[Y_COORD_KEY]

        # Rotation matrix:
        # [cos  -sin] [local_x]   [cos*local_x - sin*local_y]
        # [sin   cos] [local_y] = [sin*local_x + cos*local_y]
        world_x = cos_h * local_x - sin_h * local_y
        world_y = sin_h * local_x + cos_h * local_y

        # Add the car's position
        return {X_COORD_KEY: self.position[X_COORD_KEY] + world_x, Y_COORD_KEY: self.position[Y_COORD_KEY] + world_y}

    def _distance_to_route(self, point: Point, segment_index: int) -> float:
        """
        Compute the perpendicular distance from a point to the route.

        Searches the segments closest to the given segment_index and
        returns the smallest distance found.

        Args:
            point: {"x": ..., "y": ...} point in the world frame
            segment_index: Current route segment

        Returns:
            Distance to the closest point on the route
        """
        waypoints = self.waypoints
        best_dist = float("inf")

        # Search the current segment and a couple of neighbouring ones for accuracy
        search_end = min(segment_index + self._SENSOR_SEARCH_WINDOW, len(waypoints) - 1)

        for i in range(max(0, segment_index - 1), search_end):
            p1 = {X_COORD_KEY: waypoints[i][X_COORD_KEY], Y_COORD_KEY: waypoints[i][Y_COORD_KEY]}
            p2 = {X_COORD_KEY: waypoints[i + 1][X_COORD_KEY], Y_COORD_KEY: waypoints[i + 1][Y_COORD_KEY]}

            _, _, dist = self._project_point_on_segment(point, p1, p2)

            if dist < best_dist:
                best_dist = dist

        return best_dist

    @staticmethod
    def _project_point_on_segment(p: Point, a: Point, b: Point) -> Tuple[Point, float, float]:
        """
        Project a point onto a line segment.

        Returns:
            (projected_point, t_on_segment, distance_from_p_to_projection)
        """
        ax, ay = a[X_COORD_KEY], a[Y_COORD_KEY]
        bx, by = b[X_COORD_KEY], b[Y_COORD_KEY]
        px, py = p[X_COORD_KEY], p[Y_COORD_KEY]

        dx = bx - ax
        dy = by - ay
        seg_len_sq = dx * dx + dy * dy

        if seg_len_sq == 0:
            return a, 0.0, math.hypot(px - ax, py - ay)

        t = ((px - ax) * dx + (py - ay) * dy) / seg_len_sq
        t = max(0.0, min(1.0, t))

        proj = {X_COORD_KEY: ax + t * dx, Y_COORD_KEY: ay + t * dy}
        dist = math.hypot(px - proj[X_COORD_KEY], py - proj[Y_COORD_KEY])
        return proj, t, dist

    @staticmethod
    def _wrap_angle(angle: float) -> float:
        """Normalize an angle to the range [-pi, pi]."""
        return (angle + math.pi) % (2 * math.pi) - math.pi

    @property
    def position_dict(self) -> Point:
        """Get current position as a {"x": ..., "y": ...} dict (a defensive copy)."""
        return {X_COORD_KEY: self.position[X_COORD_KEY], Y_COORD_KEY: self.position[Y_COORD_KEY]}

    @property
    def heading_deg(self) -> float:
        """Compass heading in degrees (0-360): 0=North, 90=East, 180=South, 270=West."""
        return (90 - math.degrees(self.heading)) % 360

    @property
    def virtual_sensor_left(self) -> Point:
        """Position of the left virtual magnetometer sensor, as a dict, in world coordinates."""
        return self._rotate_point_to_world(self.sensor_left_offset)

    @property
    def virtual_sensor_right(self) -> Point:
        """Position of the right virtual magnetometer sensor, as a dict, in world coordinates."""
        return self._rotate_point_to_world(self.sensor_right_offset)