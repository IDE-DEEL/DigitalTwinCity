import { onMounted, onBeforeUnmount } from "vue";
import { useWebSocketSimulation } from "./useWebSocketSimulation";
import { useDashboardParametersStore } from "../stores/dashboardParametersStore";
import { useSimulationStateStore } from "../stores/simulationStateStore";

// ---
// orchestrator composable
// ---
export function useDigitalSimulation() {
    const { isWebSocketConnected, connectWebSocket, disconnectWebSocket, sendWebSocketMessage, registerResponseHandler } = useWebSocketSimulation();
    const { isSimulating, simulationStartPayload } = useDashboardParametersStore();
    const { updateSimulationState, resetSimulationState } = useSimulationStateStore();

    // ---
    // WebSocket lifecycle management
    // ---
    onMounted(() => {
        connectWebSocket(updateSimulationState);
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

        const parameters = simulationStartPayload.value;
        if (!parameters) {
            console.error("Parameters not available. Cannot start simulation.");
            return;
        }

        sendWebSocketMessage({
            command: "start",
            parameters: parameters
        });

        isSimulating.value = true;
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
        resetSimulationState();
    }

    function reconnectWebSocket() {
        disconnectWebSocket();
        connectWebSocket(updateSimulationState);
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

            registerResponseHandler("get_stats", (response) => {
                if (response.status === "success") {
                    resolve(response.data);
                } else {
                    console.warn(response.message);
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

            registerResponseHandler("export_data", (response) => {
                if (response.status === "success") {
                    resolve(response.data);
                } else {
                    console.warn(response.message);
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

        startSimulation,
        stopSimulation,
        reconnectWebSocket,
        getStats,
        exportDataAsCSV,
    };
}
