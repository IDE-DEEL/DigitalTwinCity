<script setup>
import '../../assets/MainContent.css'
import '../../assets/Cars.css'
import ControlPanel from '../ControlPanel.vue'
import BarChart from '../BarChart.vue'
import SimulationDisplay from '../SimulationDisplay.vue'
import Timer from '../Timer.vue'
import VisualizePanel from '../VisualizePanel.vue'
import { onMounted, ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useDigitalTwinStore } from '../../stores/digital-twin.js'
import TagsVisualizer from '../TagsVisualizer.vue'

const store = useDigitalTwinStore()

const carState = reactive({
  positions: {}
})

onMounted(() => {
  store.connect();
  store.fetchTagPositions()
  store.fetchDepotRoutes()
  store.fetchRoutes()
})

/* -------------------------
   ROUTES & TAGS
--------------------------*/
function get_route_tags(route_name) {
  let tags = []

  for (let i = 0; i < store.routes.length; i++) {
    if (route_name === store.routes[i].route) {
      tags = store.routes[i].tags
      break
    }
  }

  return tags
}

function get_suffix_depot_route_tags(car_id) {
  let tags = []
  
  for (let i = 0; i < store.car_depot_routes.length; i++) {
    if (car_id === store.car_depot_routes[i].auto_id) {
      tags = store.car_depot_routes[i].tags_suffix
      break
    }
  }

  return tags
}

function get_prefix_depot_route_tags(car_id) {
  let tags = []
  
  for (let i = 0; i < store.car_depot_routes.length; i++) {
    if (car_id === store.car_depot_routes[i].auto_id) {
      tags = store.car_depot_routes[i].tags_prefix
      break
    }
  }

  return tags
}

const tagMap = computed(() => {
  const map = {}
  for (const t of store.tag_positions) {
    map[t.tag_id] = {
      x: t.tag_pos.x,
      y: t.tag_pos.y
    }
  }
  return map
})

function getRouteTags(car_id, route_name) {
  if (route_name === 'inactive') return []
  let route_tags = get_route_tags(route_name)
  let depot_prefix_tags = get_prefix_depot_route_tags(car_id)
  let depot_suffix_tags = get_suffix_depot_route_tags(car_id)
  let tags = [...depot_suffix_tags, ...route_tags, ...depot_prefix_tags]
  
  return tags
}

const tagPosMap = Object.fromEntries(
  store.tag_positions.map(t => [t.tag_id, t.tag_pos])
);

const carTagMap = Object.fromEntries(
  store.car_data.map(c => [c.auto_id, c.tag_id])
);

function getNextTag(tags, currentIndex) {
  return tags[(currentIndex + 1) % tags.length]
}

for (const car of store.table_data) {
  if (!carState.positions[car.auto_id] && car.status) {

    const tagId = carTagMap[car.auto_id];
    const pos = tagPosMap[tagId];

    carState.positions[car.auto_id] = {
      id: car.auto_id,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      packages: car.pakketje,
      routeIndex: 0,
      initialized: false,
      rotation: 90,
      lastTagId: null,
      targetTagId: null,
      arrived: false
    };
  }
}

function calculateRotation(from, to) {
  if (!from || !to) return 0

  const dx = to.x - from.x
  const dy = to.y - from.y

  return Math.atan2(dy, dx) * (180 / Math.PI) + 90
}

