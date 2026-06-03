<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, reactive, watch } from 'vue';
import { fetchMapData } from '../logic/service/mapService.js'; 
import { buildLane } from '../logic/service/laneBuilder.js';
import { normalizeDegree } from '../logic/utils/rotation.js';
const factor_y = ref(0)
const MAP_DIMENSION = 3
import { initRfidMapper } from '../logic/service/rfidTagMapper.js';
import { normalizeTagId, store } from '../store.js'
import '../assets/Display.css';

const mapData = ref([]); 
const componentDefinitions = ref({}); 
const isLoading = ref(true);
// const mapGrid = ref(null); 
const factor_x = ref(0)
const MAX_MAP_SCALE = 70;
const MIN_CAR_MOVE_MS = 300;
const MIN_ROUTE_SPEED = 10;
const MAX_ROUTE_SPEED = 100;
const PIXELS_PER_SECOND_PER_SPEED = 2.3;
const SCREEN_SPEED_MULTIPLIER = 0.40;
const MIN_OBSERVED_PIXELS_PER_SECOND = 20;
const MAX_OBSERVED_PIXELS_PER_SECOND = 350;
const OBSERVED_SPEED_SMOOTHING = 0.55;
const TAG_TIMEOUT_MS = 5000;
const DEFAULT_CAR_ROTATION = 0;

let animationFrameId = null;
const carMotionStates = new Map();
const carRealSyncStates = new Map();
const carObservedSpeeds = new Map();
const carPositionsById = reactive({});

//real scale: tile -> 57.5 cm

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

const normalizeCarKey = (autoId, fallback) => {
  return String(autoId ?? fallback).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
}

const lerp = (start, end, progress) => {
  return start + (end - start) * progress;
}

const getHeadingAngle = (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.hypot(dx, dy) < 0.5) {
    return DEFAULT_CAR_ROTATION;
  }

  return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
}

const orderedTags = computed(() => {
  return store.tag_positions.map((tag, index) => ({
    id: normalizeTagId(tag.tag_id),
    index,
    x: tag.tag_pos.x,
    y: tag.tag_pos.y,
  }));
})

const findTagPosition = (tagId) => {
  const normalizedTagId = normalizeTagId(tagId);
  return orderedTags.value.find(tag => tag.id === normalizedTagId) ?? null;
}

const getNextTagPosition = (tagId) => {
  const currentTag = findTagPosition(tagId);

  if (!currentTag || orderedTags.value.length < 2) {
    return null;
  }

  return orderedTags.value[(currentTag.index + 1) % orderedTags.value.length];
}

const getPixelsPerSecond = () => {
  const routeSpeed = clamp(Number(store.speed) || 50, MIN_ROUTE_SPEED, MAX_ROUTE_SPEED);
  return routeSpeed * PIXELS_PER_SECOND_PER_SPEED;
}

const updateObservedSpeed = (carId, previousTagId, currentTagId, previousUpdateAt, now) => {
  if (!previousTagId || !previousUpdateAt || previousTagId === currentTagId) {
    return;
  }

  const previousTag = findTagPosition(previousTagId);
  const currentTag = findTagPosition(currentTagId);
  const elapsedSeconds = (now - previousUpdateAt) / 1000;

  if (!previousTag || !currentTag || elapsedSeconds <= 0.2) {
    return;
  }

  const distance = Math.hypot(currentTag.x - previousTag.x, currentTag.y - previousTag.y);
  const observedSpeed = clamp(
    distance / elapsedSeconds,
    MIN_OBSERVED_PIXELS_PER_SECOND,
    MAX_OBSERVED_PIXELS_PER_SECOND,
  );
  const previousObservedSpeed = carObservedSpeeds.get(carId) ?? observedSpeed;
  const smoothedSpeed = lerp(previousObservedSpeed, observedSpeed, OBSERVED_SPEED_SMOOTHING);

  carObservedSpeeds.set(carId, smoothedSpeed);
}

const getMoveDuration = (carId, from, to) => {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const pixelsPerSecond = (carObservedSpeeds.get(carId) ?? getPixelsPerSecond()) * SCREEN_SPEED_MULTIPLIER;

  return Math.max(MIN_CAR_MOVE_MS, Math.round((distance / pixelsPerSecond) * 1000));
}

// Update factor to scale the x and y coordinates of a tag or car
const updateFactor = (event) => {
  factor_x.value = (event.target.clientWidth / 400)
  factor_y.value = (event.target.clientHeight / 400)
}

const getMotionPosition = (motion, now) => {
  if (!motion) {
    return null;
  }

  const progress = clamp((now - motion.startedAt) / motion.duration, 0, 1);

  return {
    x: lerp(motion.from.x, motion.to.x, progress),
    y: lerp(motion.from.y, motion.to.y, progress),
    progress,
  };
}

