#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "mqtt.h"

/** @brief Flag dictating whether standard PID steering should be temporarily suspended. */
extern bool pid_override;

/** @brief Artificially injected PID error metric utilized to perform hard turns. */
extern float active_turn_bias_error;

/** @brief The millisecond expiration timestamp terminating the turn bias. */
extern uint32_t turn_bias_end_ms;

/**
 * @brief Evaluates and institutes turning logic based on the upcoming directional instruction.
 * 
 * @param direction The desired turning pattern/direction (enum).
 */
void turn_parser(enum Direction direction);