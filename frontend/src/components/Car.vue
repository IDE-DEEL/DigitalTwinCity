<template>
  <div 
    class="absolute w-full h-full flex items-center justify-center"
    :style="carStyle"
  >
    <img 
      src="/assets/car.png" 
      alt="Car"
      class="w-1/2 h-1/2 object-contain"
      :style="{ transform: `rotate(${currentRotation}deg)` }"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({

  xOffset: { type: Number, default: 0.5 }, 
  yOffset: { type: Number, default: 0.5 },
  angle: { type: Number, default: 0 },

});

const currentRotation = computed(() => {
    return props.angle;
});

const carStyle = computed(() => ({

    left: `${props.xOffset * 100}%`,
    top: `${props.yOffset * 100}%`,
    transformOrigin: 'center center',
    
    transform: 'translate(-50%, -50%)', 
    width: '100%',
    height: '100%',
}));
</script>