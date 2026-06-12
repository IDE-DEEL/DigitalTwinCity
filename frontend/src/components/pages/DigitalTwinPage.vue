<script setup>
import '../../assets/MainContent.css'
import '../../assets/Cars.css'
import ControlPanel from '../ControlPanel.vue'
import SimulationDisplay from '../SimulationDisplay.vue'
import VisualizePanel from '../VisualizePanel.vue'
import { onMounted, ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useDigitalTwinStore, normalizeTagId } from '../../stores/digital-twin.js'

const store = useDigitalTwinStore()

const MIN_CAR_MOVE_MS = 300
const MIN_ROUTE_SPEED = 10
const MAX_ROUTE_SPEED = 100
const PIXELS_PER_SECOND_PER_SPEED = 2.3
const SCREEN_SPEED_MULTIPLIER = 0.4
const DEFAULT_ROTATION = 0
const TAG_TIMEOUT_MS = 5000

let animationFrameId = null;
let simulationInterval = null;

/* -------------------------
   STATE (SIM ENGINE)
--------------------------*/
const carState = reactive({
  positions: {},      // UI positions
})

const motions = new Map()
const lastAngles = new Map()

/* -------------------------
   INIT
--------------------------*/
onMounted(() => {
  store.connect()
  requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
})

/* -------------------------
   TAGS
--------------------------*/
const orderedTags = computed(() =>
  store.tag_positions.map((t, i) => ({
    id: normalizeTagId(t.tag_id),
    index: i,
    x: t.tag_pos.x,
    y: t.tag_pos.y,
  }))
)

function findTag(id) {
  const nid = normalizeTagId(id)
  return orderedTags.value.find(t => t.id === nid)
}

function nextTag(id) {
  const t = findTag(id)
  if (!t || orderedTags.value.length < 2) return null
  return orderedTags.value[(t.index + 1) % orderedTags.value.length]
}

/* -------------------------
   SPEED
--------------------------*/
function baseSpeed() {
  const s = Math.min(Math.max(Number(store.speed) || 50, MIN_ROUTE_SPEED), MAX_ROUTE_SPEED)
  return s * PIXELS_PER_SECOND_PER_SPEED
}

/* -------------------------
   POSITION INTERPOLATION
--------------------------*/
function lerp(a, b, t) {
  return a + (b - a) * t
}

function getPosition(m, now) {
  const p = Math.min((now - m.start) / m.duration, 1)
  return {
    x: lerp(m.from.x, m.to.x, p),
    y: lerp(m.from.y, m.to.y, p),
    progress: p
  }
}

/* -------------------------
   HEADING
--------------------------*/
function getAngle(id, from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y

  let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
  const prev = lastAngles.get(id)

  if (prev !== undefined) {
    let diff = angle - prev
    while (diff > 180) angle -= 360
    while (diff < -180) angle += 360
  }

  lastAngles.set(id, angle)
  return angle
}

/* -------------------------
   MOTION ENGINE
--------------------------*/
function startMotion(id, car, from, to, targetTag) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const speed = baseSpeed() * SCREEN_SPEED_MULTIPLIER

  motions.set(id, {
    car,
    from,
    to,
    targetTag,
    start: performance.now(),
    duration: Math.max(MIN_CAR_MOVE_MS, (dist / speed) * 1000),
    angle: getAngle(id, from, to),
  })
}

/* -------------------------
   RENDER POSITION
--------------------------*/
function setPosition(id, car, pos, angle = DEFAULT_ROTATION) {
  carState.positions[id] = {
    id,
    auto_id: car.auto_id,
    x: pos.x,
    y: pos.y,
    rotation: angle
  }
}

/* -------------------------
   WATCH (ONLY SYNC + START)
--------------------------*/
watch(() => store.car_data, (cars) => {
  cars.forEach((car, i) => {
    const tag = findTag(car.tag_id)
    if (!tag) return

    const id = car.auto_id

    if (!carState.positions[id]) {
      setPosition(id, car, tag)
    }

    if (!motions.has(id)) {
      const n = nextTag(tag.id)
      if (n) {
        startMotion(id, car, tag, n, n.id)
      }
    }
  })
}, { immediate: true })

/* -------------------------
   ANIMATION LOOP
--------------------------*/
let animationId = null

function animate(now) {
  if (store.active) {
    
    for (const [id, m] of motions) {
      const pos = getPosition(m, now)
      setPosition(id, m.car, pos, m.angle)

      if (pos.progress >= 1) {
        const next = nextTag(m.targetTag)
        if (next) {
          startMotion(id, m.car, m.to, next, next.id)

          console.log(pos)
        }
      }
    }
  }

  animationId = requestAnimationFrame(animate)
}

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
const generatePath = ((route_name) => {
  let tags = []
  let positions = []
  
  // Collect all tags from the route
  for (let i = 0; i < store.routes.length; i++) {
    if (route_name === store.routes[i].route) {
      tags = store.routes[i].tags
      break;
    }
  }

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

  return path;
})

const getRouteColor = ((carRouteName) => {
  const foundRoute = store.routes.find(r => r.route === carRouteName);
  if (foundRoute && foundRoute.color) {
    return foundRoute.color;
  }
  
  return "#ccc";
})

const selectTag = ((tag) => {
  store.chosen_tag = tag
})
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

    <!-- Visualize Panel -->
    <VisualizePanel class="visualize-panel" />

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
        v-for="car in store.table_data.filter(c => c.visueel === true)">
            <path
                :d="generatePath(car.route)"
                fill="none"
                :stroke="getRouteColor(car.route)"
                stroke-width="4" />
        </svg>
      </template>
      
      <template #car>
        <div
          v-for="car in Object.values(carState.positions)"
          :key="car.id"
          class="car-sprite"
          :style="getStyle(car)"
        >
          <div class="car-heading" :style="getRotation(car)">
            <div class="car-body"> 
              <div class="car-window">
              </div> 
              <div class="car-hood">
              </div> 
              <div class="car-headlights"> 
                <span></span> 
                <span></span> 
              </div>
            </div>
          </div>
        </div>
      </template>
    </SimulationDisplay>

    <!-- Control Panel -->
    <ControlPanel class="control-panel" />
       
  </div>
</template>