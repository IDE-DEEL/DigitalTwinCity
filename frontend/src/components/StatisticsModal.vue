<script setup>
import '../assets/StatisticsModal.css'
</script>

<template>
<div class="modal-mask">
  <div class="modal-wrapper">
    <div class="modal-container">
      <div class="modal-header">
        <slot name="header">
        </slot>

        <button class="modal-default-button" @click="$emit('close')">
          <p>X</p>
        </button>
      </div>

      <div class="modal-body">
        <slot name="body">
        default body
        </slot>
      </div>

      <div class="modal-footer">
        <slot name="footer">
          default footer
        </slot>
      </div>
    </div>
  </div>
</div>
</template>