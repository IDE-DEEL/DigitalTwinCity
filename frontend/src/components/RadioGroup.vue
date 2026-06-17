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

<style scoped>
/* Label styling */
.rg-label {
    display: block;
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    margin-bottom: 0.5rem;
}

/* List layout */
.rg-list {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
}

/* Each radio wrapper */
.rg-item {
    flex: 1 1 0%;
    position: relative;
    cursor: pointer;

    min-width: 0;
}

/* Button base */
.rg-button {
    width: 100%;
    padding: 0.25rem 0.75rem;
    text-align: center;
    font-weight: var(--font-medium);
    transition: background-color 150ms ease, color 150ms ease;
    border: 1px groove var(--color-button-border);
    display: block;
    box-sizing: border-box;
    border-radius: var(--rounded-xl);
    font-size: var(--text-base);
}

/* Active / selected */
.rg-active {
    color: var(--color-primary-blue);
    border: 0.25rem outset var(--color-primary-blue);
    cursor: not-allowed;
    background-color: var(--color-text-white);
}

/* Inactive / unselected */
.rg-inactive {
    color: var(--color-text-white);
    border: 0.25rem outset var(--color-text-white);
    background-color: var(--color-primary-blue);
}
.rg-inactive:hover {
    background-color: var(--color-primary-blue-hover);
}

/* Disabled state applied to wrapper or button */
.rg-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>