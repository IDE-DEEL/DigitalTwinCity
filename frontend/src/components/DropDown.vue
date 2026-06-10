<script setup>
const model = defineModel({
  type: String,
  default: "",
})

defineProps({
  name: String,
  type: String,
  list: Array,
})
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <select class="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue outline-none bg-white text-dark" v-model="model">
        <option v-for="value in list">{{ value }}</option>
      </select>
  </div> 
</template>