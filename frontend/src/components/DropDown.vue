<script setup>
const props = defineProps(['name', 'data']);
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <select class="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue outline-none bg-white text-dark" v-model="scenario">
        <option>Placeholder 1</option>
        <option>Placeholder 2</option>
      </select>
  </div> 
</template>