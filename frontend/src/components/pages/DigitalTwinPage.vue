<script setup>
import '../../assets/MainContent.css'
import '../../assets/Cars.css'
import ControlPanel from '../ControlPanel.vue'
import SimulationDisplay from '../SimulationDisplay.vue'
import VisualizePanel from '../VisualizePanel.vue'
import { onMounted, ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useDigitalTwinStore, normalizeTagId } from '../../stores/digital-twin.js'

const store = useDigitalTwinStore()

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

onMounted(() => {
  store.connect()
})

/* Code to generate cars */
const normalizeCarKey = (autoId, fallback) => {
  return String(autoId ?? fallback).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
}

const lerp = (start, end, progress) => {
  return start + (end - start) * progress;
}

const lastCarAngles = new Map();

const getHeadingAngle = (carId, from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.hypot(dx, dy) < 0.5) {
    return lastCarAngles.get(carId) ?? DEFAULT_CAR_ROTATION;
  }

  let targetAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  
  const previousAngle = lastCarAngles.get(carId);
  
  if (previousAngle !== undefined) {
    let angleDifference = targetAngle - previousAngle;
    
    while (angleDifference < -180) {
      targetAngle += 360;
      angleDifference = targetAngle - previousAngle;
    }
    while (angleDifference > 180) {
      targetAngle -= 360;
      angleDifference = targetAngle - previousAngle;
    }
  }

  lastCarAngles.set(carId, targetAngle);
  return targetAngle;
};

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

const getMotionPosition = (motion, now) => {
  if (!motion) return null;

  const progress = clamp(
    (now - motion.startedAt) / motion.duration,
    0,
    1
  );

  return {
    x: lerp(motion.from.x, motion.to.x, progress),
    y: lerp(motion.from.y, motion.to.y, progress),
    progress
  };
};

const setCarDisplayPosition = (
  id,
  { auto_id },
  { x, y },
  rotation = DEFAULT_CAR_ROTATION
) => {
  carPositionsById[id] = { id, auto_id, x, y, rotation };
};

const startMotion = (carId, carMeta, from, to, targetTagId, mode) => {
  const duration = getMoveDuration(carId, from, to);
  const rotation = getHeadingAngle(carId, from, to);

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

const carTargets = computed(() =>
  store.car_data
    .map((car, index) => {
      const tag = findTagPosition(car.tag_id);
      if (!tag) return null;

      return {
        id: normalizeCarKey(car.auto_id, `car-${index}`),
        auto_id: car.auto_id,
        tag_id: tag.id,
        x: tag.x,
        y: tag.y,
      };
    })
    .filter(Boolean)
);

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
    left: `${car.x * store.factor_x}px`,
    top: `${car.y * store.factor_y}px`,
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
      </template>
    </SimulationDisplay>

    <!-- Control Panel -->
    <ControlPanel class="control-panel" />
       
  </div>
</template>