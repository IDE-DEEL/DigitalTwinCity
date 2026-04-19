<!-- All the elements will be responsive later, for now only visual -->
<script setup>
import { ref } from 'vue'

const speed = ref(60)
const turn = ref(10)
const scenario = ref('Scenario 1')
</script>

<template>
    <aside>

        <!-- Speed parameter -->
         <div>
            <label class="block text-sm font-semibold mb-1">Snelheid:</label>
            <div class="flex items-center gap-3">
                <input type="range" min="0" max="100" v-model="speed" class="w-full accent-blue-200" />
                <span class="text-sm font-mono w-10">{{ speed }}</span>
            </div>
         </div>

         <!-- Turn degree parameter -->
        <div>
            <label class="block text-sm font-semibold mb-1">Turn degree:</label>
            <div class="flex items-center gap-3">
                <input type="range" min="0" max="360" v-model="turn" class="w-full accent-blue-200" />
                <span class="text-sm font-mono w-10">{{ turn }}</span>
            </div>
        </div>

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
        <label class="block text-sm font-semibold mb-1">Auto toevoegen:</label>
        <div class="space-y-3">
            <div>
                <label class="text-xs">Auto ID:</label>
                <select class= "w-full p-2 border border-gray-300 rounded-md bg-white">
                    <option>Auto 1</option>
                    <option>Auto 2</option>
                </select>
            </div>
            <div>
                <label class="text-xs">Pakketjes:</label>
                <select class="w-full p-2 border border-gray-300 rounded-md bg-white">
                    <option>Pakket A</option>
                    <option>Pakket B</option>
                </select>
            </div>
                <button class="bg-sky-200 hover:bg-sky-700 rounded-sm p-2 w-full h-10">Toevoegen</button>
        </div>
        </div>

        <!-- List of cars -->
        <div>
            <label class="block text-sm font-semibold mb-1">Auto's:</label>
            <div class="bg-white border border-gray-300 rounded-md h-32 overflow-y-auto text-sm">
                <div class="flex justify-between px-3 py-2 border-b border-gray-100 font-semibold text-gray-700">
                    <span>ID</span><span>Pakketjes</span>
                </div>
                <div class="flex justify-between px-3 py-1 border-b text-gray-600">
                    <span>Auto 1</span><span>2</span>
                </div>
                <div class="flex justify-between px-3 py-1 text-gray-600">
                    <span>Auto 2</span><span>0</span>
                </div>
            </div>
        </div>
    </aside>
</template>   