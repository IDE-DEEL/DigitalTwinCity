import { onMounted, onBeforeUnmount, watch } from "vue";
import { useToast } from "vue-toastification";
import { useLanguageStore, useSimulationStateStore, useSimulationParameterStore, useSimulationWebSocketStore } from "../stores/index.js";

const CSV_EXPORT_TIMEOUT_IN_MILLIS = 120000;
const ONE_SECOND_IN_MILLIS = 1000;

// ---
// orchestrator composable
// ---
export function useDigitalSimulation(onSimulationEndedCallback) {
    const wsStore = useSimulationWebSocketStore();
    const paramStore = useSimulationParameterStore();
    const stateStore = useSimulationStateStore();
    const languageStore = useLanguageStore();

    // ---
    // WebSocket lifecycle management
    // ---
    onMounted(() => {
        stateStore.resetSimulationState();

        wsStore.connect(stateStore.updateSimulationState, handleSimulationEnded);

        // watch for changes in simulation speed to update the backend simulation
        watch(
            () => paramStore.simulationSpeed,
            (newSpeed) => {
                if (stateStore.isSimulating && wsStore.isConnected) {
                    wsStore.send({
                        command: "set_speed",
                        parameters: { simulationSpeed: newSpeed },
                    });
                }
            }
        );
    });

    onBeforeUnmount(() => {
        if (stateStore.isSimulating) {
            wsStore.send({ command: "stop" });
        }
        
        wsStore.disconnect();
    });

    // ---
    // simulation control
    // ---
    function startSimulation() {
        stateStore.resetSimulationState();

        wsStore.send({command: "start", parameters: paramStore.simulationStartPayload});
        stateStore.handleSimulationStarted();
    }

    function stopSimulation() {
        wsStore.send({command: "stop"});
        stateStore.handleSimulationEnded();
    }

    function reconnectWebSocket() {
        wsStore.disconnect();
        wsStore.connect(stateStore.updateSimulationState, handleSimulationEnded);
    }

    function handleSimulationEnded() {
        stateStore.handleSimulationEnded();
        if (onSimulationEndedCallback) {
            onSimulationEndedCallback();
        }
    }

    // ---
    // data retrieval
    // ---
    function exportDataAsCSV() {
        return new Promise((resolve, reject) => {

            const timeoutId = setTimeout(() => {
                console.error(`CSV export request timeout after ${CSV_EXPORT_TIMEOUT_IN_MILLIS / ONE_SECOND_IN_MILLIS} seconds`);
                reject(new Error("Request timeout: No response from server"));
            }, CSV_EXPORT_TIMEOUT_IN_MILLIS);

            wsStore.registerResponseHandler("export_data", (response) => {
                clearTimeout(timeoutId);

                if (response.status === "success") {
                    resolve(response.data);
                } else {
                    console.warn("CSV export error:", response.message);
                    reject(new Error(response.message));
                }
            });

            wsStore.send({ command: "export_data" });
        });
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
        const payload = paramStore.simulationStartPayload;
        
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
    // exporting composable
    // ---
    return {
        startSimulation,
        stopSimulation,
        reconnectWebSocket,
        validateHousesReachability,
        exportDataAsCSV,
    };
}
