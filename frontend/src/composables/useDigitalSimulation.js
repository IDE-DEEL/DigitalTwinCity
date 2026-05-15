import { ref, onMounted, onBeforeUnmount } from "vue";
import { useWebSocketSimulation } from "./useWebSocketSimulation";
import { useDashboardParametersStore } from "../stores/dashboardParametersStore";
import { useSimulationStateStore } from "../stores/simulationStateStore";

const TIMEOUT_DURATION_MILLIS = 5000;
const isSimulating = ref(false);
const hasSimulated = ref(false);

// ---
// orchestrator composable
// ---
export function useDigitalSimulation() {
    const { isWebSocketConnected, connectWebSocket, disconnectWebSocket, sendWebSocketMessage, registerResponseHandler } = useWebSocketSimulation();
    const dashboardStore = useDashboardParametersStore();
    const simulationStore = useSimulationStateStore();

    // ---
    // WebSocket lifecycle management
    // ---
    onMounted(() => {
        connectWebSocket(simulationStore.updateSimulationState, handleSimulationEnded);
    });

    onBeforeUnmount(() => {
        disconnectWebSocket();
    });

    // ---
    // simulation control
    // ---
    function startSimulation() {
        if (!isWebSocketConnected.value) {
            console.error("WebSocket not connected. Cannot start simulation.");
            return;
        }

        const parameters = dashboardStore.simulationStartPayload;
        console.log("Starting simulation with parameters:", parameters);
        if (!parameters) {
            console.error("Parameters not available. Cannot start simulation.");
            return;
        }

        sendWebSocketMessage({
            command: "start",
            parameters: parameters
        });

        isSimulating.value = true;
        hasSimulated.value = true;
    }

    function stopSimulation() {
        if (!isWebSocketConnected.value) {
            console.error("WebSocket not connected. Cannot stop simulation.");
            return;
        }

        sendWebSocketMessage({
            command: "stop"
        });

        isSimulating.value = false;
        simulationStore.resetSimulationState();
    }

    function reconnectWebSocket() {
        disconnectWebSocket();
        connectWebSocket(simulationStore.updateSimulationState, handleSimulationEnded);
    }

    function handleSimulationEnded() {
        isSimulating.value = false;
        simulationStore.resetSimulationState();
    }

    // ---
    // data retrieval
    // ---
    function getStats() {
        return new Promise((resolve, reject) => {
            if (!isWebSocketConnected.value) {
                console.warn("WebSocket not connected. Cannot get stats.");
                reject(new Error("WebSocket not connected"));
                return;
            }

            const timeoutId = setTimeout(() => {
                console.error("Stats request timeout after 5 seconds");
                reject(new Error("Request timeout: No response from server"));
            }, TIMEOUT_DURATION_MILLIS);

            registerResponseHandler("get_stats", (response) => {
                clearTimeout(timeoutId);

                if (response.status === "success") {
                    resolve(response.data);
                } else {
                    console.warn("Stats request error:", response.message);
                    reject(new Error(response.message));
                }
            });

            sendWebSocketMessage({ command: "get_stats" });
        });
    }

    function exportDataAsCSV() {
        return new Promise((resolve, reject) => {
            if (!isWebSocketConnected.value) {
                console.warn("WebSocket not connected. Cannot export data.");
                reject(new Error("WebSocket not connected"));
                return;
            }

            const timeoutId = setTimeout(() => {
                console.error("CSV export request timeout after 5 seconds");
                reject(new Error("Request timeout: No response from server"));
            }, TIMEOUT_DURATION_MILLIS);

            registerResponseHandler("export_data", (response) => {
                clearTimeout(timeoutId);

                if (response.status === "success") {
                    resolve(response.data);
                } else {
                    console.warn("CSV export error:", response.message);
                    reject(new Error(response.message));
                }
            });

            sendWebSocketMessage({ command: "export_data" });
        });
    }

    // ---
    // exporting composable
    // ---
    return {
        isWebSocketConnected,
        isSimulating,
        hasSimulated,

        startSimulation,
        stopSimulation,
        reconnectWebSocket,
        getStats,
        exportDataAsCSV,
    };
}
