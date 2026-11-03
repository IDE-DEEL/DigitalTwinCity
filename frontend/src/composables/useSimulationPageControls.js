import { ref, computed, watch, onUnmounted } from 'vue';
import { useDigitalSimulation } from './useDigitalSimulation.js';

/** Manage simulation page actions, demo mode, and statistics dialog state. */
export function useSimulationPageControls({ paramStore, stateStore, wsStore }) {
    const demoEnabled = ref(false);
    const reconnectCooldown = ref(false);
    const isStatsModalOpen = ref(false);
    let reconnectTimeout;

    const {
        startSimulation, pauseSimulation, resumeSimulation, stopSimulation,
        reconnectWebSocket, exportDataAsCSV,
    } = useDigitalSimulation(() => {
        const wasDemo = demoEnabled.value;
        demoEnabled.value = false;
        if (!wasDemo) isStatsModalOpen.value = true;
    });

    const allCarsHaveInactiveRoute = computed(() =>
        paramStore.cars.every(car => car.routeName === 'inactive')
    );

    watch(() => stateStore.autoOpenStatsModal, (newValue) => {
        if (newValue?.value) {
            isStatsModalOpen.value = true;
            stateStore.resetAutoOpenStatsModal();
        }
    });

    watch(() => wsStore.isConnected, (connected) => {
        if (!connected && demoEnabled.value) {
            demoEnabled.value = false;
            stateStore.handleSimulationEnded();
        }
    });

    function handleWebsocketReconnect() {
        if (reconnectCooldown.value) return;
        reconnectWebSocket();
        reconnectCooldown.value = true;
        reconnectTimeout = setTimeout(() => { reconnectCooldown.value = false; }, 5000);
    }

    function handleSimulationStart() { startSimulation(); }
    function handleSimulationStop() {
        demoEnabled.value = false;
        stopSimulation();
    }
    function handleSimulationPauseToggle() {
        if (stateStore.isPaused) resumeSimulation();
        else pauseSimulation();
    }
    function handleStatsOpen() { isStatsModalOpen.value = true; }

    function startDemoRun() {
        if (!demoEnabled.value || !wsStore.isConnected || stateStore.isSimulating) return;
        const routes = paramStore.routeOptions
            .map(option => option.value)
            .filter(value => value && value !== 'inactive');
        if (!routes.length) return;
        paramStore.cars = paramStore.cars.map(car => ({
            ...car,
            routeName: routes[Math.floor(Math.random() * routes.length)],
        }));
        startSimulation(true);
    }

    function toggleDemo() {
        if (demoEnabled.value) {
            demoEnabled.value = false;
            stopSimulation();
        } else {
            demoEnabled.value = true;
            isStatsModalOpen.value = false;
            startDemoRun();
        }
    }

    onUnmounted(() => clearTimeout(reconnectTimeout));

    return {
        demoEnabled, reconnectCooldown, isStatsModalOpen,
        allCarsHaveInactiveRoute, handleWebsocketReconnect,
        handleSimulationStart, handleSimulationStop,
        handleSimulationPauseToggle, handleStatsOpen, toggleDemo,
        exportDataAsCSV,
    };
}
