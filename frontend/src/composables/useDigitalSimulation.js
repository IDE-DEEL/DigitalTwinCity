import { onMounted, onBeforeUnmount, watch } from "vue";
import { useToast } from "vue-toastification";
import { useWebSocketSimulation } from "./useWebSocketSimulation";
import { useDashboardParametersStore } from "../stores/dashboardParametersStore";
import { useSimulationStateStore } from "../stores/simulationStateStore";
import { useLanguageStore } from "../stores/languageStore";

const GET_STATS_TIMEOUT_IN_MILLIS = 5000;
const CSV_EXPORT_TIMEOUT_IN_MILLIS = 20000;
const ONE_SECOND_IN_MILLIS = 1000;

// ---
// orchestrator composable
// ---
export function useDigitalSimulation(onSimulationEndedCallback) {
    const { isWebSocketConnected, connectWebSocket, disconnectWebSocket, sendWebSocketMessage, registerResponseHandler } = useWebSocketSimulation();
    const dashboardStore = useDashboardParametersStore();
    const simulationStore = useSimulationStateStore();
    const languageStore = useLanguageStore();

    // ---
    // WebSocket lifecycle management
    // ---
    onMounted(() => {
        connectWebSocket(simulationStore.updateSimulationState, handleSimulationEnded);

        // watch for changes in simulation speed to update the backend simulation
        watch(
            () => dashboardStore.simulationSpeed,
            (newSpeed) => {
                if (simulationStore.isSimulating && isWebSocketConnected.value) {
                    sendWebSocketMessage({
                        command: "set_speed",
                        parameters: { simulationSpeed: newSpeed },
                    });
                }
            }
        );
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

        simulationStore.resetSimulationState();

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

        simulationStore.handleSimulationStarted();
    }

    function stopSimulation() {
        if (!isWebSocketConnected.value) {
            console.error("WebSocket not connected. Cannot stop simulation.");
            return;
        }

        sendWebSocketMessage({
            command: "stop"
        });

        simulationStore.handleSimulationEnded();
    }

    function reconnectWebSocket() {
        disconnectWebSocket();
        connectWebSocket(simulationStore.updateSimulationState, handleSimulationEnded);
    }

    function handleSimulationEnded() {
        simulationStore.handleSimulationEnded();
        if (onSimulationEndedCallback) {
            onSimulationEndedCallback();
        }
    }

    // ---
    // validation
    // ---
    /**
     * Validates if all houses in the scenario are reachable by at least one selected car route.
     * Shows an info toast if unreachable houses are found.
     * @returns {boolean} true if all houses are reachable, false if some are unreachable
     */
    function validateHousesReachability() {
        const toast = useToast();
        const payload = dashboardStore.simulationStartPayload;
        
        if (!payload || !payload.cars || !payload.scenario?.houses) {
            return true;
        }

        // Get all selected car routes
        const selectedRoutes = new Set(
            payload.cars.map(car => car.routeName).filter(Boolean)
        );

        // Check if any house has no overlap with selected routes
        const unreachableHouses = payload.scenario.houses.filter(house => {
            // A house is unreachable if none of its routeNames match any selected car route
            return !house.routeNames?.some(routeName => selectedRoutes.has(routeName));
        });

        if (unreachableHouses.length > 0) {
            console.info(
                `Found ${unreachableHouses.length} unreachable house(es):`,
                unreachableHouses.map(h => h.houseInstanceId)
            );
            toast.info(languageStore.getToastMessage("info.UNREACHABLE_HOUSES"));
            return false;
        }

        return true;
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
                console.error(`Stats request timeout after ${GET_STATS_TIMEOUT_IN_MILLIS / ONE_SECOND_IN_MILLIS} seconds`);
                reject(new Error("Request timeout: No response from server"));
            }, GET_STATS_TIMEOUT_IN_MILLIS);

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
                console.error(`CSV export request timeout after ${CSV_EXPORT_TIMEOUT_IN_MILLIS / ONE_SECOND_IN_MILLIS} seconds`);
                reject(new Error("Request timeout: No response from server"));
            }, CSV_EXPORT_TIMEOUT_IN_MILLIS);

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

        startSimulation,
        stopSimulation,
        reconnectWebSocket,
        validateHousesReachability,
        getStats,
        exportDataAsCSV,
    };
}
