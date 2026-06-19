<script setup>
import '../assets/VisualizePanel.css'
</script>

<template>
    <div class="visualize-panel">
        <div class="tags-wrapper">
            <slot name="tags"></slot>
        </div>
        <div class="spacer"></div>
        <div class="scores-wrapper">
            <slot name="scores"></slot>
        </div>
    </div>
</template>