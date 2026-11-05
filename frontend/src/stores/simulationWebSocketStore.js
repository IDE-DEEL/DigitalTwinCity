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
    let intentionalDisconnect = false;
    let connectionErrorShown = false;
    let invalidMessageShown = false;

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
        intentionalDisconnect = false;
        connectionErrorShown = false;
        invalidMessageShown = false;

        try {
            websocket = new WebSocket(WS_URL);

            websocket.onopen = () => {
                isConnected.value = true;
                isConnecting.value = false;
            };

            const currentSocket = websocket;
            websocket.onclose = () => {
                if (websocket !== currentSocket) return;
                const shouldNotify = !intentionalDisconnect && !connectionErrorShown;
                isConnected.value = false;
                isConnecting.value = false;
                websocket = null;
                if (shouldNotify) {
                    connectionErrorShown = true;
                    toast.error(languageStore.getToastMessage("error.WS_CONNECTION_ERROR"));
                }
            };

            websocket.onerror = () => {
                if (websocket !== currentSocket) return;
                isConnected.value = false;
                isConnecting.value = false;
                // I keep the socket until onclose so a reconnect cannot race the old connection.

                if (!intentionalDisconnect && !connectionErrorShown) {
                    connectionErrorShown = true;
                    toast.error(languageStore.getToastMessage("error.WS_CONNECTION_ERROR"));
                }
            };

            websocket.onmessage = (event) => {
                if (websocket !== currentSocket) return;
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch {
                    reportInvalidMessage();
                    return;
                }
                if (!data || Array.isArray(data) || typeof data !== "object" || typeof data.command !== "string") {
                    reportInvalidMessage();
                    return;
                }
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
                    case "simulation_ended":
                    case "simulation_deadlocked":
                        // I process the latest simulation state for all three events.
                        if (!result || typeof result !== "object" || Array.isArray(result)) {
                            reportInvalidMessage();
                            break;
                        }
                        try {
                            onSimulationUpdate?.(result);
                        } catch (error) {
                            console.error("Failed to process simulation update:", error);
                            reportInvalidMessage();
                            break;
                        }

                        if (data.command !== "simulation_update") {
                            onSimulationEnded?.();
                        }

                        if (data.command === "simulation_deadlocked") {
                            toast.info(languageStore.getToastMessage("info.SIMULATION_DEADLOCKED"));
                        }
                        break;

                    case "error":
                        if (result?.type === "validation_error") {
                            toast.error(
                                languageStore.getToastMessage("error.SIMULATION_VALIDATION_ERROR")
                            );
                        } else {
                            toast.error("De simulatie kon het verzoek niet verwerken.");
                        }
                        break;
                    default:
                        console.warn("Unknown simulation message:", data.command);
                }
            };
        } catch (e) {
            toast.error(languageStore.getToastMessage("error.WS_CONNECTION_ERROR"));
            isConnecting.value = false;
            websocket = null;

            console.error("Error connecting to WebSocket:", e);
        }
    }

    function reportInvalidMessage() {
        // I show one warning per connection instead of a toast for every invalid message.
        if (invalidMessageShown) return;
        invalidMessageShown = true;
        toast.error("Er is een ongeldig bericht ontvangen van de simulatie.");
    }

    // ---
    // Disconnect
    // ---
    function disconnect() {
        intentionalDisconnect = true;
        if (websocket) {
            const closingSocket = websocket;
            websocket = null;
            closingSocket.close();
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
            return false;
        }

        try {
            websocket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error("Failed to send simulation command:", error);
            toast.error("Het commando kon niet worden verstuurd. Controleer de verbinding.");
            return false;
        }
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