/*
 * Magnets.c  —  MLX90393 dual-magnetometer driver implementation
 *
 * Two sensors are read over I2C; the difference in calibrated
 * field magnitude gives a lateral position estimate that is used
 * by the line-tracker PID controller.
 *
 * Internal helpers (mlx_*) are all static and not exposed in the header.
 * The public API is defined in include/magnets.h.
 */

#include "magnets.h"
#include "config.h"

#include <stdio.h>
#include <math.h>
#include "driver/i2c_master.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "Magnets";

/* ── Global I2C bus handle ──────────────────────────────────────────── */
i2c_master_bus_handle_t g_i2c_bus_handle = NULL;

/* ── Sensor address table & handles ─────────────────────────────────── */
static const uint8_t s_addrs[MLX90393_NUM_SENSORS] = {
    MLX90393_ADDR_RIGHT,
    MLX90393_ADDR_LEFT
};

static i2c_master_dev_handle_t s_dev_handles[MLX90393_NUM_SENSORS];

/* ── Calibration offsets (set by magnets_calibrate) ─────────────────── */
static struct {
    float x[MLX90393_NUM_SENSORS];
    float y[MLX90393_NUM_SENSORS];
    float z[MLX90393_NUM_SENSORS];
    bool  valid;
} s_calib = { .valid = false };

/* ═══════════════════════════════════════════════════════════════════════
 * MLX90393 command / register constants
 * ═══════════════════════════════════════════════════════════════════════ */
#define MLX_CMD_NOP         0x00
#define MLX_CMD_EXIT        0x80
#define MLX_CMD_RESET       0xF0
#define MLX_CMD_SM_XYZ      0x3E    /* Start single measurement X+Y+Z   */
#define MLX_CMD_RM_XYZ      0x4E    /* Read  measurement X+Y+Z          */
#define MLX_CMD_RR          0x50    /* Read register                     */
#define MLX_CMD_WR          0x60    /* Write register                    */
#define MLX_STATUS_ERROR    (1 << 4)

/* ═══════════════════════════════════════════════════════════════════════
 * Internal I2C helpers
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @brief Inner helper sending one command byte, responding back via buffer array.
 */
static esp_err_t mlx_cmd_read(i2c_master_dev_handle_t dev, uint8_t cmd,
                               uint8_t *rx, size_t rx_len)
{
    return i2c_master_transmit_receive(dev, &cmd, 1, rx, rx_len, -1);
}

/**
 * @brief Sends a single setup byte resolving an attached chip's status code.
 */
static esp_err_t mlx_cmd(i2c_master_dev_handle_t dev, uint8_t cmd, uint8_t *status)
{
    return i2c_master_transmit_receive(dev, &cmd, 1, status, 1, -1);
}

/**
 * @brief Read 16-bit register from the magnetometer arrays.
 */
static esp_err_t mlx_read_reg(i2c_master_dev_handle_t dev, uint8_t reg, uint16_t *value)
{
    uint8_t tx[2] = { MLX_CMD_RR, (uint8_t)(reg << 2) };
    uint8_t rx[3];
    esp_err_t ret = i2c_master_transmit_receive(dev, tx, 2, rx, 3, -1);
    if (ret == ESP_OK) {
        *value = ((uint16_t)rx[1] << 8) | rx[2];
    }
    return ret;
}

/**
 * @brief Store 16-bit struct blocks inside the sensor EEPROM memory array.
 */
static esp_err_t mlx_write_reg(i2c_master_dev_handle_t dev, uint8_t reg, uint16_t value)
{
    uint8_t tx[4] = {
        MLX_CMD_WR,
        (uint8_t)(value >> 8),
        (uint8_t)(value & 0xFF),
        (uint8_t)(reg << 2)
    };
    uint8_t rx[1];
    return i2c_master_transmit_receive(dev, tx, 4, rx, 1, -1);
}

/* ═══════════════════════════════════════════════════════════════════════
 * Single-sensor reset + configure
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @brief Purge a specific address map index of its volatile internal routing.
 */
