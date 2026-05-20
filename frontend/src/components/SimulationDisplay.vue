<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchMapData } from '../logic/service/mapService.js'; 
import { buildLane } from '../logic/service/laneBuilder.js';
import { useMqttVehicle } from '../composables/MqttConnection.js';
import { normalizeDegree } from '../logic/utils/rotation.js';
import { initRfidMapper } from '../logic/service/rfidTagMapper.js';
import { store } from '../store.js'
import '../assets/Display.css';

const { vehiclePosition,setupMqttClient } = useMqttVehicle();
const mapData = ref([]); 
const componentDefinitions = ref({}); 
const isLoading = ref(true);
// const mapGrid = ref(null); 
const MAP_DIMENSION = 2;
const MAX_MAP_SCALE = 70;

// container style
const containerStyle = computed(() => {
    const dynamicSize = `${MAX_MAP_SCALE}vmin`; 
    return {
        width: dynamicSize,
        height: dynamicSize,
        position: 'relative'
    };
});

// vehicle style
const vehicleStyle = computed(() => {
    const xPercent = (vehiclePosition.value.x / MAP_DIMENSION) * 100;
    const yPercent = (vehiclePosition.value.y / MAP_DIMENSION) * 100;
    const vehicleSize = '12px';

    return {
        width: vehicleSize, 
        height: vehicleSize,
        left: `calc(${xPercent}% - ${parseInt(vehicleSize)/2}px)`,
        top: `calc(${yPercent}% - ${parseInt(vehicleSize)/2}px)`,
        transform: `rotate(${vehiclePosition.value.rotation}deg)`,
        transition: 'all 0.5s linear'
    };
});


// gridstyle
const gridStyle = computed(() => {
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${MAP_DIMENSION}, 1fr)`,
        gridTemplateRows: `repeat(${MAP_DIMENSION}, 1fr)`,
        width: '100%',
        height: '100%',
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

const lanePositions = computed(() => {
    return mapData.value.map(item => ({
        id: `${item.x}-${item.y}`,
        type: item.type,
        rotation: normalizeDegree(item.rotation || 0),
        position: { x: item.x, y: item.y },
    }));
})

const lanes = computed(() => buildLane(lanePositions.value));

const getComponentPosition = (component) => {
    return {
        gridColumnStart: component.x + 1, 
        gridRowStart: component.y + 1,
    };
};

onMounted(async () => {
    setupMqttClient();
    try {
        const data = await fetchMapData(); 
        mapData.value = data.mapData;
        componentDefinitions.value = data.componentDefinitions;
        
        // Initialize the RFID mapper with loaded data
        initRfidMapper(data.mapData, data.rfidData);
    } catch (error) {
        console.error("Fout bij het laden:", error);
    } finally {
        isLoading.value = false;
    }
});

function generatePath() {
    if (!stappen || stappen.length === 0) return "M 0 0";

    let pathString = "";
    return pathString;
}

const carPositions = computed(() => {
  return store.car_data.map(car => {

    const foundTag = store.tag_positions.find(tag => tag.tag_id === car.tag_id)
    
    const x = foundTag ? foundTag.tag_pos.x : 0
    const y = foundTag ? foundTag.tag_pos.y : 0
    
    return {
      x,
      y
    }
  })
})
</script>

<template>
  <div class="display-container">
    <div>
        <!-- Map Container -->
        <div class="relative" :style="containerStyle">
            <!-- Map grid -->
            <div class="map-grid" :style="gridStyle"> 
                <div
                    v-for="component in mapComponents"
                    :key="component.key"
                    class="component-cell"
                    :style="getComponentPosition(component)">

                    <img 
                    :src="component.imagePath"
                    :alt="component.label"
                    class="w-full h-full object-contain"
                    :style="{ transform:`rotate(${component.rotation}deg)`}"
                    />
                </div>
            </div>

            <!-- RIFD Tags -->
            <svg class="absolute inset-0 pointer-events-none"
            v-for="tag in store.tag_positions"
            width=${MAP_DIMENSION} height=${MAP_DIMENSION}>
                <circle :cx="tag.tag_pos.x" :cy="tag.tag_pos.y" r="8" fill="black"></circle>
            </svg>
            
            <!-- Lanes (kleur kan later worden weggehaald) --
            <svg 
                class="absolute inset-0 pointer-events-none"
                :viewBox="`0 0 ${MAP_DIMENSION} ${MAP_DIMENSION}`"
                :preserveAspectRatio="`none`"
            >
                <polyline
                    v-for="lane in lanes"
                    :key="lane.id"
                    :points="lane.points.map(p => `${p.x},${p.y}`).join(' ')"
                    fill="none"
                    stroke="blue"
                    stroke-width="0.00"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>-->

            <!-- Routes --
            <svg class="absolute inset-0 pointer-events-none"
            width=${MAP_DIMENSION} height=${MAP_DIMENSION}>

                !-- We tonen alleen paden als 'visueel' true is
                v-for="car in store.table_data.filter(c => c.visueel)"--
                <path
                    d="M 20 20 L 100 100 L 200 50 Q 300 200 400 100"
                    fill="none"
                    stroke="#F54242"
                    stroke-width="4" />

            </svg> -->

            <!-- Auto -->
            <svg class="absolute inset-0 pointer-events-none"
            v-for="car in carPositions"
            width=${MAP_DIMENSION} height=${MAP_DIMENSION}>
                <rect class="car" :x="car.x" :y="car.y" width="80" height="40" fill="#636363" stroke="black"
                style="transform-box: fill-box; transform-origin: center; transform: rotate(90deg);"></rect>
            </svg>
        </div>
    </div> 
  </div>
</template>