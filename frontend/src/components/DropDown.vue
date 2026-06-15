<script setup>
import { computed } from 'vue'
import { useLanguageStore } from '../stores/index.js';

const langStore = useLanguageStore();

const model = defineModel({
  type: String,
  default: "",
})

const props = defineProps({
    name: String,
    type: String,
    list: Array,
    disabled: { type: Boolean, default: false },
})

// Determine if list contains objects with {value, label} or just strings
const isObjectList = computed(() => 
  props.list && props.list.length > 0 && typeof props.list[0] === 'object'
)
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <select class="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue outline-none bg-white text-dark"
        v-model="model"
        :disabled="disabled"
        :class="{'opacity-50 cursor-not-allowed': disabled }"
        >
        <!-- For object list with {value, label} -->
        <option v-if="isObjectList" v-for="item in list" :key="item.value" :value="item.value">
          {{ langStore.getLabel(`simScenarios.${item.label}`) }}
        </option>
        <!-- For simple string list -->
        <option v-else v-for="value in list">{{ value }}</option>
      </select>
  </div> 
</template>