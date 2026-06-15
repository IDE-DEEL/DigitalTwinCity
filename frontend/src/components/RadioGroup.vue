<script setup>
import '../assets/RadioGroup.css';
import { useLanguageStore } from '../stores/index.js';

const langStore = useLanguageStore();

const model = defineModel({ type: Number, default: "" });
defineProps({ 
    name: String, 
    list: Array,
    disabled: { type: Boolean, default: false }
});
</script>

<template>
  <div class="rg-root">
    <label class="rg-label">{{ name }}:</label>
    <div class="rg-list">
      <label 
        v-for="option in list" 
        :key="option.value"
        class="rg-item"
        :class="{ 'rg-disabled': disabled }"
      >
        <input 
          type="radio" 
          :value="option.value"
          v-model="model"
          :disabled="disabled"
          class="sr-only"
        />
        <div 
          :class="[
            'rg-button',
            model === option.value
              ? 'rg-active'
              : 'rg-inactive',
            disabled ? 'rg-disabled' : ''
          ]"
        >
          {{ langStore.getLabel(`simSpeed.${option.value}`) }}
        </div>
      </label>
    </div>
  </div>
</template>
