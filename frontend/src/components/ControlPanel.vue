<!-- All the elements will be responsive later, for now only visual -->
<script setup>
import { ref } from 'vue'
import Slider from './Slider.vue'

const speed = ref(60)
const turn = ref(10)
const scenario = ref('Scenario 1')
</script>

<template>
    <aside>

        <!-- Speed parameter -->
        <Slider name="Snelheid" value=2></Slider>

        <!-- Scenario dropdown -->
        <div>
            <label class="block text-sm font-semibold mb-1">Scenario:</label>
            <select class="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue outline-none bg-white text-dark" v-model="scenario">
                <option>Placeholder 1</option>
                <option>Placeholder 2</option>
            </select>
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