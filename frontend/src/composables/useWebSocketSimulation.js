import { ref } from "vue";
import { useToast } from "vue-toastification";
import { TOAST_MESSAGES } from "../constants/toast_messages";
import { wsUrl } from "../config/api";

const isWebSocketConnected = ref(false);
let websocket = null;
let isConnecting = false;
let onSimulationUpdateCallback = null;
let onSimulationEndedCallback = null;
const responseHandlers = {};
const toast = useToast();

const URI = "/api/v1/digital-sim/ws/simulation";
const WS_URL = wsUrl(URI);

function connectWebSocket(onSimulationUpdate, onSimulationEnded) {
    // Store the callbacks
    onSimulationUpdateCallback = onSimulationUpdate;
    onSimulationEndedCallback = onSimulationEnded;
    
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
                        console.log("simulation stopped on backend (manual stop)", result);
                        break;
                    case "speed_updated":
                        console.log("simulation speed updated on backend", data.simulationSpeed, "steps multiplier:", data.stepsMultiplier);
                        break;
                    case "simulation_ended":
                        console.log("simulation ended on backend (auto-stopped)", data.reason, result);
                        if (onSimulationUpdateCallback) {
                            onSimulationUpdateCallback(result);
                        }
                        if (onSimulationEndedCallback) {
                            console.log("Invoking simulation ended callback");
                            onSimulationEndedCallback();
                        }
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
            toast.error(TOAST_MESSAGES.WS_CONNECTION_ERROR);
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
    onSimulationEndedCallback = null;
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
