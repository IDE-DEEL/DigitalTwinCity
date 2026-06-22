/*
 * config.h  —  Central configuration for the Magnet Line Tracker
 *
 * All tunable parameters live here so every subsystem can be adjusted
 * from a single place.  Hardware pin assignments, PID gains, task
 * priorities / stack sizes and loop timings are all defined below.
 *
 * Sections:
 *   1. I2C bus (MLX90393 magnetometers)
 *   2. MLX90393 sensor settings
 *   3. Calibration
 *   4. Position estimation
 *   5. PID steering controller
 *   6. Steering servo  (LEDC timer 0, channel 0)
 *   7. TB6612 motor driver  (LEDC timer 1, channel 1)
 *   8. RC522 RFID reader (SPI2)
 *   9. FreeRTOS task configuration
 *  10. Misc loop timing
 */

#pragma once

#include "esp_log.h"   /**< included so log-level macros are available */

/** 
 * @defgroup I2C_Config I2C Bus Configuration
 * @{
 */
#define I2C_MASTER_NUM          I2C_NUM_0
#define I2C_MASTER_SDA_IO       17
#define I2C_MASTER_SCL_IO       16
#define I2C_MASTER_FREQ_HZ      100000      /**< 100 kHz standard mode */
#define I2C_TIMEOUT_MS          100
/** @} */

/** 
 * @defgroup Sensor_Config MLX90393 Sensor Settings
 * @{
 */
#define MLX90393_ADDR_RIGHT     0x0C        /**< RIGHT side (+10 mm from centre) */
#define MLX90393_ADDR_LEFT      0x0E        /**< LEFT side (-10 mm from centre) */
#define MLX90393_NUM_SENSORS    2

#define MLX90393_GAIN_SEL       5           /**< GAIN_SEL register 0 — 5 = x1.33 gain */
#define MLX90393_DIG_FILT       5           /**< DIG_FILT register 2 — 5 = moderate noise filter (~5 ms conversion) */
/** @} */

/** 
 * @defgroup Calibration_Config Calibration Settings
 * @{
 */
#define CALIB_SAMPLES           30          /**< readings to average */
#define CALIB_DELAY_MS          20          /**< ms between each sample */
#define CALIB_COUNTDOWN_SEC     1           /**< countdown before sampling */
#define CALIB_MIN_GOOD_SAMPLES  5           /**< minimum usable samples */

#define MAGNET_STATIC_OFFSET_ENABLE   0     /**< Set to 1 to bypass startup sampling */

#define MAGNET_STATIC_OFFSET_RIGHT_X  790.2f
#define MAGNET_STATIC_OFFSET_RIGHT_Y  198.3f
#define MAGNET_STATIC_OFFSET_RIGHT_Z  -350.9f

#define MAGNET_STATIC_OFFSET_LEFT_X   1052.6f
#define MAGNET_STATIC_OFFSET_LEFT_Y   105.1f
#define MAGNET_STATIC_OFFSET_LEFT_Z   547.9f
/** @} */

/** 
 * @defgroup Pos_Estimator Position Estimation
 * @{
 */
#define SENSOR_SPACING_MM       20.0f       /**< centre-to-centre distance in mm */
#define POS_SCALE_MM            SENSOR_SPACING_MM
#define POS_DEAD_ZONE_MM        1.0f        /**< treat as centred below this */
#define MAG_MIN_THRESHOLD       100.0f      /**< ignore if total field too small */
/** @} */

/** 
 * @defgroup PID_Config PID Steering Controller
 * @{
 */
#define PID_KP                  5.0f 
#define PID_KI                  0.02f 
#define PID_KD                  8.0f 
#define PID_IMAX                30.0f       /**< anti-windup integrator clamp */

#define LINE_LOST_TIMEOUT_MS    1500        /**< turn off actuators if off line for this long */
/** @} */

/** 
 * @defgroup Servo_Config Steering Servo
 * @{
 */
#define SERVO_RANGE_MODE        1           /**< 0 = STANDARD  |  1 = EXTENDED */

#define SERVO_GPIO              14
#define SERVO_PWM_LEDC_TIMER    LEDC_TIMER_0
#define SERVO_PWM_LEDC_CHANNEL  0
#define SERVO_PWM_FREQ_HZ       50
#define SERVO_PWM_RESOLUTION    LEDC_TIMER_16_BIT
#define SERVO_ANGLE_MIN         0
#define SERVO_ANGLE_MAX         180

#define SERVO_STD_DUTY_AT_0_DEG     3277
#define SERVO_STD_DUTY_AT_180_DEG   6553
#define SERVO_STD_ANGLE_FORWARD     90
#define SERVO_STD_ANGLE_LEFT_MAX    170
#define SERVO_STD_ANGLE_RIGHT_MAX   10

#define SERVO_EXT_DUTY_AT_0_DEG     1638
#define SERVO_EXT_DUTY_AT_180_DEG   8192
#define SERVO_EXT_ANGLE_FORWARD     90
#define SERVO_EXT_ANGLE_LEFT_MAX    155
#define SERVO_EXT_ANGLE_RIGHT_MAX   25

