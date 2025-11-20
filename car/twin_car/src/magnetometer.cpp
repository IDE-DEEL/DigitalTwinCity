#include "magnetometer.hpp"

Magnetometer::Magnetometer(enum mag_address device_addr, const mag_config &config)
    : _sensor(), _device_addr(device_addr), _config(config)
{
    switch (_device_addr)
    {
    case MAGNETOMETER_LEFT:
        _name = "Magnetometer left";
        break;

    case MAGNETOMETER_RIGHT:
        _name = "Magnetometer right";
        break;
    default:
        _name = "Unknown sensor %d", _device_addr;
        break;
    }
}

int Magnetometer::init()
{
    if (!_sensor.begin_I2C(_device_addr))
    {
        Serial.printf("Sensor %s not found!\n", _name);
        return -ENODEV;
    }

    // Gain
    if (!_sensor.setGain(_config.gain))
    {
        Serial.printf("Error setting gain of %s\n", _name);
        return -EIO;
    }
    
    // Resolution
    if (!_sensor.setResolution(MLX90393_X, _config.resolution))
    {
        Serial.printf("Error setting resolution of %s\n", _name);
        return -EIO;
    }

    if (!_sensor.setResolution(MLX90393_Y, _config.resolution))
    {
        Serial.printf("Error setting resolution of %s\n", _name);
        return -EIO;
    }

    if (!_sensor.setResolution(MLX90393_Z, _config.resolution))
    {
        Serial.printf("Error setting resolution of %s\n", _name);
        return -EIO;
    }

    // Oversampling
    if (!_sensor.setOversampling(_config.osr))
    {
        Serial.printf("Error setting oversampling of %s\n", _name);
        return -EIO;
    }

    // Filter
    if (!_sensor.setFilter(_config.filter))
    {
        Serial.printf("Error setting filter of %s\n", _name);
        return -EIO;
    }

    Serial.printf("Sensor %s OK\n", _name);
    return 0;
}

int Magnetometer::calibrate(int samples)
{
    // Safety measure
    if (!samples)
    {
        samples = 10;
    }

    float sum = 0;
    int ret = 0;

    for (unsigned i = 0; i < samples; ++i)
    {
        // Read current sample
        ret = read();
        if (ret)
        {
            Serial.printf("Error %d reading %s during calibration\n", ret, _name);
            return ret;
        }
        // Accumulate magnitude
        sum += sqrtf(_raw.x * _raw.x + _raw.y * _raw.y + _raw.z * _raw.z);
        delay(SAMPLE_DELAY_MS);
    }

    // Calculate offset
    _magOffset = sum / samples;
    _calibrated = true;
    Serial.printf("%s calibrated offset=%.3f\n", _name.c_str(), _magOffset);
    return 0;
}

int Magnetometer::read()
{
    bool ok = _sensor.readData(&_raw.x, &_raw.y, &_raw.z);
    return ok ? 0 : -EIO;
}

int Magnetometer::process()
{
    // Simple median-ish circular buffer
    // This works by keeping a small window of recent samples and sorting them to find the median.
    _windowPos = (_windowPos + 1) % MEDIAN_FILTER_SIZE;
    _window[_windowPos] = sqrtf(_raw.x * _raw.x + _raw.y * _raw.y + _raw.z * _raw.z) - _magOffset;

    // Copy by value to temporary array for sorting
    float tmp[MEDIAN_FILTER_SIZE];
    for (int i = 0; i < MEDIAN_FILTER_SIZE; i++)
    {
        tmp[i] = _window[i];
    }

    // Insertion sort to find median
    for (int i = 1; i < MEDIAN_FILTER_SIZE; i++)
    {
        float valueToInsert = tmp[i];
        int scanIndex = i - 1;
        while (scanIndex >= 0 && tmp[scanIndex] > valueToInsert)
        {
            tmp[scanIndex + 1] = tmp[scanIndex];
            --scanIndex;
        }
        tmp[scanIndex + 1] = valueToInsert;
    }
    _proc.magnitude = tmp[MEDIAN_FILTER_SIZE / 2];

    // Exponential smoothing filter
    // This helps to smooth out any remaining noise after the median filter.
    _proc.filtered = MEDIAN_FILTER_ALPHA * _proc.magnitude + (1.0f - MEDIAN_FILTER_ALPHA) * _proc.filtered;

    return 0;
}

int Magnetometer::update()
{
    int ret = read();
    if (ret)
    {
        Serial.printf("Error %d reading %s during update", ret, _name);
        return ret;
    }
    return process();
}
