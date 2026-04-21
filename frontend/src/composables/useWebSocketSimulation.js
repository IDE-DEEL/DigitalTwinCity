import { ref } from "vue";

const isWebSocketConnected = ref(false);
let websocket = null;
let isConnecting = false;

const WS_URL = "ws://localhost:8000/api/v1/digital-sim/ws/simulation";

function connectWebSocket() {
    // Prevent duplicate connection attempts
    if (isConnecting || websocket !== null) {
        return;
    }

    isConnecting = true;
    
    try {
        websocket = new WebSocket(WS_URL);
        
        websocket.onopen = () => {
            console.log("WebSocket connected to simulation backend");
            isWebSocketConnected.value = true;
        };
        
        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // TODO: update logic for handling response from backend when backend simulation logic is implemented
                if (data.command === "simulation_started") {
                    console.log("Simulation started on backend with parameters:", data.parameters);
                } else if (data.command === "simulation_stopped") {
                    console.log("Simulation stopped on backend");
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };
        
        websocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            isWebSocketConnected.value = false;
            isConnecting = false;
        };
        
        websocket.onclose = () => {
            console.log("WebSocket connection closed");
            isWebSocketConnected.value = false;
            isConnecting = false;
        };
    } catch (error) {
        console.error("Error connecting to WebSocket:", error);
        isConnecting = false;
    }
}

function disconnectWebSocket() {
    if (websocket) {
        websocket.close();
        websocket = null;
        isWebSocketConnected.value = false;
    }
}

function sendWebSocketMessage(message) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(message));
    } else {
        console.warn("WebSocket not connected. Cannot send message.");
    }
}

export function useWebSocketSimulation() {
    return {
        isWebSocketConnected,
        connectWebSocket,
        disconnectWebSocket,
        sendWebSocketMessage,
    };
}
