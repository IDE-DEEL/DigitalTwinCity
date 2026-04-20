<script setup>
const props = defineProps(['name', 'value']);
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <div class="flex items-center gap-3">
        <input type="range" min="0" max="100" class="w-full accent-blue-200" />
        <span class="text-sm font-mono w-10">{{ value }}</span>
      </div>
  </div>
</template>