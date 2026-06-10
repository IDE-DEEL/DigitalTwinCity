<script setup>
import '../assets/Slider.css'

const model = defineModel({
  type: Number,
  default: 0,
})

defineProps({
  name: String,
  min: String,
  max: String,
})
</script>

<template>
  <div class="mb-4">
    <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
    <div class="flex items-center gap-3">
      
      <div class="slider-wrapper">
        <span class="slider-value-top">{{ model }}</span>

        <!-- Decoratie -->
        <span class="dot dot-left"></span>
        
        <input 
          type="range" 
          min=min 
          max=max
          class="custom-slider" 
          v-model.number="model"
        />
        
        <span class="dot dot-right"></span>
      </div>
    </div>
  </div>
</template>