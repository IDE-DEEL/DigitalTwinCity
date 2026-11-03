<script setup>
import { ref } from 'vue';
import BaseButton from '../base/BaseButton.vue';
import Timer from './Timer.vue';
import { useLanguageStore } from '../../stores/index.js';

const props = defineProps({
    isActive: { type: Boolean, required: true },
    showResetButton: { type: Boolean, default: true },
    resetOnStart: { type: Boolean, default: false },
    startDisabled: { type: Boolean, default: false },
    isPaused: { type: Boolean, default: false },
    stopDisabled: { type: Boolean, default: false },
    variant: {
        type: String,
        default: 'digital-twin',
        validator: (value) => ['digital-twin', 'simulation'].includes(value),
    },
});
const emit = defineEmits(['start', 'stop', 'pause', 'reset']);
const langStore = useLanguageStore();
const timerKey = ref(0);

function start() {
    if (props.isActive || props.startDisabled) return;
    if (props.resetOnStart) timerKey.value++;
    emit('start');
}
function pause() {
    if (!props.isActive || props.stopDisabled) return;
    emit('pause');
}
function stop() {
    if (!props.isActive || props.stopDisabled) return;
    emit('stop');
}
function reset() {
    if (props.isActive) return;
    timerKey.value++;
    emit('reset');
}
</script>
<template>
    <div class="timer-area">
        <div class="timer-button-row">
            <BaseButton :variant="`timer-${props.variant}`" :disabled="props.isActive || props.startDisabled" @click="start">
                {{ langStore.getLabel('controls.startButton') }}
            </BaseButton>
            <BaseButton v-if="props.showResetButton" :variant="`timer-${props.variant}`" :disabled="props.isActive" @click="reset">
                {{ langStore.getLabel('controls.resetButton') }}
            </BaseButton>
            <BaseButton
                v-if="props.variant === 'simulation'"
                :variant="`timer-${props.variant}`"
                :disabled="!props.isActive || props.stopDisabled"
                @click="pause"
            >
                <span aria-hidden="true">
                    {{ props.isPaused ? '▶' : '⏸' }}
                </span>
                <span>
                    {{
                        props.isPaused
                            ? langStore.getLabel('controls.resumeButton')
                            : langStore.getLabel('controls.pauseButton')
                    }}
                </span>
            </BaseButton>
            <BaseButton :variant="`timer-${props.variant}`" :disabled="!props.isActive || props.stopDisabled" @click="stop">
                {{ langStore.getLabel('controls.stopButton') }}
            </BaseButton>
        </div>
        <Timer :key="timerKey" :isActive="props.isActive" :isPaused="props.isPaused" />
  </div>
</template>
<style scoped>

.timer-area {
    display: flex;
    flex-direction: column;    
    align-items: center; 
    gap: 10px;                 
    flex-shrink: 0;            
}

.timer-button-row {
    flex: 1;
    display: flex;
    gap: 8px; 
}

</style>
