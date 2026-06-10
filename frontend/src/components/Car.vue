<script setup>
import { defineProps, computed } from 'vue';
import '../assets/Display.css';

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
  isDigitalTwin: {
    type: Boolean,
    default: true,
  },
});

const getCarSpriteStyle = () => {
    if (props.isDigitalTwin) {
        return {
            left: `${props.car.x * props.factorX}px`,
            top: `${props.car.y * props.factorY}px`,
        };
    } else {
        const xPercent = (props.car.position[0] / props.factorX) * 100;
        const yPercent = (props.car.position[1] / props.factorY) * 100;

        return {
            left: `calc(${xPercent}%`,
            top: `calc(${yPercent}%`,
        };
    }
};

const getCarHeadingStyle = () => {
    return props.isDigitalTwin ? 
    {
        transform: `rotate(${props.car.rotation}deg)`,
        transition: 'transform 260ms ease-out',
    } : {
        transform: `rotate(${props.car.heading_deg}deg)`,
    };
};
</script>

<template>
  <div
    class="car-sprite"
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
