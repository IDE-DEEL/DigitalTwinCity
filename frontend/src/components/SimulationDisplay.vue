<template>
  <div class="flex-1 p-4 border flex items-center justify-center bg-gray-50">
    <div v-if="loading" class="text-gray-500">Loading map...</div>
    <div v-else-if="error" class="text-red-500">{{ error }}</div>
    <div v-else class="grid-container" :style="gridStyle">
      <div 
        v-for="(row, rowIndex) in mapData.cells" 
        :key="rowIndex"
        class="grid-row flex"
      >
        <div 
          v-for="(cell, colIndex) in row" 
          :key="`${rowIndex}-${colIndex}`"
          class="grid-cell"
        >
          <img 
            v-if="getComponentImage(cell.componentId)"
            :src="getComponentImage(cell.componentId)"
            :alt="cell.componentId"
            :style="getCellStyle(cell.rotation)"
            class="cell-image"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { loadMapComponents, loadMap, getComponentById } from '../logic/service/mapService.js';
import { getRotationStyle } from '../logic/utils/rotation.js';

export default {
  name: 'SimulationDisplay',
  data() {
    return {
      components: [],
      mapData: { cells: [], width: 0, height: 0 },
      loading: true,
      error: null,
      cellSize: 80
    };
  },
  computed: {
    gridStyle() {
      return {
        display: 'flex',
        flexDirection: 'column'
      };
    }
  },
  async mounted() {
    try {
      this.components = await loadMapComponents();
      this.mapData = await loadMap('test-map.json');
      this.loading = false;
    } catch (err) {
      console.error('Error loading map:', err);
      this.error = 'Failed to load map data';
      this.loading = false;
    }
  },
  methods: {
    getComponentImage(componentId) {
      const component = getComponentById(this.components, componentId);
      return component ? component.image : null;
    },
    getCellStyle(rotation) {
      return {
        width: `${this.cellSize}px`,
        height: `${this.cellSize}px`,
        transform: getRotationStyle(rotation),
        display: 'block'
      };
    }
  }
};
</script>

<style scoped>
.grid-container {
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  --cell-size: 80px;
}

.grid-row {
  display: flex;
}

.grid-cell {
  width: var(--cell-size);
  height: var(--cell-size);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell-image {
  object-fit: cover;
}
</style>
