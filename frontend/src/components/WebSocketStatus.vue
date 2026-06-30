<script setup>
import { useLanguageStore } from '../stores/index.js';
import { BaseButton } from './CustomComponents.js';

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
        <div class="websocket-status-content">
            <div class="websocket-status-indicator"></div>
            <span class="websocket-status-text">
                {{ langStore.getLabel('websocket.notConnected') }}
            </span>
            <BaseButton 
                variant="websocket"
                @click="$emit('reconnect')"
                :disabled="reconnectCooldown"
            >
                {{ langStore.getLabel('websocket.refresh') }}
            </BaseButton>
        </div>
    </div>
</template>

<style scoped>
.websocket-status-container {
    padding-bottom: var(--parameter-padding);
}

.websocket-status-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid rgb(252, 165, 165);
    padding: 0.75rem;
    background-color: rgb(254, 226, 226);
    border-radius: var(--rounded-xs);
}

.websocket-status-indicator {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background-color: rgb(239, 68, 68);
}

.websocket-status-text {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: rgb(159, 18, 57);
}

.websocket-status-button:hover:not(:disabled) {
    background-color: var(--color-primary-blue-hover);
}
</style>
