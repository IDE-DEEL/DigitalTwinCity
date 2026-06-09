<script setup>
import TagsVisualizer from './TagsVisualizer.vue'
</script>

<template>
    <div>
        <slot name="content">
            <TagsVisualizer></TagsVisualizer>
        </slot>
    </div>
</template>