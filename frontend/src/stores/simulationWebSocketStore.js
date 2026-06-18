import { defineStore } from "pinia";
import { ref } from "vue";
import { useToast } from "vue-toastification";
import { useLanguageStore } from "./languageStore";
import { wsUrl } from "../config/api";

const URI = "/api/v1/digital-sim/ws/simulation";
const WS_URL = wsUrl(URI);

export const useSimulationWebSocketStore = defineStore("simulationWebSocket", () => {
    const isConnected = ref(false);
    const isConnecting = ref(false);

    let websocket = null;

    const responseHandlers = {};
    let onSimulationUpdate = null;
    let onSimulationEnded = null;

    const toast = useToast();
    const languageStore = useLanguageStore();

    // ---
    // Connection
    // ---
    function connect(updateCallback, endedCallback) {
        if (isConnecting.value || websocket) return;

        onSimulationUpdate = updateCallback;
        onSimulationEnded = endedCallback;

        isConnecting.value = true;

        try {
            websocket = new WebSocket(WS_URL);

            websocket.onopen = () => {
                isConnected.value = true;
                isConnecting.value = false;
            };

            websocket.onclose = () => {
                isConnected.value = false;
                isConnecting.value = false;
                websocket = null;
            };

            websocket.onerror = () => {
                isConnected.value = false;
                isConnecting.value = false;
                websocket = null;

                toast.error(
                    languageStore.getToastMessage("error.WS_CONNECTION_ERROR")
                );
            };

            websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const result = data.result;

                // 1. response handler (request/response)
                if (responseHandlers[data.command]) {
                    responseHandlers[data.command](data);
                    delete responseHandlers[data.command];
                    return;
                }

                // 2. push events
                switch (data.command) {
                    case "simulation_update":
                        onSimulationUpdate?.(result);
                        break;

                    case "simulation_ended":
                        onSimulationUpdate?.(result);
                        onSimulationEnded?.();
                        break;

                    case "error":
                        if (result?.type === "validation_error") {
                            toast.error(
                                languageStore.getToastMessage("error.SIMULATION_VALIDATION_ERROR")
                            );
                        }
                        break;
                }
            };
        } catch (e) {
            isConnecting.value = false;
            websocket = null;

            console.error("Error connecting to WebSocket:", e);
        }
    }

    // ---
    // Disconnect
    // ---
    function disconnect() {
        if (websocket) {
            websocket.close();
            websocket = null;
        }

        isConnected.value = false;
        isConnecting.value = false;

        onSimulationUpdate = null;
        onSimulationEnded = null;

        Object.keys(responseHandlers).forEach(k => delete responseHandlers[k]);
    }

    // ---
    // Send
    // ---
    function send(message) {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) {
            isConnected.value = false;
            return;
        }

        websocket.send(JSON.stringify(message));
    }

    // ---
    // Request/response helpers
    // ---
    function registerResponseHandler(command, handler) {
        responseHandlers[command] = handler;
    }

    return {
        isConnected,
        isConnecting,

        connect,
        disconnect,
        send,
        registerResponseHandler,
    };
});