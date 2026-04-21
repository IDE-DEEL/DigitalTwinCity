<script setup>
import { watch } from 'vue'
import { send_data } from '../store.js'

const model = defineModel({ type: Number, default: 0 });
const props = defineProps({ name: String });

watch(model, () => {
  send_data()
})
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <div class="flex items-center gap-3">
        <input type="range" min="0" max="100" class="w-full accent-blue-200" v-model.number="model"/>
        <span class="text-sm font-mono w-10">{{ model }}</span>
      </div>
  </div>
</template>