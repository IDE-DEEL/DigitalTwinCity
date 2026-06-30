# DEEL auto documentatie

## Configuratie
`idf.py menuconfig` -> DEEL configuratie -> Auto naam, wifi ssid/password en mqtt password invoeren. vervolgens kan je builden en flashen. Om een wifi wachtwoord voor iotroam te verkrijgen moet je het mac adress van de esp delen met Diede en krijg je een wachtwoord terug. Op teams staat ook een document met esp wachtwoorden voor mqtt.
# WaardeLezer AGV Firmware

This firmware runs on an ESP32 for an Automated Guided Vehicle (AGV) line-follower. The robot follows a magnetic strip on the floor, communicates with a backend system via MQTT, reads RFID tags on the track for waypoint and command tracking, features a steering mechanism along with an OLED status display, and operates autonomously while taking commands from a central infrastructure.

## System Architecture and Components

The application is structured into several components executing over FreeRTOS, handling specific physical and logical layers of the AGV. The main loop (`task_line_tracker`) executes at roughy 50Hz, continually computing navigation corrections.

Below is an overview of the core project structure, defined primarily underneath the `main/` directory.

### Core Modules (`main/` & `main/include/`)

* **`main.c`**  
  The main application entry point and FreeRTOS task manager. Initializes the sensors, OLED, motor controllers, and spans background tasks like `task_line_tracker` for PID loop execution.

* **`Communications.c` / `communication.h`**  
  Manages internal telemetry and external MQTT payloads. Unpacks directional commands, stop requests, and screen updates from infrastructure, storing them. Also maintains the transmission structures (`transmit_msg`) tracking battery level, speed, and read RFID tags.

* **`Motor_driver.c` / `motor_driver.h`**  
  Exposes functions to interface with a hardware motor controller (likely a TB6612). Handles forward speeds, enabling or disabling driving logic, and sets PWM outputs for the steering servo motor.

* **`PID_steering.c` / `pid_steering.h`**  
  A discrete PID controller algorithm. Generates smooth corrective steering angles in order to keep the AGV centered over the magnetic tape based on real-time deviations.

* **`Magnets.c` / `magnets.h`**  
  Responsible for taking analog readings from MLX90393-based magnetic sensors, calculating the literal XYZ spatial deviations (error offsets) of the tape underneath the AGV chassis.

* **`turning.c` / `turning.h`**  
  The parser handling directional vectors (Left, Right, Straight, Roundabout, etc.). Temporarily overrides the standard PID steering response when an intersection approaches and a clear diversion needs to be made.

* **`RFID.c` / `rfid.h`**  
  Interfaces directly with a bottom-mounted PN532 RFID reader. Rapidly polls the floor tags, fetching their unique UID keys and supplying them into the communications buffer.

* **`oled.c` / `oled.h` & `lvgl_ui.c`**  
  OLED display driver handlers that utilize LVGL to render graphical states (packages on board, delivery progress, charging status, and general metrics) to a mounted display panel on the chassis.

* **`config.h`**  
  The global configuration dictionary. It houses all system tuning profiles, such as PID controller constants (`PID_KP`, `PID_KI`, etc.), FreeRTOS task priorities and sizes, target speeds, and loop timing intervals.

## Getting Started / Build Instructions

This codebase utilizes the standard Espressif IoT Development Framework (ESP-IDF 5.x) accompanied by the ESP-IDF VS Code extension. 

1. Load this environment directly into VS Code equipped with ESP-IDF.
2. Select your relevant COM port, and define the esp32 micro-controller architecture standard you're targeting.
3. Use the integrated ESP-IDF extension tools: `Build`, `Flash`, and `Monitor` to dispatch the image to your vehicle’s logic board. 

Once flashed, the processor immediately boots, resets the PID cache, and initiates scanning for the track tape.