function moveCars() {
  const speed = store.speed / 200

  for (const car of store.table_data) {
    if (!car.status) continue

    const state = carState.positions[car.auto_id]
    if (!state) continue

    const tags = getRouteTags(car.auto_id, car.route)
    if (!tags.length) continue

    const carInfo = store.car_data.find(
      c => c.auto_id === car.auto_id
    )
    
    if (!carInfo) continue
    const currentTagId = carInfo.tag_id
    const tagMapLocal = tagMap.value

    /* -------------------------
       INIT
    ------------------------- */
    if (!state.initialized) {
      const startPos = tagMapLocal[currentTagId]
      if (!startPos) continue

      state.x = startPos.x
      state.y = startPos.y

      state.routeIndex = tags.findIndex(t => t === currentTagId)
      if (state.routeIndex < 0) state.routeIndex = 0

      state.lastTagId = currentTagId
      state.targetTagId = null
      state.arrived = false
      state.initialized = true
      continue
    }

    /* -------------------------
       STOP STATE
    ------------------------- */
    if (state.arrived && currentTagId === state.lastTagId) {
      continue
    }

    /* -------------------------
       GEEN SCAN → STOP
    ------------------------- */
    if (!currentTagId) continue

    /* -------------------------
       TARGET SETTEN
    ------------------------- */
    if (!state.targetTagId) {
      state.targetTagId = currentTagId
    }

    if (!state.targetTagId) continue

    const targetIndex = tags.indexOf(state.targetTagId)
    if (targetIndex === -1) {
      state.targetTagId = null
      continue
    }

    const currentIndex = state.routeIndex
    const diff = (targetIndex - currentIndex + tags.length) % tags.length
    const fromTagId = tags[currentIndex]
    const toTagId = state.targetTagId
    const from = tagMapLocal[fromTagId]
    const to = tagMapLocal[toTagId]

    if (!to || !from) {
      state.targetTagId = null
      continue
    }

    /* -------------------------
       JUMP (meer dan 1 stap)
    ------------------------- */
    if (diff > 1) {
      state.x = to.x
      state.y = to.y

      state.rotation = calculateRotation(from, to)

      state.routeIndex = targetIndex
      state.lastTagId = toTagId
      state.targetTagId = null
      state.arrived = true

      continue
    }

    /* -------------------------
       MOVE (normaal)
    ------------------------- */
    const dx = to.x - state.x
    const dy = to.y - state.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    state.rotation = calculateRotation(from, to)

    if (dist <= speed) {
      state.x = to.x
      state.y = to.y

      state.routeIndex = targetIndex
      state.lastTagId = toTagId
      state.targetTagId = null
      state.arrived = true

      continue
    }

    state.x += (dx / dist) * speed
    state.y += (dy / dist) * speed
  }
}

let rafId = null

function loop() {
  if (store.active) {
    moveCars()
  }

  rafId = requestAnimationFrame(loop)
}

