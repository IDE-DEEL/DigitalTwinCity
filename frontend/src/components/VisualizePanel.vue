<script setup>
</script>

<template>
    <div class="visualize-panel">
        <slot name="tags"></slot>
        <slot name="scores"></slot>
    </div>
</template>

<style scoped>
.visualize-panel {
  padding: 28px;
  background-color: var(--color-primary-gray2);
  flex: 0 1 21%;
}
</style>