<template>
    <aside class="w-[320px] bg-cream text-dark p-6 flex flex-col gap-6 text-sm">

        <!-- WebSocket Status Indicator -->
        <div v-if="!isWebSocketConnected" class="flex items-center gap-2 border-b border-red-300 p-3 bg-red-100 rounded-sm">
            <div class="w-3 h-3 rounded-full bg-red-500"></div>
            <span class="text-xs font-medium text-red-700">
                Niet verbonden met backend
            </span>
            <button 
                class="ml-auto bg-sky-200 hover:bg-sky-700 text-inherit rounded-sm w-12 h-8 text-lg"
                @click="handleReconnect"
                :disabled="reconnectCooldown"
                :class="{'opacity-50 cursor-not-allowed': reconnectCooldown}"
            >
                ⟳
            </button>
        </div>

        <!-- Car speed parameter -->
         <div>
            <label class="block text-sm font-semibold mb-1">Snelheid:</label>
            <div class="flex items-center gap-3">
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    :value="carTargetSpeed"
                    @input="setCarTargetSpeed(Number($event.target.value))"
                    :disabled="isSimulating"
                    :class="{'opacity-50 cursor-not-allowed': isSimulating}"
                    class="w-full accent-blue-200" 
                />
                <span class="text-sm font-mono w-10">{{ carTargetSpeed }}</span>
            </div>
         </div>

         <!-- Turn degree parameter -->
        <!-- <div> DISABLED UNUSED ELEMENT
            <label class="block text-sm font-semibold mb-1">Turn degree:</label>
            <div class="flex items-center gap-3">
                <input type="range" min="0" max="360" v-model="turn" class="w-full accent-blue-200" />
                <span class="text-sm font-mono w-10">{{ turn }}</span>
            </div>
        </div> -->

        <!-- Scenario dropdown -->
        <div>
            <label class="block text-sm font-semibold mb-1">Scenario:</label>
            <select 
                :value="scenario"
                @change="setScenario($event.target.value)"
                :disabled="isSimulating"
                :class="{'opacity-50 cursor-not-allowed': isSimulating}"
                class="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue outline-none bg-white text-dark"
            >
                <option 
                    v-for="scenarioOption in scenarioOptions"
                    :key="scenarioOption.value"
                    :value="scenarioOption.value"
                >
                    {{ scenarioOption.label }}
                </option>
            </select>
        </div> 

        <!-- Add car -->
        <div>
            <label class="block text-sm font-semibold mb-1">Auto toevoegen/verwijderen:</label>
            <div class="flex gap-2">
                <button 
                    class="bg-sky-200 hover:bg-sky-700 rounded-sm p-2 w-full h-10"
                    @click="addCar"
                    :disabled="cars.length >= MAX_CARS || isSimulating"
                    :class="{'opacity-50 cursor-not-allowed': cars.length >= MAX_CARS || isSimulating}"
                >
                    Auto toevoegen
                </button>
                <button 
                    class="bg-red-200 hover:bg-red-700 rounded-sm p-2 w-full h-10"
                    @click="removeCar"
                    :disabled="cars.length === 0 || isSimulating"
                    :class="{'opacity-50 cursor-not-allowed': cars.length === 0 || isSimulating}"
                >
                    Auto verwijderen
                </button>
            </div>
            <div v-if="cars.length >= MAX_CARS" class="text-xs text-red-500 mt-1">Maximaal {{ MAX_CARS }} auto's toegestaan</div>
        </div>

        <!-- List of cars -->
        <div>
            <label class="block text-sm font-semibold mb-1">Auto's:</label>
            <div class="bg-white border border-gray-300 rounded-md max-h-70 overflow-y-auto text-sm">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="px-3 py-2 font-semibold text-gray-700">ID</th>
                            <th class="px-3 py-2 font-semibold text-gray-700">Max. pakketten</th>
                            <th class="px-3 py-2 font-semibold text-gray-700">Route</th>
                            <th class="px-3 py-2 font-semibold text-gray-700">Visualiseren</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="car in cars" :key="car.id">
                            <td class="px-3 py-1">
                                {{ car.id }}
                            </td>
                            <td class="px-3 py-1">
                                 <input 
                                    type="number" 
                                    min="1" 
                                    max="10"
                                    :value="car.maxPackages"
                                    @input="updateCarMaxPackageCount(car.id, Number($event.target.value))"
                                    :disabled="isSimulating"
                                    :class="{'opacity-50 cursor-not-allowed': isSimulating}"
                                    class="w-16 p-1 border border-gray-300 rounded-md text-sm"
                                />
                            </td>
                            <td class="px-3 py-1">
                                    <select 
                                        :value="car.routeName"
                                        @change="updateCarRoute(car.id, $event.target.value)"
                                        :disabled="isSimulating"
                                        :class="{'opacity-50 cursor-not-allowed': isSimulating}"
                                        class="w-full p-1 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option
                                            v-for="routeOption in routeOptions"
                                            :key="routeOption.key"
                                            :value="routeOption.value"
                                        >
                                            {{ routeOption.label }}
                                        </option>
                                    </select>
                            </td>
                            <td class="px-3 py-1">
                                    <button 
                                        class="bg-sky-200 hover:bg-sky-700 text-inherit rounded-sm p-1 w-full h-8 text-xs"
                                        @click="toggleCarRouteVisibility(car.id)"
                                    >
                                        {{ car.routeVisibility ? 'Verberg' : 'Toon' }}
                                    </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Simulation controls -->
        <div class="mt-auto pt-4 border-t border-gray-200">
            <!-- Score & time -->
            <div class="flex items-center gap-4 mb-2 justify-center">
                <div class="flex items-center gap-2"><span>Score:</span><span>0</span></div>
                <div class="flex items-center gap-2"><span>Tijd:</span><span>00:00</span></div>
            </div>
            <!-- Start/Stop buttons -->
            <div class="flex gap-2 justify-center">
                <button 
                    @click="handleStart"
                    :disabled="isSimulating"
                    :class="[
                      'rounded-sm w-24 h-10 transition-colors',
                      isSimulating 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-sky-200 hover:bg-sky-700'
                    ]"
                >
                    Start
                </button>
                <button 
                    @click="handleStop"
                    :disabled="!isSimulating"
                    :class="[
                      'rounded-sm w-24 h-10 transition-colors',
                      !isSimulating 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-red-200 hover:bg-red-700'
                    ]"
                >
                    Stop
                </button>
            </div>
        </div>
    </aside>