watch(
  () => store.active,
  (active) => {
    if (active && !rafId) {
      rafId = requestAnimationFrame(loop)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})

/* -------------------------
   UI HELPERS
--------------------------*/
function getStyle(car) {
  return {
    left: `${car.x * store.factor_x}px`,
    top: `${car.y * store.factor_y}px`,
  }
}

function getRotation(car) {
  return {
    transform: `rotate(${car.rotation}deg)`
  }
}

/* Code to generate route lines */
const generatePath = ((car_id, route_name) => {
  if (route_name === 'inactive') return ''
  let route_tags = get_route_tags(route_name)
  let depot_prefix_tags = get_prefix_depot_route_tags(car_id)
  let depot_suffix_tags = get_suffix_depot_route_tags(car_id)
  let tags = [...depot_suffix_tags, ...route_tags, ...depot_prefix_tags]
  let positions = []

   // Collect and scale all tag positions
  for (let i = 0; i < tags.length; i++) {
    for (let j = 0; j < store.tag_positions.length; j++) {
        if (tags[i] === store.tag_positions[j].tag_id) {
          positions.push({
            x: store.tag_positions[j].tag_pos.x * store.factor_x,
            y: store.tag_positions[j].tag_pos.y * store.factor_y
          })
          break;
        }
      }
  }

  if (positions.length === 0) return ''
  if (positions.length === 1) return `M ${positions[0].x.toFixed(2)} ${positions[0].y.toFixed(2)}`

  let path = `M ${positions[0].x.toFixed(2)} ${positions[0].y.toFixed(2)}`
  const k = 0.2; 

  for (let i = 0; i < positions.length - 1; i++) {
    const p1 = positions[i];
    const p2 = positions[i + 1];

    // Controleer of de punten exact verticaal of horizontaal op één lijn liggen
    // We gebruiken een kleine marge (0.5 pixel) voor het geval dat er afrondingsverschillen zijn
    const isStraightHorizontal = Math.abs(p1.y - p2.y) < 0.5;
    const isStraightVertical = Math.abs(p1.x - p2.x) < 0.5;

    if (isStraightHorizontal || isStraightVertical) {
      // Als het een recht stuk is, dwingen we een KAARSRECHTE lijn af!
      path += ` L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    } else {
      // Alleen als de lijn écht de hoek om moet, berekenen we een vloeiende bocht
      let cp1x, cp1y, cp2x, cp2y;

      // Stuurpunt 1
      if (i === 0) {
        cp1x = p1.x + (p2.x - p1.x) * k;
        cp1y = p1.y + (p2.y - p1.y) * k;
      } else {
        const p0 = positions[i - 1];
        cp1x = p1.x + (p2.x - p0.x) * k;
        cp1y = p1.y + (p2.y - p0.y) * k;
      }

      // Stuurpunt 2
      if (i === positions.length - 2) {
        cp2x = p2.x - (p2.x - p1.x) * k;
        cp2y = p2.y - (p2.y - p1.y) * k;
      } else {
        const p3 = positions[i + 2];
        cp2x = p2.x - (p3.x - p1.x) * k;
        cp2y = p2.y - (p3.y - p1.y) * k;
      }

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
  }

  return path + "Z";
})

const getCarColor = (carId) => {
  const carData = store.table_data.find(c => c.auto_id === carId);
  return carData?.color || '#808080';
};

const darkenColor = (hex, percent = 20) => {
  const num = parseInt(hex.replace('#', ''), 16);

  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.max(0, Math.floor(r * (100 - percent) / 100));
  g = Math.max(0, Math.floor(g * (100 - percent) / 100));
  b = Math.max(0, Math.floor(b * (100 - percent) / 100));

  return `rgb(${r}, ${g}, ${b})`;
};

const selectTag = ((tag) => {
  store.chosen_tag = tag
})

const getPackages = ((id) => {
  for (let i = 0; i < store.table_data.length; i++) {
    const car = store.table_data[i]
    
    if (car.auto_id === id) {
      return car.pakketje
    }
  }

  return 0;
})

/* -------------------------
   Timer button handlers
--------------------------*/
function handleTimerStart() {
    store.sendData('activation', true);
    store.sendData('load_max_packages', store.table_data);
    store.active = true;
}

function handleTimerStop() {
    store.sendData('activation', false);
    store.active = false;
}

function handleTimerReset() {
    store.sendData('reset', {});
}
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

    <!-- Visualize Panel -->
    <VisualizePanel>
        <template #tags>
            <TagsVisualizer></TagsVisualizer>
        </template>
        <template #scores>
          <BarChart :scoreData="store.results">
          </BarChart>
        </template>
    </VisualizePanel>

    <!-- Simulation area + Bottom bar -->
    <SimulationDisplay class="display-field">
      <template #tags>
        <!-- RFID Tags Container -->
          <div 
            v-if="store.show_tags" 
          >
            <div
              v-for="tag in store.tag_positions"
              :key="tag.tag_id"
              class="absolute cursor-pointer rounded-full bg-black flex items-center justify-center"
              :class="{
                'ring-2 ring-offset-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]': store.chosen_tag?.tag_id === tag.tag_id
              }"
              :style="{
                left: (tag.tag_pos.x * store.factor_x) + 'px',
                top: (tag.tag_pos.y * store.factor_y) + 'px',
                width: '14px',
                height: '14px',
                transform: 'translate(-50%, -50%)'
              }"
              @click="selectTag(tag)"
            >
            </div>
          </div>
      </template>
      
      <template #svg-overlays>
        <!-- Routes -->
        <svg class="absolute inset-0 pointer-events-none"
        width=${MAP_DIMENSION} height=${MAP_DIMENSION}
        v-for="car in store.table_data.filter(c => (c.visueel && c.status))">
            <path
                :d="generatePath(car.auto_id, car.route)"
                fill="none"
                :stroke="car.color"
                stroke-width="2" />
        </svg>
      </template>
      
      <template #car>
        <div
          v-for="car in Object.values(carState.positions)"
          :key="car.id"
          class="car-sprite"
          :style="getStyle(car)"
        >
          <div
            class="car-heading"
            :style=getRotation(car)
          >
            <div class="car-body" :style="{ backgroundColor: getCarColor(car.id) }">
              <div class="car-window"></div>
              <div class="car-hood" :style="{ backgroundColor: darkenColor(getCarColor(car.id), 30) }"></div>
              <div class="car-headlights">
                <span></span>
                <span></span>
              </div>
            </div>
            <span class="cargo-counter">
              {{ getPackages(car.id) }}
            </span>
          </div>
        </div>
      </template>
    </SimulationDisplay>

    <!-- Control Panel  -->
    <ControlPanel 
      class="control-panel"
      v-model:speed="store.speed"
      :scenarios="store.scenarios"
      v-model:chosenScenario="store.chosen_scenario"
      :score="Number(store.results.total)"
      @change-speed="store.sendData('speed', store.speed)"
      @change-scenario="store.sendData('scenario', store.chosen_scenario)"
    >
      <template #simulation-controls>
        <Timer
            :isActive="store.active"
            :showResetButton="true"
            :resetOnStart="false"
            variant="digital-twin"
            @start="handleTimerStart"
            @stop="handleTimerStop"
            @reset="handleTimerReset"
        />
      </template>
    </ControlPanel>
       
  </div>
</template>