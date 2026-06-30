#include "Sense.h"
#include <stdio.h>
#include "esp_log.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"

static const char *TAG = "SENSE";

static adc_oneshot_unit_handle_t adc1_handle;
static adc_cali_handle_t adc1_cali_handle = NULL;

static bool adc1_calibrated = false;

// GPIO 35 is ADC1_CHANNEL_7
#define BATTERY_ADC_UNIT     ADC_UNIT_1
#define BATTERY_ADC_CHANNEL  ADC_CHANNEL_7

// GPIO 34 is ADC1_CHANNEL_6
#define RAW_ADC_UNIT         ADC_UNIT_1
#define RAW_ADC_CHANNEL      ADC_CHANNEL_6

/**
 * @brief Initialize the curve or line fitting calibration data.
 * 
 * @param unit The ADC unit numeric ID.
 * @param channel The specific ADC channel.
 * @param atten The requested attenuation scale.
 * @param out_handle Outward handle pointer representing the created scheme.
 * @return true If calibration profiling succeeds.
 * @return false If calibration routines fail or are unsupported.
 */
static bool init_calibration(adc_unit_t unit, adc_channel_t channel, adc_atten_t atten, adc_cali_handle_t *out_handle)
{
    esp_err_t ret = ESP_FAIL;
    bool calibrated = false;

#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
    if (!calibrated) {
        adc_cali_curve_fitting_config_t cali_config = {
            .unit_id = unit,
            .chan = channel,
            .atten = atten,
            .bitwidth = ADC_BITWIDTH_DEFAULT,
        };
        ret = adc_cali_create_scheme_curve_fitting(&cali_config, out_handle);
        if (ret == ESP_OK) {
            calibrated = true;
        }
    }
#endif

#if ADC_CALI_SCHEME_LINE_FITTING_SUPPORTED
    if (!calibrated) {
        adc_cali_line_fitting_config_t cali_config = {
            .unit_id = unit,
            .atten = atten,
            .bitwidth = ADC_BITWIDTH_DEFAULT,
        };
        ret = adc_cali_create_scheme_line_fitting(&cali_config, out_handle);
        if (ret == ESP_OK) {
            calibrated = true;
        }
    }
#endif

    if (calibrated) {
        ESP_LOGI(TAG, "Calibration Success for unit %d", unit);
    } else {
        ESP_LOGW(TAG, "Calibration failed");
    }
    return calibrated;
}

/**
 * @brief Initialize ADC hardware units and map attenuation profiles across standard GPIO.
 */
void Sense_Init(void)
{
    // Check attenuation version (DB_12 is standard in v5.3+ including v6)
    adc_atten_t atten = ADC_ATTEN_DB_12;

    // === Init ADC1 for Battery Voltage (Pin 35) ===
    adc_oneshot_unit_init_cfg_t init_config1 = {
        .unit_id = BATTERY_ADC_UNIT,
    };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&init_config1, &adc1_handle));

    adc_oneshot_chan_cfg_t config = {
        .bitwidth = ADC_BITWIDTH_DEFAULT,
        .atten = atten,
    };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc1_handle, BATTERY_ADC_CHANNEL, &config));

    // Try calibration for ADC1
    adc1_calibrated = init_calibration(BATTERY_ADC_UNIT, BATTERY_ADC_CHANNEL, atten, &adc1_cali_handle);

    // === Init ADC1 for Raw Voltage (Pin 34) ===
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc1_handle, RAW_ADC_CHANNEL, &config));
}

#define NUMBER_OF_SAMPLES    10

/**
 * @brief Update helper to sample and push metric traces for debug observation.
 */
void Sense_Update(void)
{
    int battery_pct = Sense_GetBatteryPercentage();
    bool is_charging = Sense_IsCharging();

    printf("Battery: %d%% | Charging: %s\n", battery_pct, is_charging ? "YES" : "NO");
}

/**
 * @brief Retrieve current charging state.
 * 
 * @return true if detected voltage breaks 0.25v threshold.
 * @return false if the threshold is unmet.
 */
bool Sense_IsCharging(void)
{
    int pin34_raw = 0;
    esp_err_t ret = adc_oneshot_read(adc1_handle, RAW_ADC_CHANNEL, &pin34_raw);
    
    if (ret == ESP_OK) {
        float voltage = 0.0f;
        if (adc1_calibrated) {
            int voltage_mv = 0;
            ESP_ERROR_CHECK(adc_cali_raw_to_voltage(adc1_cali_handle, pin34_raw, &voltage_mv));
            voltage = voltage_mv / 1000.0f;
        } else {
            voltage = (pin34_raw / 4095.0f) * 3.3f;
        }
        return (voltage > 0.25f);
    }
    
    return false;
}

/**
 * @brief Calculates battery capacity by averaging numerous raw ADC polling traces.
 * 
 * @return uint8_t Rounded battery percentage.
 */
uint8_t Sense_GetBatteryPercentage(void)
{
    long total_raw = 0;
    for (int i = 0; i < NUMBER_OF_SAMPLES; i++) {
        int raw = 0;
        adc_oneshot_read(adc1_handle, BATTERY_ADC_CHANNEL, &raw);
        total_raw += raw;
    }
    
    int avg_raw = total_raw / NUMBER_OF_SAMPLES;
    
    float battery_v = 0.0f;
    if (adc1_calibrated) {
        int voltage_mv = 0;
        adc_cali_raw_to_voltage(adc1_cali_handle, avg_raw, &voltage_mv);
        battery_v = (voltage_mv / 1000.0f) * 1.777f;
    } else {
        float pin_voltage = (avg_raw / 4095.0f) * 3.3f;
        battery_v = pin_voltage * 1.777f;
    }

    // Basic LiPo estimate: 4.2V = 100%, 3.2V = 0%
    float pct = (battery_v - 3.2f) / (4.2f - 3.2f) * 100.0f;
    if (pct > 100.0f) pct = 100.0f;
    if (pct < 0.0f) pct = 0.0f;
    
    return (uint8_t)pct;
}