</template>   

<script setup>
import { ref } from 'vue'
import { useDashboardParametersStore } from '../stores';
import { useDigitalSimulation } from '../composables/useDigitalSimulation';
import { MAX_CARS } from '../constants/constants';

// Composables
const {
    cars,
    carTargetSpeed,
    scenario,
    isSimulating,
    routeOptions,
    scenarioOptions,
    addCar,
    removeCar,
    updateCarMaxPackageCount,
    updateCarRoute,
    toggleCarRouteVisibility,
    setCarTargetSpeed,
    setScenario,
    collectParameters,
} = useDashboardParametersStore();

const {
    isWebSocketConnected,
    startSimulation,
    stopSimulation,
    reconnectWebSocket,
} = useDigitalSimulation();

const reconnectCooldown = ref(false);

const handleStart = () => {
    console.log('Requested simulation start with parameters: ', collectParameters());
    startSimulation();
}

const handleStop = () => {
    console.log('Requested simulation stop');
    stopSimulation();
}

const handleReconnect = () => {
    if (reconnectCooldown.value) {
        console.log("Reconnect on cooldown");
        return;
    }

    
    console.log("Attempting to reconnect WebSocket...");
    reconnectWebSocket();
    
    reconnectCooldown.value = true;
    const fiveSeconds = 5000;
    setTimeout(() => {
        reconnectCooldown.value = false;
    }, fiveSeconds);
}
</script>