const setCarDisplayPosition = (carId, carMeta, position, rotation = DEFAULT_CAR_ROTATION) => {
  carPositionsById[carId] = {
    id: carId,
    auto_id: carMeta.auto_id,
    x: position.x,
    y: position.y,
    rotation,
  };
}

const startMotion = (carId, carMeta, from, to, targetTagId, mode) => {
  const duration = getMoveDuration(carId, from, to);
  const rotation = getHeadingAngle(from, to);

  carMotionStates.set(carId, {
    carMeta,
    from,
    to,
    targetTagId,
    mode,
    rotation,
    duration,
    startedAt: performance.now(),
  });

  setCarDisplayPosition(carId, carMeta, from, rotation);
}

const startPredictionFromTag = (carId, carMeta, tag) => {
  const nextTag = getNextTagPosition(tag.id);

  if (!nextTag) {
    setCarDisplayPosition(carId, carMeta, tag);
    carMotionStates.delete(carId);
    return;
  }

  startMotion(carId, carMeta, tag, nextTag, nextTag.id, 'predicted');
}

const setRealSyncState = (carId, tagId, updateAt, stopped = false) => {
  carRealSyncStates.set(carId, {
    lastRealTagId: tagId,
    lastRealUpdateAt: updateAt,
    stopped,
  });
}

const carTargets = computed(() => {
  return store.car_data.map((car, index) => {

    const foundTag = findTagPosition(car.tag_id);

    if (!foundTag) {
      return null;
    }
    
    const id = normalizeCarKey(car.auto_id, `car-${index}`);
    
    return {
      id,
      tag_id: foundTag.id,
      x: foundTag.x,
      y: foundTag.y,
      auto_id: car.auto_id,
    }
  }).filter(Boolean)
})

watch(carTargets, (targets) => {
  const activeCarIds = new Set();
  const now = performance.now();

  targets.forEach((target) => {
    activeCarIds.add(target.id);

    const carMeta = {
      auto_id: target.auto_id,
    };

    const currentTag = findTagPosition(target.tag_id);
    if (!currentTag) {
      return;
    }

    const existingMotion = carMotionStates.get(target.id);
    const realSyncState = carRealSyncStates.get(target.id);

    if (realSyncState?.lastRealTagId === target.tag_id && !realSyncState.stopped) {
      if (existingMotion) {
        existingMotion.carMeta = carMeta;
      } else {
        setCarDisplayPosition(target.id, carMeta, currentTag);
      }

      realSyncState.lastRealUpdateAt = now;
      return;
    }

    if (!realSyncState?.stopped) {
      updateObservedSpeed(
        target.id,
        realSyncState?.lastRealTagId,
        target.tag_id,
        realSyncState?.lastRealUpdateAt,
        now,
      );
    } else {
      carObservedSpeeds.delete(target.id);
    }

    setRealSyncState(target.id, target.tag_id, now);

    if (realSyncState?.stopped) {
      startPredictionFromTag(target.id, carMeta, currentTag);
      setCarDisplayPosition(
        target.id,
        carMeta,
        currentTag,
        getHeadingAngle(currentTag, getNextTagPosition(currentTag.id) ?? currentTag),
      );
      return;
    }

    const displayPosition = getMotionPosition(existingMotion, now) ?? carPositionsById[target.id] ?? currentTag;
    const distanceToRealTag = Math.hypot(displayPosition.x - currentTag.x, displayPosition.y - currentTag.y);

    if (distanceToRealTag > 1) {
      startMotion(target.id, carMeta, displayPosition, currentTag, currentTag.id, 'correction');
    } else {
      startPredictionFromTag(target.id, carMeta, currentTag);
    }
  });

  Array.from(carRealSyncStates.keys()).forEach((carId) => {
    if (!activeCarIds.has(carId)) {
      carMotionStates.delete(carId);
      carRealSyncStates.delete(carId);
      carObservedSpeeds.delete(carId);
      delete carPositionsById[carId];
    }
  });
}, { immediate: true });

const carPositions = computed(() => {
  return Object.values(carPositionsById);
})

const getCarSpriteStyle = (car) => {
  return {
    left: `${car.x * factor_x.value}px`,
    top: `${car.y * factor_y.value}px`,
  };
}

const getCarHeadingStyle = (car) => {
  return {
    transform: `rotate(${car.rotation}deg)`,
  };
}

