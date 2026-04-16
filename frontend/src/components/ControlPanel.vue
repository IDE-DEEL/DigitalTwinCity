<template>
    <aside class="w-[320px] bg-cream text-dark p-6 flex flex-col gap-6 text-sm rounded-tl-2xl">

        <!-- Car speed parameter -->
         <div>
            <label class="block text-sm font-semibold mb-1">Snelheid:</label>
            <div class="flex items-center gap-3">
                <input type="range" min="0" max="100" v-model="carSpeed" class="w-full accent-blue-200" />
                <span class="text-sm font-mono w-10">{{ carSpeed }}</span>
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
            <select class="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue outline-none bg-white text-dark" v-model="scenario">
                <option>Placeholder 1</option>
                <option>Placeholder 2</option>
            </select>
        </div> 

        <!-- Add car -->
        <div>
            <label class="block text-sm font-semibold mb-1">Auto toevoegen/verwijderen:</label>
            <div class="flex gap-2">
                <button 
                    class="bg-sky-200 hover:bg-sky-700 rounded-sm p-2 w-full h-10"
                    @click="addCar"
                    :disabled="cars.length >= MAX_CARS"
                    :class="{'opacity-50 cursor-not-allowed': cars.length >= MAX_CARS}"
                >
                    Auto toevoegen
                </button>
                <button 
                    class="bg-red-200 hover:bg-red-700 rounded-sm p-2 w-full h-10"
                    @click="removeCar"
                    :disabled="cars.length === 0"
                    :class="{'opacity-50 cursor-not-allowed': cars.length === 0}"
                >
                    Auto verwijderen
                </button>
            </div>
            <div v-if="cars.length >= MAX_CARS" class="text-xs text-red-500 mt-1">Maximaal {{ MAX_CARS }} auto's toegestaan</div>
        </div>

        <!-- List of cars -->
        <div>
            <label class="block text-sm font-semibold mb-1">Auto's:</label>
            <div class="bg-white border border-gray-300 rounded-md max-h-64 overflow-y-auto text-sm">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="px-3 py-2 font-semibold text-gray-700">ID</th>
                            <th class="px-3 py-2 font-semibold text-gray-700">Aantal pakketten</th>
                            <th class="px-3 py-2 font-semibold text-gray-700">Route</th>
                            <th class="px-3 py-2 font-semibold text-gray-700">Visualiseren</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <!-- TODO: implement v-for: generate rows for each car in 'cars' list -->
                            <td class="px-3 py-1">
                                <!-- TODO: Implement car ID display -->
                            </td>
                            <td class="px-3 py-1">
                                <!-- TODO: Implement package count input -->
                            </td>
                            <td class="px-3 py-1">
                                <!-- TODO: Implement route selection dropdown -->
                            </td>
                            <td class="px-3 py-1">
                                <!-- TODO: implement route visualization button -->
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

const carSpeed = ref(50)
// const turn = ref(10) <-- used in the disabled turn degree slider
const scenario = ref('Scenario 1')

// constants
const MAX_CARS = 5;

// --- start of car management logic ---
const cars = ref([]);

function addCar() {
    if (cars.value.length < MAX_CARS) {
        const newCar = {
            id: `${cars.value.length + 1}`,
            packageCount: 1,
            route: 0,
        };
        cars.value.push(newCar);
        console.log('Car added:', newCar);
    }
}

function removeCar() {
    if (cars.value.length > 0) {
        cars.value.pop();
        console.log('Car removed!');
    }
}
// --- end of car management logic ---

// --- start gathering parameter settings for simulation start logic ---
const collectParameters = () => {
    const carSettings = cars.value.map(car => ({
        id: car.id,
        packageCount: car.packageCount,
        route: car.route,
    }));

    const simulationSettings = {
        carSpeed: carSpeed.value,
        scenario: scenario.value,
    };

    return {
        carSettings,
        simulationSettings
    };
}
// --- end gathering parameter settings for simulation start logic ---

const handleStart = () => {
    // TODO: implement start logic, update isSimulating state if connection websocket is made and simulation actually starts
    console.log('Simulation gestart');
    console.log('Parameters:', collectParameters());
}

const handleStop = () => {
    // TODO: implement stop logic, update isSimulating state
    console.log('Simulation gestopt');
}
</script>
