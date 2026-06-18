"""
PID Controller - Discrete implementation
Ported from the digital twin (PID_steering.c)
with anti-windup clamping on the integral term.
Used by MovementController for steering along the route
based on virtual magnetometer simulation.
"""


class PIDController:
    """Discrete PID controller, ported from the original C implementation.

    Maintains internal state (the running integral and the previous error)
    between calls to `update`, and applies anti-windup clamping on the
    integral term to prevent overshoot.
    """

    def __init__(self, kp: float = 6.0, ki: float = 0.02, kd: float = 3.5, imax: float = 15.0):
        """
        Initialize PID controller.

        Args:
            kp: Proportional gain (default: 6.0 from digital twin)
            ki: Integral gain (default: 0.02 from digital twin)
            kd: Derivative gain (default: 3.5 from digital twin)
            imax: Anti-windup integral clamp (default: 15.0 from digital twin)
        """
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.imax = imax

        self.integral = 0.0
        self.prev_error = 0.0

    def reset(self):
        """Zero all state for a clean restart."""
        self.integral = 0.0
        self.prev_error = 0.0

    def update(self, error: float) -> float:
        """
        Run one discrete PID step.

        output = kp * error
               + ki * integral (clamped to +/- imax)
               + kd * (error - prev_error)

        Args:
            error: Current error value

        Returns:
            PID output (steering command)
        """
        # Integral with anti-windup clamp
        self.integral += error
        self.integral = max(-self.imax, min(self.imax, self.integral))

        # Derivative (backward difference)
        derivative = error - self.prev_error
        self.prev_error = error

        # PID output
        return self.kp * error + self.ki * self.integral + self.kd * derivative