#if SERVO_RANGE_MODE == 1
  #define SERVO_DUTY_AT_0_DEG     SERVO_EXT_DUTY_AT_0_DEG
  #define SERVO_DUTY_AT_180_DEG   SERVO_EXT_DUTY_AT_180_DEG
  #define SERVO_ANGLE_FORWARD     SERVO_EXT_ANGLE_FORWARD
  #define SERVO_ANGLE_LEFT_MAX    SERVO_EXT_ANGLE_LEFT_MAX
  #define SERVO_ANGLE_RIGHT_MAX   SERVO_EXT_ANGLE_RIGHT_MAX
#else
  #define SERVO_DUTY_AT_0_DEG     SERVO_STD_DUTY_AT_0_DEG
  #define SERVO_DUTY_AT_180_DEG   SERVO_STD_DUTY_AT_180_DEG
  #define SERVO_ANGLE_FORWARD     SERVO_STD_ANGLE_FORWARD
  #define SERVO_ANGLE_LEFT_MAX    SERVO_STD_ANGLE_LEFT_MAX
  #define SERVO_ANGLE_RIGHT_MAX   SERVO_STD_ANGLE_RIGHT_MAX
#endif
/** @} */

/** 
 * @defgroup Motor_Config TB6612 Motor Driver
 * @{
 */
#define MOTOR_GPIO_STBY         22
#define MOTOR_GPIO_PWMA         19
#define MOTOR_GPIO_AIN1         23
#define MOTOR_GPIO_AIN2         18
#define MOTOR_PWM_LEDC_TIMER    LEDC_TIMER_1
#define MOTOR_PWM_LEDC_CHANNEL  1
#define MOTOR_PWM_FREQ_HZ       20000       /**< 20 kHz — inaudible */
#define MOTOR_PWM_RESOLUTION    LEDC_TIMER_10_BIT
#define MOTOR_DEFAULT_SPEED_PCT 50         /**< default run speed (percentage) */
#define MOTOR_MIN_MAP_PCT       40
#define MOTOR_MAX_MAP_PCT       55   
#define MOTOR_REVERSE_DIRECTION 1           /**< Set to 1 to reverse the motor direction in software */
/** @} */

/** 
 * @defgroup RFID_Config PN532 RFID Reader
 * @{
 */
#define RFID_SPI_HOST           SPI2_HOST
#define RFID_SPI_CLOCK_HZ       (5 * 1000 * 1000) /**< 5 MHz */
#define RFID_GPIO_SCK           26
#define RFID_GPIO_MISO          32
#define RFID_GPIO_MOSI          25
#define RFID_GPIO_CS            4
#define RFID_GPIO_RST           5
/** @} */

/** 
 * @defgroup Task_Config FreeRTOS Tasks
 * @{
 */
#define TASK_LINE_TRACKER_NAME      "line_tracker"
#define TASK_LINE_TRACKER_STACK     4096
#define TASK_LINE_TRACKER_PRIORITY  20

#define TASK_RFID_SCANNER_NAME      "rfid_scanner"
#define TASK_RFID_SCANNER_STACK     4096        /* bytes                   */
#define TASK_RFID_SCANNER_PRIORITY  20

#define TASK_OLED_NAME              "oled_task"
#define TASK_OLED_STACK             6144        /* bytes                   */
#define TASK_OLED_PRIORITY          3

#define TASK_LVGL_MAX_DELAY_MS      1000
#define TASK_LVGL_MIN_DELAY_MS      5
#define TASK_LVGL_TICK_PERIOD_MS    2

#define TASK_BATTERY_MONITOR_NAME       "battery_monitor"
#define TASK_BATTERY_MONITOR_STACK      2048
#define TASK_BATTERY_MONITOR_PRIORITY   2
#define BATTERY_MONITOR_POLL_MS         60000   /* 60 seconds */

/* ═══════════════════════════════════════════════════════════════════════
 * 10. Loop timing
 * ═══════════════════════════════════════════════════════════════════════ */
#define LINE_TRACKER_LOOP_MS        20          /* 50 Hz control loop      */
#define RFID_SCANNER_POLL_MS        50         /* RFID polling period     */
#define DIAG_PRINT_INTERVAL_US      2000000     /* diagnostics every 2 s   */

/* ═══════════════════════════════════════════════════════════════════════
 * 11. OLED & LVGL Display Settings
 * ═══════════════════════════════════════════════════════════════════════ */
#define OLED_CONTROLLER_SSD1306     1
#define OLED_CONTROLLER_SH1106      2

/* Change this to switch between SSD1306 and SH1106 */
#define OLED_CONTROLLER             OLED_CONTROLLER_SH1106

#define OLED_LCD_PIXEL_CLOCK_HZ     (400 * 1000)
#define OLED_PIN_NUM_SDA            I2C_MASTER_SDA_IO /* using the shared bus */
#define OLED_PIN_NUM_SCL            I2C_MASTER_SCL_IO /* using the shared bus */
#define OLED_PIN_NUM_RST            -1
#define OLED_I2C_HW_ADDR            0x3C
#define OLED_SH1106_COLUMN_OFFSET   2

#define OLED_LCD_H_RES              128
#define OLED_LCD_V_RES              64
#define OLED_LCD_CMD_BITS           8
#define OLED_LCD_PARAM_BITS         8

#define LVGL_PALETTE_SIZE           8
