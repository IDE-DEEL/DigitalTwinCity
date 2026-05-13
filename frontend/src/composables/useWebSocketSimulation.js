import { ref } from "vue";

const isWebSocketConnected = ref(false);
let websocket = null;
let isConnecting = false;
let onSimulationUpdateCallback = null;
const responseHandlers = {};

const WS_URL = "ws://localhost:8000/api/v1/digital-sim/ws/simulation"; // TODO: switch URL based on environmnent (dev vs prod)

function connectWebSocket(onSimulationUpdate) {
    // Store the callback for simulation updates
    onSimulationUpdateCallback = onSimulationUpdate;
    
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
            isConnecting = false;
        };
        
        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const result = data.result;
                
                // Check if there's a registered handler for this command response
                if (responseHandlers[data.command]) {
                    console.log("Using registered handler for:", data.command);
                    responseHandlers[data.command](data);
                    delete responseHandlers[data.command];
                    return;
                }
                
                switch (data.command) {
                    case "simulation_started":
                        console.log("simulation started on backend", result);
                        break;
                    case "simulation_update":
                        console.log("simulation update - step", result);
                        if (onSimulationUpdateCallback) {
                            onSimulationUpdateCallback(result);
                        }
                        break;
                    case "simulation_stopped":
                        console.log("simulation stopped on backend", result);
                        break;
                    default:
                        console.warn("Unknown command received:", data.command);
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };
        
        websocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            isWebSocketConnected.value = false;
            isConnecting = false;
            websocket = null;
        };
        
        websocket.onclose = () => {
            console.log("WebSocket connection closed");
            isWebSocketConnected.value = false;
            isConnecting = false;
            websocket = null;
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
    onSimulationUpdateCallback = null;
}

function sendWebSocketMessage(message) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log("Sending message:", message.command);
        websocket.send(JSON.stringify(message));
    } else {
        console.warn("WebSocket not connected. Cannot send message. Websocket state:", websocket?.readyState);
    }
}

function registerResponseHandler(command, handler) {
    responseHandlers[command] = handler;
}

export function useWebSocketSimulation() {
    return {
        isWebSocketConnected,
        connectWebSocket,
        disconnectWebSocket,
        sendWebSocketMessage,
        registerResponseHandler,
    };
}
