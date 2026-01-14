@mainpage Twin Car Firmware (ESP32)

This page is the entry point for the generated documentation. It provides a high-level overview, navigation to subsystems, and quick start details for building, flashing, and operating the firmware.

\tableofcontents

## Overview
Twin Car is an ESP32-based line-following demonstrator. The firmware integrates Wi‑Fi + MQTT (TLS-PSK), RFID sensing, dual magnetometers, PID-based steering, and motion control (motor + servo). Configuration and persistent data use LittleFS with a factory-default JSON embedded in the firmware image.

## Architecture
- Application entry: [car/twin_car/src/main.cpp](./main_8cpp.html)
- Subsystems:
  - Connectivity (Wi‑Fi + MQTT TLS-PSK): \ref Connectivity
  - RFID (MFRC522): \ref RFIDReader
  - Magnetometers (MLX90393) + manager: \ref Magnetometer, \ref MagnetometerManager
  - PID steering + manager: \ref PID, \ref PIDManager
  - Motion control (motor + servo): \ref Motion
  - JSON/LittleFS database: \ref JsonReader

## Modules
### Connectivity (Wi‑Fi + MQTT)
- Purpose: Initialize and maintain Wi‑Fi and PSK-secured MQTT; publish messages and queue incoming ones for later processing.
- Key class: \ref Connectivity
- Key files:
  - [car/twin_car/include/connectivity.hpp](./connectivity_8hpp.html)
  - [car/twin_car/src/connectivity.cpp](./connectivity_8cpp.html)
- Topics/IDs configured in headers; credentials loaded via `.env` and pre-build script.

### RFID (MFRC522)
- Purpose: Read RFID UIDs and optionally publish in JSON via MQTT.
- Key class: \ref RFIDReader
- Key files:
  - [car/twin_car/include/rfid.hpp](./rfid_8hpp.html)
  - [car/twin_car/src/rfid.cpp](./rfid_8cpp.html)

### Magnetometers (MLX90393) + Manager
- Purpose: Initialize, calibrate, read, and filter magnetometer data from left/right sensors; provide a manager for batch operations.
- Key classes: \ref Magnetometer, \ref MagnetometerManager
- Key files:
  - [car/twin_car/include/magnetometer.hpp](./magnetometer_8hpp.html)
  - [car/twin_car/include/MagnetometerManager.hpp](./_magnetometer_manager_8hpp.html)
  - [car/twin_car/src/magnetometer.cpp](./magnetometer_8cpp.html)

### PID Steering + Manager
- Purpose: Compute steering correction from dual magnetometer inputs; manage multiple PID profiles across road types.
- Key classes: \ref PID, \ref PIDManager
- Key files:
  - [car/twin_car/include/PID.hpp](./_p_i_d_8hpp.html)
  - [car/twin_car/include/PIDManager.hpp](./_p_i_d_manager_8hpp.html)
  - [car/twin_car/src/PID.cpp](./_p_i_d_8cpp.html)

### Motion Control (Motor + Servo)
- Purpose: Drive motor and control steering servo using SparkFun TB6612FNG driver and ESP32 LEDC PWM.
- Key class: \ref Motion
- Key files:
  - [car/twin_car/include/Motion.hpp](./_motion_8hpp.html)
  - [car/twin_car/src/Motion.cpp](./_motion_8cpp.html)

### JSON Database (LittleFS)
- Purpose: Store tile templates and RFID tag bindings; load/save using LittleFS with embedded factory default.
- Key class: \ref JsonReader
- Key files:
  - [car/twin_car/include/jsonreader.hpp](./jsonreader_8hpp.html)
  - [car/twin_car/src/jsonreader.cpp](./jsonreader_8cpp.html)
  - Embedded default: [car/twin_car/include/rfid.json](../../../car/twin_car/include/rfid.json) (embedded via `platformio.ini`)

## Build & Flash
- Requirements: VS Code + PlatformIO extension, ESP32 board support (handled by PlatformIO).
- Configure environment variables via `.env` in [car/twin_car](../../../car/twin_car) or follow prompts from the pre-build script.
- Useful commands (run in `car/twin_car`):
  - Build: `pio run`
  - Upload: `pio run -t upload`
  - Monitor: `pio device monitor`
- Configuration file: [car/twin_car/platformio.ini](../../../car/twin_car/platformio.ini)
- Pre-build script (environment manager): [car/twin_car/scripts/env_mgr.py](./namespaceenv__mgr.html)

## Configuration
- Feature toggles in the application entry in [car/twin_car/src/main.cpp](./main_8cpp.html):
  - `USE_MQTT` 
  - `USE_RFID`
  - `USE_MAGNETOMETER`
  - `USE_PID`
  - `USE_MOTION`
  - `USE_JSON` 
- Network/MQTT credentials provided via `.env` (prompted if missing by [env_mgr.py](./namespaceenv__mgr.html)).
- LittleFS stores runtime JSON database at `"/rfid.json"`; defaults restored from the embedded factory file when missing.

## File Map
- Entry point: [car/twin_car/src/main.cpp](./main_8cpp.html)
- Includes: [car/twin_car/include/](../../../car/twin_car/include/)
- Sources: [car/twin_car/src/](../../../car/twin_car/src/)
- Scripts: [car/twin_car/scripts/](../../../car/twin_car/scripts/)
- Docs (this page): [doc/car_doc/](.)

## Doxygen
- Doxyfile: [car/twin_car/scripts/Doxyfile](../../../car/twin_car/scripts/Doxyfile)
- This README is tagged with `@mainpage` and serves as the main landing page. Ensure the Doxygen `INPUT` path includes the repository and this directory so the page is picked up.
