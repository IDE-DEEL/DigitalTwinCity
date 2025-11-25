<template>
  <div class="w-full p-3">
    <div class="border border-gray-400 rounded-lg w-full h-full bg-white flex items-center justify-center overflow-hidden">
        
        <div class="map-grid" :style="gridStyle"> 
          <div
            v-for="component in mapComponents"
              :key="component.key"
              class="component-cell"
              :style="getComponentPosition(component)"
          >
            <img 
              :src="component.imagePath"
              :alt="component.label"
              class="w-full h-full object-contain"
              :style="{ transform:`rotate(${component.rotation}deg)`}"
            />
          </div>
        </div>  
    </div> 
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchMapData } from '../logic/service/mapService.js'; 
import { createMapGrid } from '../logic/service/mapService.js';
import { mapRenderer } from '../composables/mapRenderer.js';

const mapData = ref([]); 
const componentDefinitions = ref({}); 
const isLoading = ref(true); 
const mapGrid = ref(null);

onMounted(async () => {
    try {
        const data = await fetchMapData(); 
        mapData.value = data.mapData;
        componentDefinitions.value = data.componentDefinitions;
        mapGrid.value = createMapGrid(data.mapData, data.componentDefinitions, MAP_DIMENSIONS);

        // TODO: websocket verbinding maken naar python backend

    } catch (error) {
        console.error("Fout bij het laden:", error);
    } finally {
        isLoading.value = false;
    }
});

const { mapComponents, gridStyle, getComponentPosition } = mapRenderer(
    mapData,
    componentDefinitions
);

</script>
