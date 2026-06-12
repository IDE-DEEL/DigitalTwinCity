<script setup>
import { getLabel } from '../constants/ui_labels.js';
import "../assets/WebSocketStatus.css";

defineProps({
    isConnected: {
        type: Boolean,
        default: false
    },
    reconnectCooldown: {
        type: Boolean,
        default: false
    }
});

defineEmits(['reconnect']);
</script>

<template>
  <div v-if="!isConnected" class="websocket-status-container">
    <div class="websocket-status-indicator"></div>
    <span class="websocket-status-text">
        {{ getLabel('websocketNotConnected') }}
    </span>
    <button 
      class="websocket-status-button"
      @click="$emit('reconnect')"
      :disabled="reconnectCooldown"
      :class="{ 'websocket-status-button--disabled': reconnectCooldown }"
    >
        {{ getLabel('websocketRefresh') }}
    </button>
  </div>
</template>
