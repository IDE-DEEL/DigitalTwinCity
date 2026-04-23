import math
from typing import Tuple

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
        start = waypoints[0]
        self.position = [float(start["x"]), float(start["y"])]
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

        # Tuning parameters
        self.max_steer = 0.2  # radians per step
        self.acceleration = 0.2  # units/s² voor snelheidsverandering
        self.deceleration = 0.3  # units/s² voor remmen
        self.base_lookahead = 0.2  # base lookahead distance
        self.lookahead_speed_factor = 0.1  # lookahead groeit met snelheid
        self.goal_tolerance = 0.2
        self.off_route_threshold = 3.0
        self.target_heading_gain = 0.9  # steering naar lookahead point
        self.path_heading_gain = 0.3  # steering naar pad richting

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
        if self.actual_speed > 0.01:  # Alleen bewegen als snelheid > 0
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
        """Beweeg de auto langs de route."""
        # Find dichtstbijzijnde punt op route
        best_seg, proj_point, dist_to_route = self._find_closest_point_on_route()

        if dist_to_route > self.off_route_threshold:
            self.off_route = True
            return

        self.segment_index = best_seg

        # Bepaal dynamische lookahead (snelheid-afhankelijk)
        lookahead_distance = self.base_lookahead + (self.actual_speed * self.lookahead_speed_factor)
        
        # Bepaal target point (lookahead)
        target_point = self._get_lookahead_point(best_seg, proj_point, lookahead_distance)

        # Bereken gewenste heading naar target
        pos_tuple = (self.position[0], self.position[1])
        target_heading = math.atan2(
            target_point[1] - pos_tuple[1],
            target_point[0] - pos_tuple[0]
        )
        
        # Bereken ook heading van huidige pad segment
        path_heading = self._segment_heading(best_seg)

        # Stuur bij (combinatie van target heading en pad heading)
        heading_error_to_target = self._wrap_angle(target_heading - self.heading)
        heading_error_to_path = self._wrap_angle(path_heading - self.heading)
        
        desired_steer = (
            self.target_heading_gain * heading_error_to_target
            + self.path_heading_gain * heading_error_to_path
        )
        steer = max(-self.max_steer, min(self.max_steer, desired_steer))
        self.heading = self._wrap_angle(self.heading + steer)

        # Beweeg
        move_distance = self.actual_speed * self.dt
        prev_pos = (self.position[0], self.position[1])
        self.position[0] += math.cos(self.heading) * move_distance
        self.position[1] += math.sin(self.heading) * move_distance
        
        # Voeg werkelijk afgelegde afstand toe
        new_pos = (self.position[0], self.position[1])
        self.distance_travelled += math.hypot(new_pos[0] - prev_pos[0], new_pos[1] - prev_pos[1])

    def _find_closest_point_on_route(self) -> Tuple[int, Point, float]:
        """
        Vind het dichtstbijzijnde punt op de route.

        Returns:
            (segment_index, projection_point, distance_to_projection)
        """
        pos = (self.position[0], self.position[1])
        waypoints = self.waypoints

        # Zoek in huidige en volgende segmenten
        best_seg = self.segment_index
        best_point = None
        best_dist = float("inf")

        search_end = min(self.segment_index + 5, len(waypoints) - 1)

        for i in range(self.segment_index, search_end):
            p1 = (waypoints[i]["x"], waypoints[i]["y"])
            p2 = (waypoints[i + 1]["x"], waypoints[i + 1]["y"])

            proj, dist = self._project_point_on_segment(pos, p1, p2)

            if dist < best_dist:
                best_dist = dist
                best_seg = i
                best_point = proj

        return best_seg, best_point, best_dist

    def _get_lookahead_point(self, seg_index: int, start_point: Point, lookahead_distance: float) -> Point:
        """
        Get een punt verder langs de route voor steering.
        
        Args:
            seg_index: Huidge segment index
            start_point: Startpunt voor lookahead
            lookahead_distance: Hoe ver vooruit te kijken
        """
        waypoints = self.waypoints
        current_dist = 0.0

        for i in range(seg_index, len(waypoints) - 1):
            p1 = (waypoints[i]["x"], waypoints[i]["y"])
            p2 = (waypoints[i + 1]["x"], waypoints[i + 1]["y"])

            seg_length = math.hypot(p2[0] - p1[0], p2[1] - p1[1])

            if i == seg_index:
                dist_on_seg = math.hypot(
                    start_point[0] - p1[0],
                    start_point[1] - p1[1]
                )
                remaining_on_seg = seg_length - dist_on_seg
            else:
                dist_on_seg = 0.0
                remaining_on_seg = seg_length

            if current_dist + remaining_on_seg >= lookahead_distance:
                # Target ligt op dit segment
                dist_needed = lookahead_distance - current_dist
                t = dist_needed / remaining_on_seg if remaining_on_seg > 0 else 0
                t = max(0, min(1, t))

                result = (
                    p1[0] + t * (p2[0] - p1[0]),
                    p1[1] + t * (p2[1] - p1[1])
                )
                return result

            current_dist += remaining_on_seg

        # Eindpunt bereikt
        return (waypoints[-1]["x"], waypoints[-1]["y"])

    def _check_route_finished(self) -> None:
        """Controleer of eindpunt bereikt is."""
        final = (self.waypoints[-1]["x"], self.waypoints[-1]["y"])
        dist_to_goal = math.hypot(
            self.position[0] - final[0],
            self.position[1] - final[1]
        )

        # Alleen als we op het laatste segment zijn
        if self.segment_index >= len(self.waypoints) - 2:
            if dist_to_goal <= self.goal_tolerance:
                self.position = [final[0], final[1]]
                self.finished = True

    def _initial_heading(self) -> float:
        """Bepaal initiële heading van eerste segment."""
        p1 = self.waypoints[0]
        p2 = self.waypoints[1]
        return math.atan2(p2["y"] - p1["y"], p2["x"] - p1["x"])

    @staticmethod
    def _project_point_on_segment(p: Point, a: Point, b: Point) -> Tuple[Point, float]:
        """Project punt op segment."""
        ax, ay = a
        bx, by = b
        px, py = p

        dx = bx - ax
        dy = by - ay
        seg_len_sq = dx * dx + dy * dy

        if seg_len_sq == 0:
            return a, math.hypot(px - ax, py - ay)

        t = ((px - ax) * dx + (py - ay) * dy) / seg_len_sq
        t = max(0.0, min(1.0, t))

        proj = (ax + t * dx, ay + t * dy)
        dist = math.hypot(px - proj[0], py - proj[1])
        return proj, dist

    def _segment_heading(self, seg_index: int) -> float:
        """Geef de richting van een segment terug in radialen."""
        waypoints = self.waypoints
        n = len(waypoints)

        if seg_index >= n - 1:
            a = (waypoints[-2]["x"], waypoints[-2]["y"])
            b = (waypoints[-1]["x"], waypoints[-1]["y"])
        else:
            a = (waypoints[seg_index]["x"], waypoints[seg_index]["y"])
            b = (waypoints[seg_index + 1]["x"], waypoints[seg_index + 1]["y"])

        return math.atan2(b[1] - a[1], b[0] - a[0])

    @staticmethod
    def _wrap_angle(angle: float) -> float:
        """Normaliseer hoek naar [-pi, pi]."""
        return (angle + math.pi) % (2 * math.pi) - math.pi

    @property
    def position_tuple(self) -> Point:
        return (self.position[0], self.position[1])
    
    @property
    def heading_deg(self) -> float:
        """Kompas heading in graden (0-360): 0=Noord, 90=Oost, 180=Zuid, 270=West."""
        return (90 - math.degrees(self.heading)) % 360
