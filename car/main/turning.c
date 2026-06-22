#include "turning.h"
#include "config.h"
#include "mqtt.h"
#include "motor_driver.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "esp_timer.h"
#include "esp_log.h"

/** @brief Turning constraints for left turn. */
#define TURN_LEFT_ANGLE       (SERVO_ANGLE_LEFT_MAX - 0)
#define TURN_LEFT_SPEED       MOTOR_DEFAULT_SPEED_PCT
#define TURN_LEFT_DURATION_MS 3000
#define TURN_LEFT_BIAS_ERROR  1.0f

/** @brief Turning constraints for right turn. */
#define TURN_RIGHT_ANGLE      (SERVO_ANGLE_RIGHT_MAX + 0)
#define TURN_RIGHT_SPEED      MOTOR_DEFAULT_SPEED_PCT
#define TURN_RIGHT_DURATION_MS 3000
#define TURN_RIGHT_BIAS_ERROR -1.0f

/** @brief Turning constraints for HUB left turn. */
#define TURN_HUB_LEFT_ANGLE       (SERVO_ANGLE_LEFT_MAX - 0)
#define TURN_HUB_LEFT_SPEED       MOTOR_DEFAULT_SPEED_PCT
#define TURN_HUB_LEFT_DURATION_MS 2000
#define TURN_HUB_LEFT_BIAS_ERROR  75.0f

/** @brief Turning constraints for HUB right turn. */
#define TURN_HUB_RIGHT_ANGLE      (SERVO_ANGLE_RIGHT_MAX + 0)
#define TURN_HUB_RIGHT_SPEED      MOTOR_DEFAULT_SPEED_PCT
#define TURN_HUB_RIGHT_DURATION_MS 2000
#define TURN_HUB_RIGHT_BIAS_ERROR -25.0f

/** @brief Turning constraints for roundabout entry. */
#define TURN_ROUNDABOUT_ANGLE (SERVO_ANGLE_RIGHT_MAX + 10)
#define TURN_ROUNDABOUT_SPEED MOTOR_DEFAULT_SPEED_PCT
#define TURN_ROUNDABOUT_DURATION_MS 1000
#define TURN_ROUNDABOUT_BIAS  -1.0f

/** @brief Turning constraints for roundabout exit. */
#define TURN_RIGHT_ROUND_ANGLE (SERVO_ANGLE_RIGHT_MAX + 0)
#define TURN_RIGHT_ROUND_SPEED MOTOR_DEFAULT_SPEED_PCT
#define TURN_RIGHT_ROUND_DURATION_MS 1500
#define TURN_RIGHT_ROUND_BIAS -1.0f

#define TURN_BIAS_DURATION_MS 2000

bool pid_override = false;
float active_turn_bias_error = 0.0f;
uint32_t turn_bias_end_ms = 0;
static QueueHandle_t turn_queue = NULL;

/**
 * @brief FreeRTOS task handling manual steer overriding during intersection branches.
 * 
 * @param arg Pointer to task arguments (unused).
 */
static void task_turning(void *arg) {
    enum Direction current_turn = STRAIGHT;

    while(1) {
        // Wait indefinitely until a turn is requested
        if (xQueueReceive(turn_queue, &current_turn, portMAX_DELAY) == pdTRUE) {
            
            // If the requested turn is straight, ensure PID is active and continue
            if (current_turn == STRAIGHT) {
                pid_override = false;
                continue;
            }
            
            // Otherwise, override the PID to perform our maneuver setup
            pid_override = true;
            
            int target_angle = SERVO_ANGLE_FORWARD;
            uint8_t target_speed = MOTOR_DEFAULT_SPEED_PCT;
            uint32_t turn_duration = 0;
            float target_bias = 0.0f;
            switch (current_turn) {
                case LEFT:
                    target_angle = TURN_LEFT_ANGLE;
                    target_speed = TURN_LEFT_SPEED;
                    turn_duration = TURN_LEFT_DURATION_MS;
                    target_bias = TURN_LEFT_BIAS_ERROR;
                    break;
                case RIGHT:
                    target_angle = TURN_RIGHT_ANGLE;
                    target_speed = TURN_RIGHT_SPEED;
                    turn_duration = TURN_RIGHT_DURATION_MS;
                    target_bias = TURN_RIGHT_BIAS_ERROR;
                    break;
                case ROUNDABOUT:
                    target_angle = TURN_ROUNDABOUT_ANGLE;
                    target_speed = TURN_ROUNDABOUT_SPEED;
                    turn_duration = TURN_ROUNDABOUT_DURATION_MS;
                    target_bias = TURN_ROUNDABOUT_BIAS;
                    break;
                case RIGHT_ROUND:
                    target_angle = TURN_RIGHT_ROUND_ANGLE;
                    target_speed = TURN_RIGHT_ROUND_SPEED;
                    turn_duration = TURN_RIGHT_ROUND_DURATION_MS;
                    target_bias = TURN_RIGHT_ROUND_BIAS;
                    break;
                case HUB_LEFT:
                    target_angle = TURN_HUB_LEFT_ANGLE;
                    target_speed = TURN_HUB_LEFT_SPEED;
                    turn_duration = TURN_HUB_LEFT_DURATION_MS;
                    target_bias = TURN_HUB_LEFT_BIAS_ERROR;
                    break;
                case HUB_RIGHT:
                    target_angle = TURN_HUB_RIGHT_ANGLE;
                    target_speed = TURN_HUB_RIGHT_SPEED;
                    turn_duration = TURN_HUB_RIGHT_DURATION_MS;
                    target_bias = TURN_HUB_RIGHT_BIAS_ERROR;
                    break;
                default:
                    pid_override = false;
                    continue;
            }

            // Apply steering and motor speed
            servo_set_angle(target_angle);
            // motor_set_speed(target_speed);

            // Wait for the duration, or until a NEW turn command is received
            enum Direction next_turn;
            if (xQueueReceive(turn_queue, &next_turn, pdMS_TO_TICKS(turn_duration)) == pdTRUE) {
                // We received a new turn while performing the current turn.
                // Re-queue the new request so it gets processed in the next loop and aborts current wait.
                xQueueSendToFront(turn_queue, &next_turn, 0);
            } else {
                // Time up organically: initialize bias for resuming PID tracking
                active_turn_bias_error = target_bias;
                turn_bias_end_ms = esp_timer_get_time() / 1000 + TURN_BIAS_DURATION_MS;
            }

            // After the turn duration completes (or is aborted), hand control back to PID
            // If it was aborted, the next loop iteration will immediately trigger and take over.
            pid_override = false;
        }
    }
}

/**
 * @brief Instantiates the turning task and queues a specific branch instruction.
 * 
 * @param direction Desired turning logic macro.
 */
void turn_parser(enum Direction direction)
{
    if (turn_queue == NULL) {
        turn_queue = xQueueCreate(1, sizeof(enum Direction));
        xTaskCreate(task_turning, "task_turning", 2048, NULL, 5, NULL);
    }
    
    // Send the turn instruction (override any existing unhandled turn by overwriting the queue if full, or just pass it)
    xQueueOverwrite(turn_queue, &direction);
}

