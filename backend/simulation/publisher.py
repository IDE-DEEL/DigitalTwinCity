import paho.mqtt.client as mqtt
import time
import json
import random

# --- Configuratie ---

MQTT_HOST = "broker.hivemq.com" 
MQTT_PORT = 1883                
MQTT_TOPIC = "simulatie/voertuig1/locatie"
MAP_DIMENSION = 5            

current_x = MAP_DIMENSION / 2.0  
current_y = MAP_DIMENSION / 2.0
current_rotation = 0.0

def on_connect(client, userdata, flags, returnCode):
    if returnCode == 0:
        print("Verbonden met broker")
    else:
        print(f"Verbinding mislukt met code {returnCode}")

client = mqtt.Client(client_id="PythonPublisher_" + str(random.randint(1000, 9999)))
client.on_connect = on_connect

try:
    print(f"Poging tot verbinding met {MQTT_HOST}:{MQTT_PORT}...")
    client.connect(MQTT_HOST, MQTT_PORT, 60)
except Exception as e:
    print(f"Fout bij verbinden: {e}")
    exit()

client.loop_start()

# --- Simulatie Loop ---
try:
#     print("\n--- TEST: Spring 1 hele tegel over ---")

#     # Stuur X=0.5 (Midden tegel 0)
#     client.publish(MQTT_TOPIC, json.dumps({"x": 0.5, "y": 0.5, "rotation": 0.0}), qos=0)
#     print("Test 1: Verzonden naar (0.5, 0.5) - Tegel 0")
#     time.sleep(3) 

#     # Stuur X=1.5 (Midden tegel 1)
#     client.publish(MQTT_TOPIC, json.dumps({"x": 2.5, "y": 2.5, "rotation": 0.0}), qos=0)
#     print("Test 2: Verzonden naar (2.5, 2.5) - Tegel 2")
#     time.sleep(3) 
    
#     # Stuur X=2.5 (Midden tegel 2)
#     client.publish(MQTT_TOPIC, json.dumps({"x": 4.5, "y": 4.5, "rotation": 0.0}), qos=0)
#     print("Test 3: Verzonden naar (4.5, 4.5) -  Tegel 4")
#     time.sleep(30)
# # ...

    while True:
        current_x += random.uniform(-0.5, 0.5)
        current_y += random.uniform(-0.5, 0.5)
        current_x = max(0.0, min(MAP_DIMENSION, current_x))
        current_y = max(0.0, min(MAP_DIMENSION, current_y))

        payload = {
            "x": round(current_x, 3),
            "y": round(current_y, 3),
            "rotation": round(current_rotation, 1)
        }
        
        message = json.dumps(payload)
        
        client.publish(MQTT_TOPIC, message, qos=0)
        print(f"Verzonden: {message}")

        time.sleep(0.5) 

except KeyboardInterrupt:
    print("Simulatie gestopt door gebruiker")
finally:
    client.loop_stop()
    client.disconnect()
    print("Verbinding met broker gestopt")