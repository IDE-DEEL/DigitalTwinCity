<script setup>
const props = defineProps(['data']);
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">Auto's:</label>
      <div class="bg-white border border-gray-300 rounded-md h-32 overflow-y-auto text-sm">
        <div class="flex justify-between px-3 py-2 border-b border-gray-100 font-semibold text-gray-700">
          <span>ID</span><span>Pakketjes</span>
        </div>
        <div class="flex justify-between px-3 py-1 border-b text-gray-600">
          <span>Auto 1</span><span>2</span>
        </div>
          <div class="flex justify-between px-3 py-1 text-gray-600">
            <span>Auto 2</span><span>0</span>
          </div>
      </div>
  </div>
</template>