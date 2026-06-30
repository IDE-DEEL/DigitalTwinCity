/*
 * PID_steering.c  —  Discrete PID controller implementation
 *
 * A simple proportional-integral-derivative controller with
 * anti-windup clamping on the integral term.
 *
 * Stateless except for the pid_state_t struct passed by the caller,
 * so multiple independent instances can run in parallel.
 */

#include "pid_steering.h"
#include "mqtt.h"

/**
 * @brief  Zero all state inside the controller so the next pid_update() starts clean.
 * 
 * @param pid Pointer to the isolated PID struct.
 */
void pid_reset(pid_state_t *pid)
{
    pid->integral   = 0.0f;
    pid->prev_error = 0.0f;
}

/**
 * @brief Calculates a discrete PID manipulation vector for the current feedback interval.
 * 
 * @param pid Pointer to the current operating state.
 * @param error Derived target delta vs true read offset.
 * @param kp Proportionality block tuning knob.
 * @param ki Integral compounding block tuning knob.
 * @param kd Derivative predictive block tuning knob.
 * @param imax Over/Under anti-windup saturation limit.
 * @return float Synthesized corrective vector scalar.
 */
float pid_update(pid_state_t *pid,
                 float error,
                 float kp, float ki, float kd, float imax)
{
    /* ── Integral with anti-windup clamp ── */
    pid->integral += error;
    if (pid->integral >  imax) pid->integral =  imax;
    if (pid->integral < -imax) pid->integral = -imax;

    /* ── Derivative (backward difference) ── */
    float derivative  = error - pid->prev_error;
    pid->prev_error   = error;

    mqtt_set_pid((uint8_t)error);

    /* ── PID output ── */
    return kp * error
         + ki * pid->integral
         + kd * derivative;
}
