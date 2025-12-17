import { ref, onMounted, onBeforeUnmount } from 'vue';
import {Client} from 'paho-mqtt';

// --- Configuratie ---
const MQTT_HOST = 'broker.hivemq.com'; 
const MQTT_PORT = 8000;            
const MQTT_TOPIC = 'simulatie/voertuig1/locatie'; 

export function useMqttVehicle() {
    
    const vehiclePosition = ref({ 
        x: 2.5, 
        y: 2.5, 
        rotation: 0 
    });

    let mqttClient = null;

    function setupMqttClient() {
        const clientId = 'vue_sim_client_' + Math.random().toString(16).substr(2, 8);
    
        mqttClient = new Client(MQTT_HOST, MQTT_PORT, clientId);
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
            if (typeof data.x === 'number' && typeof data.y === 'number') {
                vehiclePosition.value = {
                    x: data.x, 
                    y: data.y,
                    rotation: data.rotation !== undefined ? data.rotation : vehiclePosition.value.rotation
                };
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