#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* -------------------------------------------------------------------------- */
/* Enums                                                                     */
/* -------------------------------------------------------------------------- */

typedef enum Direction {
    LEFT = 0,         /**< Turn left */
    RIGHT = 1,        /**< Turn right */
    STRAIGHT = 2,     /**< Go straight */
    ROUNDABOUT = 3,   /**< Roundabout navigation */
    RIGHT_ROUND = 4,   /**< Right turn at roundabout */
    HUB_LEFT = 5,     /**< Left turn at HUB */
    HUB_RIGHT = 6     /**< Right turn at HUB */
} Direction;

typedef enum ScreenStatus {
    SC_NORMAL = 0,    /**< Normal driving screen */
    SC_LOADING = 1,   /**< Loading packages screen */
    SC_DELIVERING = 2,/**< Delivering packages screen */
    SC_CHARGING = 3,  /**< Charging state screen */
    SC_DEFAULT = 4 
} ScreenStatus;

/* -------------------------------------------------------------------------- */
/* RX struct (incoming commands)                                             */
/* -------------------------------------------------------------------------- */

typedef struct
{
    Direction direction;
    uint8_t speed;
    bool stop;
    uint8_t special_tag;
    ScreenStatus screen_status;
    uint8_t package_inout;
    uint32_t transfer_duration_ms;
} receive_msg_t;

/* -------------------------------------------------------------------------- */
/* API                                                                     */
/* -------------------------------------------------------------------------- */

void mqtt_app_start(void);
void mqtt_task(void *arg);

/* -------------------------------------------------------------------------- */
/* TX setters (auto generated style)                                        */
/* -------------------------------------------------------------------------- */

void mqtt_set_rfid(const char *uid);

void mqtt_set_battery(uint8_t v);
void mqtt_set_speed(uint8_t v);
void mqtt_set_pid(uint8_t v);

void mqtt_set_charging(bool v);
void mqtt_set_lost(bool v);

const receive_msg_t* mqtt_get_rx(void);

#ifdef __cplusplus
}
#endif