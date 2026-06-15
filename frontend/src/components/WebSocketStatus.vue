<script setup>
import { useLanguageStore } from '../stores/index.js';
import "../assets/WebSocketStatus.css";

const langStore = useLanguageStore();

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
        {{ langStore.getLabel('websocket.notConnected') }}
    </span>
    <button 
      class="websocket-status-button"
      @click="$emit('reconnect')"
      :disabled="reconnectCooldown"
      :class="{ 'websocket-status-button--disabled': reconnectCooldown }"
    >
        {{ langStore.getLabel('websocket.refresh') }}
    </button>
  </div>
</template>
