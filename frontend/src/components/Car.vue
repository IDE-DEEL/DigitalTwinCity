<script setup>
import { ref } from 'vue';
import { usePageStore } from '../stores/index';
import '../assets/Display.css';

const pageStore = usePageStore();
const previousHeading = ref({});

const props = defineProps({
    car: {
        type: Object,
        required: true,
        // { x, y, rotation, id }
    },
    bodyColor: {
        type: String,
        default: '#4b5563',
    },
    cargoCount: {
        type: Number,
        default: 0,
    },
    title: {
        type: String,
        default: '',
    },
    factorX: {
        type: Number,
        default: 1,
    },
    factorY: {
        type: Number,
        default: 1,
    },
    variant: {
        type: String,
        default: 'digitaltwin',
        validator: (value) => [
            'digitaltwin', 
            'simulation'
        ].includes(value),
    },
});

const getCarSpriteStyle = () => {
    if (pageStore.isDigitalTwin) {
        return {
            left: `${props.car.x * props.factorX}px`,
            top: `${props.car.y * props.factorY}px`,
        };
    } else {
        const scale = 100;
        return {
            left: `${(props.car.position.x / props.factorX) * scale}%`,
            top: `${(props.car.position.y / props.factorY) * scale}%`,
        };
    }
};

const getCarHeadingStyle = () => {
    if (pageStore.isDigitalTwin) {
        return {
            transform: `rotate(${props.car.rotation}deg)`,
            transition: 'transform 260ms ease-out',
        };
    } else {
        const heading = getNormalizedHeading(props.car.heading_deg, props.car.id);
        
        return {
            transform: `rotate(${heading}deg)`,
        };
    }
};

const getNormalizedHeading = (currentHeading, carId) => {
    const fullCircleDegrees = 360;
    const halfCircleDegrees = fullCircleDegrees / 2;
    const wrapOffset = halfCircleDegrees + fullCircleDegrees;

    const prev = previousHeading.value[carId] ?? currentHeading;

    // calculate the shortest angle difference (-180 .. 180)
    const diff = ((currentHeading - prev + wrapOffset) % fullCircleDegrees) - halfCircleDegrees;

    const next = prev + diff;

    previousHeading.value[carId] = next;

    return next;
};
</script>

<template>
  <div
    :class="['car-sprite', `car-sprite--${variant}`]"
    :style="getCarSpriteStyle()"
    :title="props.title"
  >
    <div class="car-heading" :style="getCarHeadingStyle()">
      <div class="car-body" :style="{ background: props.bodyColor }">
        <div class="car-window"></div>
        <div class="car-hood"></div>
        <div class="car-headlights">
          <span></span>
          <span></span>
        </div>
      </div>
      <span class="cargo-counter">
        {{ cargoCount }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.car-sprite {
    position: absolute;
    z-index: 5;
    width: 25.5px;
    height: 36px;
    pointer-events: none;
    transform: translate(-50%, -50%);
}

.car-sprite--simulation {
    transition: all 0.1s linear;
}

.car-heading {
    width: 100%;
    height: 100%;
    transform-origin: center;
}

.car-body {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1.5px solid #111827;
    border-radius: 6px 6px 4.5px 4.5px;
    box-shadow: 0 2.25px 6px rgba(0, 0, 0, 0.28);
}

.car-window {
    position: absolute;
    top: 6px;
    left: 5.25px;
    width: 12px;
    height: 9px;
    border-radius: 3px 3px 1.5px 1.5px;
    background: #bfdbfe;
    border: 0.75px solid #1f2937;
}

.car-hood {
    position: absolute;
    top: 18px;
    left: 5.25px;
    width: 12px;
    height: 9px;
    border-radius: 2.25px;
    background: #374151;
}

.car-headlights {
    position: absolute;
    top: 1.5px;
    left: 3.75px;
    right: 3.75px;
    display: flex;
    justify-content: space-between;
}

.car-headlights span {
    width: 4.5px;
    height: 3px;
    border-radius: 0.75px;
    background: #fde68a;
}

.cargo-counter {
  position: absolute;
  top: 65%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(0deg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 7.5px;
  font-weight: bold;
  text-shadow: 
    -0.75px -0.75px 0 black,
    0.75px -0.75px 0 black,
    -0.75px  0.75px 0 black,
    0.75px  0.75px 0 black;
  pointer-events: none;
  width: 100%;
  height: 100%;
}
</style>