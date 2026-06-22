#ifndef SENSE_H
#define SENSE_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stdint.h>

/**
 * @brief Initialize the ADC driver targeting the specific voltage divider/charging pins (35 & 34).
 */
void Sense_Init(void);

/**
 * @brief Measure the ADC lines, log debug statistics, and sync metrics down to the UI / Backend.
 */
void Sense_Update(void);

/**
 * @brief Checks if the device is currently receiving a charge voltage.
 * 
 * @return true If the charging port pin reading is > 0.5V.
 * @return false Otherwise.
 */
bool Sense_IsCharging(void);

/**
 * @brief Reads average battery voltage and correlates it against a typical 1S curve.
 * 
 * @return uint8_t Battery percentage metric (0 - 100).
 */
uint8_t Sense_GetBatteryPercentage(void);

#ifdef __cplusplus
}
#endif

#endif // SENSE_H
