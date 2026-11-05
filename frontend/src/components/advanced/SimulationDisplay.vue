<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, reactive, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { fetchMapData } from '../../logic/service/mapService.js'; 
import { normalizeDegree } from '../../logic/utils/rotation.js';
import { useMapStore } from '../../stores/mapStore.js';
import { MAP_COLUMNS } from '../../constants/constants.js'
const MAP_DIMENSION = MAP_COLUMNS;
import { initRfidMapper } from '../../logic/service/rfidTagMapper.js';
import { useDigitalTwinStore } from '../../stores/digital-twin.js'
import '../../assets/Display.css';

const store = useDigitalTwinStore();
const { show_tags, active, table_data } = storeToRefs(store);
const mapStore = useMapStore();
const mapError = ref(false);

const componentDefinitions = ref({}); 
const isLoading = ref(true);
// const mapGrid = ref(null); 
const MAX_MAP_SCALE = 90;

//real scale: tile -> 40 cm

// container style
const containerStyle = computed(() => {
    const dynamicSize = `${MAX_MAP_SCALE}vmin`; 
    return {
        width: dynamicSize,
        height: dynamicSize,
        position: 'relative'
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
    return mapStore.mapData.map(tile => {
        const def = componentDefinitions.value[tile.variant];
        
        if (!def) return null;

        const rotation = normalizeDegree(tile.rotation || 0);

        return {
            key: `${tile.x}-${tile.y}`, 
            imagePath: def.imagePath,
            label: def.label,
            x: tile.x,
            y: tile.y,
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

async function loadMap() {
    isLoading.value = true;
    mapError.value = false;

    try {
        const data = await fetchMapData();

        mapStore.setMapData(data.mapData);
        componentDefinitions.value = data.componentDefinitions;

        initRfidMapper(data.mapData, data.rfidData);
    } catch (error) {
        console.error("Fout bij het laden:", error);
        mapError.value = true;
    } finally {
        isLoading.value = false;
    }
}

onMounted(loadMap);

// Custom directive named 'v-resize' to update factors when resizing browser
const vResize = {
  mounted(el, binding) {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Call function with every change
        binding.value(entry); 
      }
    });
    observer.observe(el);
    el._resizeObserver = observer;
  },
  unmounted(el) {
    if (el._resizeObserver) {
      el._resizeObserver.disconnect();
    }
  }
};

// Update factor to scale the x and y coordinates of a tag or car
const updateFactor = (event) => {
  store.factor_x = (event.target.clientWidth)
  store.factor_y = (event.target.clientHeight)
}
</script>


<template>
  <div class="display-container">
    <div>
      <!-- Map Container -->
      <div class="relative" :style="containerStyle">

        <!-- Loading state -->
        <div v-if="isLoading" class="map-error">
          <p>Kaart laden...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="mapError" class="map-error">
          <h3>De kaart kon niet worden geladen</h3>
          <p>Controleer de verbinding en probeer het opnieuw.</p>
          <button type="button" @click="loadMap">
            Opnieuw proberen
          </button>
        </div>

        <!-- Map -->
        <template v-else>
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
                :style="{ transform: `rotate(${component.rotation}deg)` }"
                v-resize="updateFactor"
              />
            </div>

            <!-- Map grid overlays -->
            <slot name="map-grid-overlays"></slot>
          </div>

          <slot name="tags"></slot>

          <!-- SVG overlays -->
          <slot name="svg-overlays"></slot>

          <!-- Simulation route builder -->
          <slot name="route-builder"></slot>

          <!-- Auto -->
          <slot name="car"></slot>
        </template>

      </div>
    </div>
  </div>
</template>