import { ref, onMounted, onBeforeUnmount } from 'vue';
import {Client, Message} from 'paho-mqtt';

// --- Configuratie ---
const MQTT_HOST = 'broker.hivemq.com'; 
const MQTT_PORT = 8000;            
const MQTT_TOPIC = 'simulatie/voertuig1/locatie'; 
const MAP_DIMENSION = 5.0; 

export function useMqttVehicle() {
    
    const vehiclePosition = ref({ 
        x: 2.5, 
        y: 2.5, 
        rotation: 0 
    });

    const isConnected = ref(false);
    const isSimulating = ref(false);

    let mqttClient = null;
    let simulationInterval = null;

    function setupMqttClient() {
        const clientId = 'vue_sim_client_' + Math.random().toString(16).substr(2, 8);

        mqttClient = new Client(MQTT_HOST, MQTT_PORT, clientId);
        mqttClient.onConnectionLost = onConnectionLost;
        mqttClient.onMessageArrived = onMessageArrived;

        mqttClient.connect({
            onSuccess: onConnect,
            onFailure: onConnectionFailure,
            useSSL: false,
            cleanSession: true
        });
    }

    function onConnect() {
        console.log("MQTT verbonden. Geabonneerd op: " + MQTT_TOPIC);
        isConnected.value = true;
        mqttClient.subscribe(MQTT_TOPIC);
    }

    function onConnectionFailure(error) {
        console.error("MQTT verbinding mislukt: ", error);
        isConnected.value = false;
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


    // --- Simulation logic ---
    function startSimulation() {
        if (isSimulating.value) {
            return;
        }
        if (!isConnected.value) {
            setupMqttClient();

            const checkConnection = setInterval(() => {
                if (isConnected.value) {
                    clearInterval(checkConnection);
                    startSimulationLoop();
                }
            }, 100);
        } else {
            startSimulationLoop();
        }    
    }

    function startSimulationLoop() {
        isSimulating.value = true;
        vehiclePosition.value = { x: 0.0, y: 0.0, rotation: 0 }; // Placeholder voor positie
        simulationInterval = setInterval(() => {
            if (!mqttClient || !mqttClient.isConnected()) {
                console.log("MQTT verbinding verloren tijdens simulatie");
                stopSimulation();
                return;
            }

            let newX = vehiclePosition.value.x + (Math.random() - 0.5) * 0.5;
            let newY = vehiclePosition.value.y + (Math.random() - 0.5) * 0.5;
            newX = Math.max(0.2, Math.min(MAP_DIMENSION - 0.2, newX));
            newY = Math.max(0.2, Math.min(MAP_DIMENSION - 0.2, newY));

            const payload = {
                x: parseFloat(newX.toFixed(2)),
                y: parseFloat(newY.toFixed(2)),
                rotation: 0 // Placeholder voor rotatie
            };

            const message = new Message(JSON.stringify(payload));
            message.destinationName = MQTT_TOPIC;
            mqttClient.send(message);

        }, 500);
    }

    function stopSimulation() {
        if (!isSimulating.value) {
            console.log("Simulatie is niet actief.");
            return;
        }

        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }

        isSimulating.value = false;
        console.log("Simulatie gestopt!");
    }

    onBeforeUnmount(() => {
        if (mqttClient && mqttClient.isConnected()) {
            mqttClient.disconnect();
            console.log("MQTT client disconnected.");
        }
    });

    return {
        vehiclePosition,
        isConnected,
        isSimulating,
        startSimulation,
        stopSimulation,
        setupMqttClient
    };
}