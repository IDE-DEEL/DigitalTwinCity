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
import { normalizeDegree } from '../logic/utils/rotation.js'; 
import { fetchMapData } from '../logic/service/mapService.js'; 

const mapData = ref([]); 
const componentDefinitions = ref({}); 
const isLoading = ref(true); 
const MAP_DIMENSION = 5;
const MAX_MAP_SCALE = 70;

onMounted(async () => {
    try {
        const data = await fetchMapData(); 
        mapData.value = data.mapData;
        componentDefinitions.value = data.componentDefinitions;
    } catch (error) {
        console.error("Fout bij het laden:", error);
    } finally {
        isLoading.value = false;
    }
});

// bereken de grid stijl (ook dynamisch)
const gridStyle = computed(() => {
    const dynamicSize = `${MAX_MAP_SCALE}vmin`; 

    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${MAP_DIMENSION}, 1fr)`,
        gridTemplateRows: `repeat(${MAP_DIMENSION}, 1fr)`,

        width: dynamicSize,
        height: dynamicSize,
        
        maxWidth: '800px', 
        maxHeight: '800px',
    };
});

const mapComponents = computed(() => {
    return mapData.value.map(item => {
        const def = componentDefinitions.value[item.type];
        
        if (!def) return null;

        const rotation = normalizeDegree(item.rotation || 0);

        return {
            key: `${item.x}-${item.y}`, 
            imagePath: def.imagePath,
            label: def.label,
            x: item.x,
            y: item.y,
            rotation: rotation,
        };
    }).filter(c => c !== null);
});

const getComponentPosition = (component) => {
    return {
        gridColumnStart: component.x + 1, 
        gridRowStart: component.y + 1,
    };
};
</script>
