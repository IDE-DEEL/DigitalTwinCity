import { ref, onMounted, onBeforeUnmount } from 'vue';
import {Client} from 'paho-mqtt';
import { convertTagToPosition } from '../logic/service/rfidTagMapper.js';

// --- Configuratie ---
const MQTT_HOST = '52.136.201.33'; 
const MQTT_PORT = 9001;            
const MQTT_TOPIC = 'test/to-web'; 

export function useMqttVehicle() {
    
    const vehiclePosition = ref({ 
        x: 2.5, 
        y: 2.5, 
        rotation: 0 
    });

    let mqttClient = null;

    function setupMqttClient() {
        const clientId =  'vue_sim_client_' + Math.random().toString(16).substr(2, 8);
	console.log("MQTT client setup");    
        mqttClient = new Client(MQTT_HOST, MQTT_PORT, "/", clientId);
        mqttClient.onConnectionLost = onConnectionLost;
        mqttClient.onMessageArrived = onMessageArrived;

        mqttClient.connect({
            onSuccess: onConnect,
            useSSL: false,
            cleanSession: true
        });
    }

    function onConnect() {
        console.log("MQTT verbonden. Geabonneerd op: " + MQTT_TOPIC);
        mqttClient.subscribe(MQTT_TOPIC);
    }

    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("MQTT verbinding verloren: " + responseObject.errorMessage);
        }
    }

    function onMessageArrived(message) {
        try {
            const data = JSON.parse(message.payloadString);
            
            // Check if message uses new tile-based format
            if (data.tileNumber !== undefined && data.tagIndex !== undefined) {
                // New format: {tileNumber, tagIndex, rotation}
                const position = convertTagToPosition(data.tileNumber, data.tagIndex);
                
                if (position) {
                    vehiclePosition.value = {
                        x: position.x,
                        y: position.y,
                        rotation: data.rotation !== undefined ? data.rotation : vehiclePosition.value.rotation
                    };
                    console.log(`Tile ${data.tileNumber}, Tag ${data.tagIndex} → Position (${position.x.toFixed(2)}, ${position.y.toFixed(2)})`);
                } else {
                    console.warn(`Could not convert tile ${data.tileNumber}, tag ${data.tagIndex} to position`);
                }
            } 
            // Fallback to old format for backward compatibility
            else if (typeof data.x === 'number' && typeof data.y === 'number') {
                // Old format: {x, y, rotation}
                vehiclePosition.value = {
                    x: data.x, 
                    y: data.y,
                    rotation: data.rotation !== undefined ? data.rotation : vehiclePosition.value.rotation
                };
                console.log(`Legacy position format: (${data.x}, ${data.y})`);
            }

        } catch (e) {
            console.error("Fout bij het parsen van bericht: ", e);
        }
    }

    // --- Lifecycle Hooks ---

    onMounted(() => {
        setupMqttClient();
    });

    onBeforeUnmount(() => {
        if (mqttClient && mqttClient.isConnected()) {
            mqttClient.disconnect();
            console.log("MQTT client disconnected.");
        }
    });

    return {
        vehiclePosition
    };
}