static esp_err_t mlx_reset_sensor(int idx)
{
    uint8_t status;
    i2c_master_dev_handle_t dev = s_dev_handles[idx];
    uint8_t addr = s_addrs[idx];

    /* EXIT first (in case sensor was in continuous mode) */
    mlx_cmd(dev, MLX_CMD_EXIT, &status);   /* ignore error — sensor may be idle */
    vTaskDelay(pdMS_TO_TICKS(5));

    esp_err_t ret = mlx_cmd(dev, MLX_CMD_RESET, &status);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[0x%02X] RESET failed: %s", addr, esp_err_to_name(ret));
        return ret;
    }
    vTaskDelay(pdMS_TO_TICKS(10));
    ESP_LOGI(TAG, "[0x%02X] Reset OK  status=0x%02X", addr, status);
    return ESP_OK;
}

/**
 * @brief Reconfigure standard register sets on target array.
 */
static esp_err_t mlx_configure_sensor(int idx)
{
    esp_err_t ret;
    i2c_master_dev_handle_t dev = s_dev_handles[idx];
    uint8_t addr = s_addrs[idx];

    /*
     * Register 0x00:
     *   GAIN_SEL [7:4] = MLX90393_GAIN_SEL (5 = x1.33)
     *   HALLCONF  [3:0] = 0x0C (default Hall plate configuration)
     */
    uint16_t reg0 = (uint16_t)(MLX90393_GAIN_SEL << 4) | 0x0C;
    ret = mlx_write_reg(dev, 0x00, reg0);
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "[0x%02X] Reg0 write failed: %s", addr, esp_err_to_name(ret));
    } else {
        ESP_LOGI(TAG, "[0x%02X] Reg0 = 0x%04X  (GAIN_SEL=%d)", addr, reg0, MLX90393_GAIN_SEL);
    }

    /*
     * Register 0x02:
     *   OSR2   [12:11] = 0  (no 2nd oversampling)
     *   RES    [10:8]  = 0  (16-bit raw output)
     *   DIG_FILT [7:5] = MLX90393_DIG_FILT (5 ≈ 5 ms conversion)
     *   OSR    [4:3]   = 0  (fastest single-shot)
     */
    uint16_t reg2 = (uint16_t)((0 << 11) | (0 << 8) | (MLX90393_DIG_FILT << 5) | (0 << 3));
    ret = mlx_write_reg(dev, 0x02, reg2);
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "[0x%02X] Reg2 write failed: %s", addr, esp_err_to_name(ret));
    } else {
        ESP_LOGI(TAG, "[0x%02X] Reg2 = 0x%04X  (DIG_FILT=%d)", addr, reg2, MLX90393_DIG_FILT);
    }

    /* Verify communication with a NOP */
    uint8_t status;
    ret = mlx_cmd(dev, MLX_CMD_NOP, &status);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[0x%02X] NOP failed: %s", addr, esp_err_to_name(ret));
        return ret;
    }
    ESP_LOGI(TAG, "[0x%02X] Init OK  NOP status=0x%02X", addr, status);
    return ESP_OK;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Single XYZ measurement
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @brief Dispatch a single poll snapshot on an MLX sensor, resolving its XYZ frame array back.
 */
static esp_err_t mlx_read_xyz(int idx,
                               int16_t *x, int16_t *y, int16_t *z)
{
    uint8_t   status;
    uint8_t   rx[7];
    i2c_master_dev_handle_t dev = s_dev_handles[idx];
    uint8_t addr = s_addrs[idx];

    /* Trigger single measurement */
    esp_err_t ret = mlx_cmd(dev, MLX_CMD_SM_XYZ, &status);
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "[0x%02X] SM_XYZ failed: %s", addr, esp_err_to_name(ret));
        return ret;
    }

    /* Wait for conversion — OSR=0, DIG_FILT=5 takes ~5–8 ms */
    vTaskDelay(pdMS_TO_TICKS(8));

    /* Read the result */
    ret = mlx_cmd_read(dev, MLX_CMD_RM_XYZ, rx, 7);
    if (ret != ESP_OK) {
        ESP_LOGW(TAG, "[0x%02X] RM_XYZ failed: %s", addr, esp_err_to_name(ret));
        return ret;
    }

    if (rx[0] & MLX_STATUS_ERROR) {
        ESP_LOGW(TAG, "[0x%02X] Error bit set in status: 0x%02X", addr, rx[0]);
        return ESP_ERR_INVALID_RESPONSE;
    }

    /* Reconstruct signed 16-bit values from big-endian bytes */
    *x = (int16_t)((rx[1] << 8) | rx[2]);
    *y = (int16_t)((rx[3] << 8) | rx[4]);
    *z = (int16_t)((rx[5] << 8) | rx[6]);
    return ESP_OK;
}

