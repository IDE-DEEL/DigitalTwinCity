/*
 * pid_steering.h  —  Discrete PID controller public API
 *
 * State is kept in a pid_state_t struct so multiple independent
 * controllers can coexist without global state.
 *
 * Usage:
 *   pid_state_t pid;
 *   pid_reset(&pid);
 *   float output = pid_update(&pid, error);   // call once per loop tick
 *
 * Gains and the integrator clamp are configured per-call so they can
 * be changed at runtime.  Use the constants from config.h for the
 * default line-tracking controller.
 */

#pragma once

/**
 * @brief Struct keeping track of a discrete PID controller's state history.
 *        Members are private; only pid_reset() and pid_update() should touch
 *        them. Place the struct on the stack or in static storage.
 */
typedef struct {
    float integral;     /**< accumulated integral term */
    float prev_error;   /**< error from the previous call (for derivative) */
} pid_state_t;

/**
 * @brief Zero the integral and derivative history.
 *        Call once before the first pid_update(), and after any period where
 *        the controller was inactive, to prevent windup carry-over.
 * 
 * @param pid Pointer to the PID state tracking struct to reset.
 */
void pid_reset(pid_state_t *pid);

/**
 * @brief Compute the PID output for one time step.
 * 
 * @param pid Pointer to the PID state struct.
 * @param error Current setpoint error (desired - actual).
 * @param kp Proportional gain multiplier.
 * @param ki Integral gain multiplier.
 * @param kd Derivative gain multiplier.
 * @param imax Anti-windup clamp limit: integral is clamped to ±imax.
 * @return float Computed controller output. Add this to nominal servo angle, etc.
 */
float pid_update(pid_state_t *pid,
                 float error,
                 float kp, float ki, float kd, float imax);
