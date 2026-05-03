import { onMounted, onBeforeUnmount } from "vue";
import { useWebSocketSimulation } from "./useWebSocketSimulation";
import { useDashboardParameters } from "./useDashboardParameters";
import { useSimulationState } from "./useSimulationState";

// ---
// orchestrator composable
// ---
export function useDigitalSimulation() {
    const { isWebSocketConnected, connectWebSocket, disconnectWebSocket, sendWebSocketMessage } = useWebSocketSimulation();
    const { isSimulating, simulationStartPayload } = useDashboardParameters();
    const { updateSimulationState, resetSimulationState } = useSimulationState();

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
    // exporting composable
    // ---
    return {
        isWebSocketConnected,
        isSimulating,

        startSimulation,
        stopSimulation,
        reconnectWebSocket,
    };
}