/* ═══════════════════════════════════════════════════════════════════════
 * Public API
 * ═══════════════════════════════════════════════════════════════════════ */

esp_err_t magnets_i2c_init(void)
{
    if (g_i2c_bus_handle != NULL) {
        return ESP_OK; /* Already initialized */
    }

    i2c_master_bus_config_t bus_config = {
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .i2c_port = I2C_MASTER_NUM,
        .sda_io_num = I2C_MASTER_SDA_IO,
        .scl_io_num = I2C_MASTER_SCL_IO,
        .flags.enable_internal_pullup = true,
    };
    esp_err_t err = i2c_new_master_bus(&bus_config, &g_i2c_bus_handle);
    if (err == ESP_OK) {
        ESP_LOGI(TAG, "I2C bus ready  (SDA=%d  SCL=%d  %d Hz)",
                 I2C_MASTER_SDA_IO, I2C_MASTER_SCL_IO, I2C_MASTER_FREQ_HZ);
    }
    return err;
}

esp_err_t magnets_sensor_init(void)
{
    bool all_ok = true;

    for (int i = 0; i < MLX90393_NUM_SENSORS; i++) {
        i2c_device_config_t dev_cfg = {
            .dev_addr_length = I2C_ADDR_BIT_LEN_7,
            .device_address = s_addrs[i],
            .scl_speed_hz = I2C_MASTER_FREQ_HZ,
        };
        esp_err_t err = i2c_master_bus_add_device(g_i2c_bus_handle, &dev_cfg, &s_dev_handles[i]);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "Failed to add device 0x%02X to bus", s_addrs[i]);
            all_ok = false;
            continue;
        }

        const char *side = (i == 0) ? "RIGHT" : "LEFT ";
        esp_err_t ret = mlx_reset_sensor(i);
        if (ret != ESP_OK) {
            ESP_LOGE(TAG, "Sensor %s (0x%02X): reset FAILED", side, s_addrs[i]);
            all_ok = false;
            continue;
        }
        ret = mlx_configure_sensor(i);
        if (ret != ESP_OK) {
            ESP_LOGE(TAG, "Sensor %s (0x%02X): configure FAILED", side, s_addrs[i]);
            all_ok = false;
        } else {
            ESP_LOGI(TAG, "Sensor %s (0x%02X): ready", side, s_addrs[i]);
        }
    }

    return all_ok ? ESP_OK : ESP_FAIL;
}