const animateCars = (now) => {
  carMotionStates.forEach((motion, carId) => {
    const realSyncState = carRealSyncStates.get(carId);

    if (
      realSyncState &&
      !realSyncState.stopped &&
      now - realSyncState.lastRealUpdateAt >= TAG_TIMEOUT_MS
    ) {
      const lastRealTag = findTagPosition(realSyncState.lastRealTagId);

      if (lastRealTag) {
        setCarDisplayPosition(carId, motion.carMeta, lastRealTag, motion.rotation);
      }

      carMotionStates.delete(carId);
      carObservedSpeeds.delete(carId);
      realSyncState.stopped = true;
      return;
    }

    const position = getMotionPosition(motion, now);

    if (!position) {
      return;
    }

    setCarDisplayPosition(carId, motion.carMeta, position, motion.rotation);

    if (position.progress >= 1) {
      if (motion.mode === 'correction') {
        const realTag = findTagPosition(motion.targetTagId);
        if (realTag) {
          startPredictionFromTag(carId, motion.carMeta, realTag);
        }
      } else if (motion.mode === 'predicted') {
        const nextTag = findTagPosition(motion.targetTagId);
        if (nextTag) {
          startPredictionFromTag(carId, motion.carMeta, nextTag);
        }
      }
    }
  });

  animationFrameId = requestAnimationFrame(animateCars);
}

watch(() => store.speed, () => {
  const now = performance.now();

  carMotionStates.forEach((motion, carId) => {
    const position = getMotionPosition(motion, now);
    if (!position) {
      return;
    }

    startMotion(carId, motion.carMeta, position, motion.to, motion.targetTagId, motion.mode);
  });
});

onMounted(() => {
  animationFrameId = requestAnimationFrame(animateCars);
});

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});
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
            x: store.tag_positions[j].tag_pos.x * factor_x.value,
            y: store.tag_positions[j].tag_pos.y * factor_y.value
          })
          break;
      }
      }
  }

  if (positions.length === 0) return ''
  if (positions.length === 1) return `M ${positions[0].x} ${positions[0].y}`

  let path = `M ${positions[0].x.toFixed(2)} ${positions[0].y.toFixed(2)}`
  const tension = 0.35 // Restored natural corner curvature

  for (let i = 0; i < positions.length - 1; i++) {
    const p0 = positions[i - 1] || positions[i]
    const p1 = positions[i]
    const p2 = positions[i + 1]
    const p3 = positions[i + 2] || p2

    // 1. Calculate angles of the heading vectors
    const angleLeft = Math.atan2(p1.y - p0.y, p1.x - p0.x)
    const angleCurrent = Math.atan2(p2.y - p1.y, p2.x - p1.x)
    const angleRight = Math.atan2(p3.y - p2.y, p3.x - p2.x)

    // 2. Measure heading deviations (in radians)
    const diffLeft = Math.abs(Math.atan2(Math.sin(angleCurrent - angleLeft), Math.cos(angleCurrent - angleLeft)))
    const diffRight = Math.abs(Math.atan2(Math.sin(angleRight - angleCurrent), Math.cos(angleRight - angleCurrent)))

    // 3. Higher threshold (approx 25 degrees) to catch imperfectly aligned tags 
    // on the top, left, and bottom sides of your factory map loop
    const angleThreshold = 0.45 

    const isLeftStraight = diffLeft < angleThreshold
    const isRightStraight = diffRight < angleThreshold

    // 4. Force control points flat if heading isn't turning
    const t1 = isLeftStraight ? 0 : tension
    const t2 = isRightStraight ? 0 : tension

    // 5. Generate pristine control points
    const cp1x = p1.x + (p2.x - p0.x) * t1
    const cp1y = p1.y + (p2.y - p0.y) * t1
    const cp2x = p2.x - (p3.x - p1.x) * t2
    const cp2y = p2.y - (p3.y - p1.y) * t2

    if (isLeftStraight && isRightStraight) {
      // Clean, unwarped straight track segment
      path += ` L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    } else {
      // Fluid turn transitioning smoothly into a straight section
      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    }
  }

  return path + "Z";
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
                    v-resize="updateFactor"
                    />
                </div>
            </div>

            <!-- RIFD Tags -->
            <svg
            v-for="tag in store.tag_positions"
            :key="tag.tag_id"
            class="absolute inset-0 w-full h-full pointer-events-none">
                <circle :cx="tag.tag_pos.x * factor_x" :cy="tag.tag_pos.y * factor_y" r="7" fill="black"></circle>
            </svg>

            <!-- Routes -->
            <svg class="absolute inset-0 pointer-events-none"
            width=${MAP_DIMENSION} height=${MAP_DIMENSION}
            v-for="car in store.table_data.filter(c => c.visueel === true)">
                <path
                    :d="generatePath(car.route)"
                    fill="none"
                    stroke="#F54242"
                    stroke-width="4" />

            </svg>

            <!-- Auto -->
            <div
                v-for="car in carPositions"
                :key="car.id"
                class="car-sprite"
                :style="getCarSpriteStyle(car)"
            >
                <div class="car-heading" :style="getCarHeadingStyle(car)">
                    <div class="car-body">
                        <div class="car-window"></div>
                        <div class="car-hood"></div>
                        <div class="car-headlights">
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div> 
  </div>
</template>