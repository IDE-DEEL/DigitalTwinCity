import math
from typing import Tuple

from backend.digital_sim.constants import X_COORD_IDX, Y_COORD_IDX
from backend.digital_sim.domain.pid_controller import PIDController


Point = Tuple[float, float]

# DISCLAIMER: this controller is made by AI based on an earlier prototype.
# It is not perfect and is intended to be replaced in the future.


class MovementController:
    """
    Handelt de bewegingssimulatie van de auto.
    Volgt een route met PID-achtige stuurlogica.
    Losgekoppeld van de mesa agent zodat dit later kan worden vervangen.
    """

    def __init__(self, waypoints: list, target_speed: float, dt: float = 0.1):
        """
        Args:
            waypoints: List van waypoints in format [{x: float, y: float}, ...]
            dt: Timestep in seconden
        """
        if not waypoints or len(waypoints) < 2:
            raise ValueError("Minimaal 2 waypoints nodig")

        self.waypoints = waypoints
        self.dt = dt

        # Positie en richting
        start = self.waypoints[0]
        self.position = [float(start[X_COORD_IDX]), float(start[Y_COORD_IDX])]
        self.heading = self._initial_heading()
        self.segment_index = 0

        # Snelheid
        self.actual_speed = 0.0
        self.target_speed = target_speed

        # Status
        self.finished = False
        self.off_route = False
        
        # Afstand tracking
        self.distance_travelled = 0.0

        # PID Controller voor steering (gebaseerd op magneetsensor simulatie)
        self.pid_controller = PIDController(kp=6.0, ki=0.02, kd=3.5, imax=15.0)
        
        # Virtual magnetometer sensors (offset in auto-lokaal coördinatenstelsel)
        # Lokaal frame: x = forward, y = left
        # Sensoren liggen left/right van de middenlijn, niet voor/achter
        self.sensor_left_offset = (0.05, 0.05)   # 5cm links van middenlijn (y-axis is left)
        self.sensor_right_offset = (0.05, -0.05)   # 5cm rechts van middenlijn (negative y)
        
        # Tuning parameters
        self.max_steer = 0.18  # radians per step
        self.acceleration = 0.2  # units/s² voor snelheidsverandering
        self.deceleration = 0.3  # units/s² voor remmen
        self.base_lookahead = 0.1  # base lookahead distance
        self.lookahead_speed_factor = 0.1  # lookahead groeit met snelheid
        self.goal_tolerance = 0.12
        self.off_route_threshold = 3.0
        self.error_scale_mm = 20.0  # schaal factor voor error berekening (van fysieke auto)

    def update(self) -> None:
        """
        Update de beweging van de auto.

        Args:
            target_speed: Gewenste snelheid (0-100 als percentage)
        """
        if self.finished or self.off_route:
            self.actual_speed = 0.0
            return

        # 1. Update actual_speed (acceleratie/deceleratie)
        self._update_speed()

        # 2. Update position en heading
        if self.actual_speed >= 0.01:  # Alleen bewegen als snelheid > 0
            self._update_position()
            self._check_route_finished()

    def _update_speed(self) -> None:
        """Update actual_speed richting target_speed."""
        if self.target_speed > self.actual_speed:
            # Accelereren
            self.actual_speed = min(
                self.actual_speed + self.acceleration * self.dt,
                self.target_speed
            )
        else:
            # Decelereren
            self.actual_speed = max(
                self.actual_speed - self.deceleration * self.dt,
                self.target_speed
            )

        # Clamp naar 0 als heel klein
        if abs(self.actual_speed) < 0.01:
            self.actual_speed = 0.0

    def _update_position(self) -> None:
        """
        Beweeg de auto langs de route met PID-gebaseerde steering.
        
        Simuleert magneetsensoren op linker- en rechterkant van auto,
        berekent error t.o.v. route, en stuurt via PID controller.
        """
        # Find dichtstbijzijnde punt op route
        best_seg, proj_point, proj_t, dist_to_route = self._find_closest_point_on_route()

        if dist_to_route > self.off_route_threshold:
            self.off_route = True
            return

        self.segment_index = best_seg

        # Bereken virtuele magneetsensor posities (in auto-lokaal frame, dan roteren naar wereld)
        sensor_left_world = self._rotate_point_to_world(self.sensor_left_offset)
        sensor_right_world = self._rotate_point_to_world(self.sensor_right_offset)
        
        # Bereken afstand van beide sensoren tot de route
        dist_left = self._distance_to_route(sensor_left_world, best_seg)
        dist_right = self._distance_to_route(sensor_right_world, best_seg)
        
        # Error: rechts - links (positief = zwaartepunt naar rechts, auto moet naar links sturen)
        error = dist_right - dist_left
        
        # PID controller bepaalt stuurhoek op basis van error
        steer_output = self.pid_controller.update(error)
        
        # Clamp stuurhoek naar max_steer
        steer = max(-self.max_steer, min(self.max_steer, steer_output))
        self.heading = self._wrap_angle(self.heading + steer)

        # Beweeg de auto
        move_distance = self.actual_speed * self.dt
        prev_pos = (self.position[0], self.position[1])
        self.position[0] += math.cos(self.heading) * move_distance
        self.position[1] += math.sin(self.heading) * move_distance
        
        # Voeg werkelijk afgelegde afstand toe
        new_pos = (self.position[0], self.position[1])
        self.distance_travelled += math.hypot(new_pos[0] - prev_pos[0], new_pos[1] - prev_pos[1])


    def _find_closest_point_on_route(self) -> Tuple[int, Point, float, float]:
        """
        Vind het dichtstbijzijnde punt op de route.

        Returns:
            (segment_index, projection_point, t_on_segment, distance_to_projection)
        """
        pos = (self.position[X_COORD_IDX], self.position[Y_COORD_IDX])
        waypoints = self.waypoints

        # Zoek in huidige en volgende segmenten
        best_seg = self.segment_index
        best_point = None
        best_t = 0.0
        best_dist = float("inf")

        search_end = min(self.segment_index + 5, len(waypoints) - 1)

        for i in range(self.segment_index, search_end):
            p1 = (waypoints[i][X_COORD_IDX], waypoints[i][Y_COORD_IDX])
            p2 = (waypoints[i + 1][X_COORD_IDX], waypoints[i + 1][Y_COORD_IDX])

            proj, t, dist = self._project_point_on_segment(pos, p1, p2)

            if dist < best_dist:
                best_dist = dist
                best_seg = i
                best_point = proj
                best_t = t

        return best_seg, best_point, best_t, best_dist

    def _point_along_route(self, seg_index: int, start_t: float, distance_ahead: float) -> Point:
        """
        Geef een punt terug dat 'distance_ahead' verder ligt op de polyline-route,
        beginnend op segment 'seg_index' op relatieve positie 'start_t' (0-1).
        
        Dit is de bewezen methode uit car_agent_OLD.py die goed werkt met grote gaten
        tussen waypoints.
        
        Args:
            seg_index: Huige segment index
            start_t: Positie op segment (0-1)
            distance_ahead: Hoe ver vooruit te kijken
            
        Returns:
            Point op de route dat distance_ahead ver is
        """
        waypoints = self.waypoints
        n = len(waypoints)

        seg = seg_index
        t = start_t
        remaining = distance_ahead

        while seg < n - 1:
            a = (waypoints[seg][X_COORD_IDX], waypoints[seg][Y_COORD_IDX])
            b = (waypoints[seg + 1][X_COORD_IDX], waypoints[seg + 1][Y_COORD_IDX])

            dx = b[0] - a[0]
            dy = b[1] - a[1]
            seg_len = math.hypot(dx, dy)

            if seg_len == 0:
                seg += 1
                t = 0.0
                continue

            remaining_on_seg = (1.0 - t) * seg_len

            if remaining <= remaining_on_seg:
                new_t = t + (remaining / seg_len)
                return (a[0] + new_t * dx, a[1] + new_t * dy)

            remaining -= remaining_on_seg
            seg += 1
            t = 0.0

        # Eindpunt bereikt
        return (waypoints[-1][X_COORD_IDX], waypoints[-1][Y_COORD_IDX])

    def _check_route_finished(self) -> None:
        """Controleer of eindpunt bereikt is."""
        final = (self.waypoints[-1][X_COORD_IDX], self.waypoints[-1][Y_COORD_IDX])
        dist_to_goal = math.hypot(
            self.position[X_COORD_IDX] - final[X_COORD_IDX],
            self.position[Y_COORD_IDX] - final[Y_COORD_IDX]
        )

        # Alleen als we op het laatste segment zijn
        if self.segment_index >= len(self.waypoints) - 2:
            if dist_to_goal <= self.goal_tolerance:
                self.position = [final[X_COORD_IDX], final[Y_COORD_IDX]]
                self.finished = True

    def _initial_heading(self) -> float:
        """Bepaal initiële heading van eerste segment."""
        p1 = self.waypoints[0]
        p2 = self.waypoints[1]
        return math.atan2(p2[Y_COORD_IDX] - p1[Y_COORD_IDX], p2[X_COORD_IDX] - p1[X_COORD_IDX])

    def reset_for_new_trip(self) -> None:
        """Reset controller to start position for a new trip.
        
        Resets position to first waypoint, heading to initial direction,
        clears finished flag, and prepares for another route traversal.
        """
        self.finished = False
        self.segment_index = 0
        self.position = [float(self.waypoints[0][X_COORD_IDX]), float(self.waypoints[0][Y_COORD_IDX])]
        self.heading = self._initial_heading()
        self.actual_speed = 0.0
        self.off_route = False
        self.pid_controller.reset()  # Reset PID state voor schone start


    def _rotate_point_to_world(self, local_point: Point) -> Point:
        """
        Roteert een punt van auto-lokaal frame naar wereld frame.
        
        Auto's forward-richting = heading angle
        Lokaal frame: x = forward, y = left
        
        Args:
            local_point: (x, y) in auto-lokaal frame
            
        Returns:
            (x, y) in wereld frame
        """
        cos_h = math.cos(self.heading)
        sin_h = math.sin(self.heading)
        
        local_x, local_y = local_point
        
        # Rotatie matrix:
        # [cos  -sin] [local_x]   [cos*local_x - sin*local_y]
        # [sin   cos] [local_y] = [sin*local_x + cos*local_y]
        world_x = cos_h * local_x - sin_h * local_y
        world_y = sin_h * local_x + cos_h * local_y
        
        # Voeg auto's positie toe
        return (self.position[0] + world_x, self.position[1] + world_y)
    
    def _distance_to_route(self, point: Point, segment_index: int) -> float:
        """
        Berekent de perpendiculaire afstand van een punt tot de route.
        
        Zoekt het dichtstbijzijnde segment aan het gegeven segment_index
        en berekent de afstand.
        
        Args:
            point: (x, y) punt in wereld frame
            segment_index: Huibde route segment
            
        Returns:
            Afstand naar dichtstbijzijnde punt op route
        """
        waypoints = self.waypoints
        best_dist = float("inf")
        
        # Zoek in huidi en paar volgende segmenten voor nauwkeurigheid
        search_end = min(segment_index + 3, len(waypoints) - 1)
        
        for i in range(max(0, segment_index - 1), search_end):
            p1 = (waypoints[i][X_COORD_IDX], waypoints[i][Y_COORD_IDX])
            p2 = (waypoints[i + 1][X_COORD_IDX], waypoints[i + 1][Y_COORD_IDX])
            
            _, _, dist = self._project_point_on_segment(point, p1, p2)
            
            if dist < best_dist:
                best_dist = dist
        
        return best_dist

    @staticmethod
    def _project_point_on_segment(p: Point, a: Point, b: Point) -> Tuple[Point, float, float]:
        """
        Project punt op segment.
        
        Returns:
            (projected_point, t_on_segment, distance_from_p_to_projection)
        """
        ax, ay = a
        bx, by = b
        px, py = p

        dx = bx - ax
        dy = by - ay
        seg_len_sq = dx * dx + dy * dy

        if seg_len_sq == 0:
            return a, 0.0, math.hypot(px - ax, py - ay)

        t = ((px - ax) * dx + (py - ay) * dy) / seg_len_sq
        t = max(0.0, min(1.0, t))

        proj = (ax + t * dx, ay + t * dy)
        dist = math.hypot(px - proj[0], py - proj[1])
        return proj, t, dist

    def _segment_heading(self, seg_index: int) -> float:
        """Geef de richting van een segment terug in radialen."""
        waypoints = self.waypoints
        n = len(waypoints)

        if seg_index >= n - 1:
            a = (waypoints[-2][X_COORD_IDX], waypoints[-2][Y_COORD_IDX])
            b = (waypoints[-1][X_COORD_IDX], waypoints[-1][Y_COORD_IDX])
        else:
            a = (waypoints[seg_index][X_COORD_IDX], waypoints[seg_index][Y_COORD_IDX])
            b = (waypoints[seg_index + 1][X_COORD_IDX], waypoints[seg_index + 1][Y_COORD_IDX])

        return math.atan2(b[Y_COORD_IDX] - a[Y_COORD_IDX], b[X_COORD_IDX] - a[X_COORD_IDX])

    @staticmethod
    def _wrap_angle(angle: float) -> float:
        """Normaliseer hoek naar [-pi, pi]."""
        return (angle + math.pi) % (2 * math.pi) - math.pi

    @property
    def position_tuple(self) -> Point:
        return (self.position[X_COORD_IDX], self.position[Y_COORD_IDX])
    
    @property
    def heading_deg(self) -> float:
        """Kompas heading in graden (0-360): 0=Noord, 90=Oost, 180=Zuid, 270=West."""
        return (90 - math.degrees(self.heading)) % 360
    
    @property
    def virtual_sensor_left(self) -> Point:
        """
        Position van de linker virtuele magneetsensor in wereld coördinaten.
        
        Returns:
            (x, y) tuple van linker sensor positie
        """
        return self._rotate_point_to_world(self.sensor_left_offset)
    
    @property
    def virtual_sensor_right(self) -> Point:
        """
        Position van de rechter virtuele magneetsensor in wereld coördinaten.
        
        Returns:
            (x, y) tuple van rechter sensor positie
        """
        return self._rotate_point_to_world(self.sensor_right_offset)