esp_err_t magnets_calibrate(void)
{
#if MAGNET_STATIC_OFFSET_ENABLE
    s_calib.x[0] = MAGNET_STATIC_OFFSET_RIGHT_X;
    s_calib.y[0] = MAGNET_STATIC_OFFSET_RIGHT_Y;
    s_calib.z[0] = MAGNET_STATIC_OFFSET_RIGHT_Z;
    s_calib.x[1] = MAGNET_STATIC_OFFSET_LEFT_X;
    s_calib.y[1] = MAGNET_STATIC_OFFSET_LEFT_Y;
    s_calib.z[1] = MAGNET_STATIC_OFFSET_LEFT_Z;
    s_calib.valid = true;

    ESP_LOGI(TAG, "Using static magnet offsets from config.h (runtime calibration skipped)");
    ESP_LOGI(TAG, "RIGHT offset: X=%.1f Y=%.1f Z=%.1f",
             s_calib.x[0], s_calib.y[0], s_calib.z[0]);
    ESP_LOGI(TAG, "LEFT  offset: X=%.1f Y=%.1f Z=%.1f",
             s_calib.x[1], s_calib.y[1], s_calib.z[1]);
    return ESP_OK;
#endif

    printf("\n============================================\n");
    printf("       CALIBRATION — NO MAGNET NEARBY\n");
    printf("  Keep all magnets away from both sensors.\n");
    printf("============================================\n");

    for (int s = CALIB_COUNTDOWN_SEC; s > 0; s--) {
        printf("  Calibrating in %d ...\n", s);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
    printf("  Sampling %d readings ...\n", CALIB_SAMPLES);

    /* Accumulate sums */
    double sum_x[MLX90393_NUM_SENSORS] = {0};
    double sum_y[MLX90393_NUM_SENSORS] = {0};
    double sum_z[MLX90393_NUM_SENSORS] = {0};
    int    good = 0;

    for (int n = 0; n < CALIB_SAMPLES; n++) {
        int16_t xv[MLX90393_NUM_SENSORS];
        int16_t yv[MLX90393_NUM_SENSORS];
        int16_t zv[MLX90393_NUM_SENSORS];
        bool    ok = true;

        for (int i = 0; i < MLX90393_NUM_SENSORS; i++) {
            if (mlx_read_xyz(i, &xv[i], &yv[i], &zv[i]) != ESP_OK) {
                ok = false;
                break;
            }
        }
        if (ok) {
            for (int i = 0; i < MLX90393_NUM_SENSORS; i++) {
                sum_x[i] += xv[i];
                sum_y[i] += yv[i];
                sum_z[i] += zv[i];
            }
            good++;
        }
        vTaskDelay(pdMS_TO_TICKS(CALIB_DELAY_MS));
    }

    if (good < CALIB_MIN_GOOD_SAMPLES) {
        ESP_LOGE(TAG, "Calibration failed — only %d/%d good samples",
                 good, CALIB_SAMPLES);
        return ESP_FAIL;
    }

    /* Compute and store averages */
    for (int i = 0; i < MLX90393_NUM_SENSORS; i++) {
        s_calib.x[i] = (float)(sum_x[i] / good);
        s_calib.y[i] = (float)(sum_y[i] / good);
        s_calib.z[i] = (float)(sum_z[i] / good);
    }
    s_calib.valid = true;

    printf("\n  Calibration complete  (%d samples)\n", good);
    printf("  RIGHT sensor offset:  X=%7.1f  Y=%7.1f  Z=%7.1f\n",
           s_calib.x[0], s_calib.y[0], s_calib.z[0]);
    printf("  LEFT  sensor offset:  X=%7.1f  Y=%7.1f  Z=%7.1f\n",
           s_calib.x[1], s_calib.y[1], s_calib.z[1]);
    printf("============================================\n\n");

    return ESP_OK;
}

esp_err_t magnets_read_position(float *pos_mm)
{
    if (!s_calib.valid) {
        ESP_LOGE(TAG, "magnets_read_position called before calibration!");
        return ESP_ERR_INVALID_STATE;
    }

    int16_t xv[MLX90393_NUM_SENSORS];
    int16_t yv[MLX90393_NUM_SENSORS];
    int16_t zv[MLX90393_NUM_SENSORS];

    for (int i = 0; i < MLX90393_NUM_SENSORS; i++) {
        esp_err_t ret = mlx_read_xyz(i, &xv[i], &yv[i], &zv[i]);
        if (ret != ESP_OK) {
            ESP_LOGW(TAG, "Read failed for sensor %d: %s", i, esp_err_to_name(ret));
            return ret;
        }
    }

    /* Subtract calibration offsets to isolate the magnet-strip field */
    float mx[MLX90393_NUM_SENSORS];
    float my[MLX90393_NUM_SENSORS];
    float mz[MLX90393_NUM_SENSORS];
    float mag[MLX90393_NUM_SENSORS];

    /* Exponential Moving Average (EMA) state for smoothing magnet magnitudes */
    static float s_mag_ema[MLX90393_NUM_SENSORS] = {-1.0f, -1.0f};
    const float EMA_ALPHA = 0.3f; /* 0.0 = infinite smoothing, 1.0 = no smoothing */

    for (int i = 0; i < MLX90393_NUM_SENSORS; i++) {
        mx[i] = (float)xv[i] - s_calib.x[i];
        my[i] = (float)yv[i] - s_calib.y[i];
        mz[i] = (float)zv[i] - s_calib.z[i];
        
        float raw_mag = sqrtf(mx[i]*mx[i] + my[i]*my[i] + mz[i]*mz[i]);
        
        /* Initialize EMA on first run, otherwise apply filter */
        if (s_mag_ema[i] < 0.0f) {
            s_mag_ema[i] = raw_mag;
        } else {
            s_mag_ema[i] = EMA_ALPHA * raw_mag + (1.0f - EMA_ALPHA) * s_mag_ema[i];
        }
        
        mag[i] = s_mag_ema[i];
    }

    float mag_sum = mag[0] + mag[1];

    if (mag_sum < MAG_MIN_THRESHOLD) {
        /* Total field too weak — no meaningful strip detected */
        *pos_mm = 0.0f;
    } else {
        /*
         * Normalised difference:  -1 = strip fully left,  +1 = fully right
         * Scaled to millimetres by POS_SCALE_MM.
         */
        float norm_diff = (mag[0] - mag[1]) / mag_sum;
        *pos_mm = norm_diff * POS_SCALE_MM;
    }

    return ESP_OK;
}

esp_err_t magnets_read_diagnostics(float mx_out[], float my_out[], float mz_out[],
                                   float mag_out[], float *mag_sum_out, float *pos_mm_out)
{
    if (!s_calib.valid) {
        ESP_LOGE(TAG, "magnets_read_diagnostics called before calibration!");
        return ESP_ERR_INVALID_STATE;
    }

    int16_t xv[MLX90393_NUM_SENSORS];
    int16_t yv[MLX90393_NUM_SENSORS];
    int16_t zv[MLX90393_NUM_SENSORS];

    for (int i = 0; i < MLX90393_NUM_SENSORS; i++) {
        esp_err_t ret = mlx_read_xyz(i, &xv[i], &yv[i], &zv[i]);
        if (ret != ESP_OK) {
            ESP_LOGW(TAG, "Read failed for sensor %d: %s", i, esp_err_to_name(ret));
            return ret;
        }
    }

    float mag[MLX90393_NUM_SENSORS];
    
    /* Exponential Moving Average (EMA) state for smoothing magnet magnitudes - matches what we do in pos_mm */
    static float s_diag_mag_ema[MLX90393_NUM_SENSORS] = {-1.0f, -1.0f};
    const float EMA_ALPHA = 0.2f; //0.3f; /* 0.0 = infinite smoothing, 1.0 = no smoothing */

    for (int i = 0; i < MLX90393_NUM_SENSORS; i++) {
        float mx = (float)xv[i] - s_calib.x[i];
        float my = (float)yv[i] - s_calib.y[i];
        float mz = (float)zv[i] - s_calib.z[i];
        float raw_m = sqrtf(mx*mx + my*my + mz*mz);

        if (s_diag_mag_ema[i] < 0.0f) {
            s_diag_mag_ema[i] = raw_m;
        } else {
            s_diag_mag_ema[i] = EMA_ALPHA * raw_m + (1.0f - EMA_ALPHA) * s_diag_mag_ema[i];
        }
        
        float m = s_diag_mag_ema[i];

        if (mx_out) mx_out[i] = mx;
        if (my_out) my_out[i] = my;
        if (mz_out) mz_out[i] = mz;
        if (mag_out) mag_out[i] = m;

        mag[i] = m;
    }

    float mag_sum = mag[0] + mag[1];
    if (mag_sum_out) *mag_sum_out = mag_sum;

    if (mag_sum < MAG_MIN_THRESHOLD) {
        if (pos_mm_out) *pos_mm_out = 0.0f;
    } else {
        float norm_diff = (mag[0] - mag[1]) / mag_sum;
        if (pos_mm_out) *pos_mm_out = norm_diff * POS_SCALE_MM;
    }

    return ESP_OK;
}
