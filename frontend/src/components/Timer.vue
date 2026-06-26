<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { BaseButton } from './CustomComponents.js';
import { useLanguageStore } from '../stores/index.js';

const props = defineProps({
    isActive: { type: Boolean, required: true },
    showResetButton: { type: Boolean, default: true },
    resetOnStart: { type: Boolean, default: false },
    startDisabled: { type: Boolean, default: false },
    stopDisabled: { type: Boolean, default: false },
    variant: {
        type: String,
        default: 'digital-twin',
        validator: (value) => [
            'digital-twin',
            'simulation',
        ].includes(value),
    },
});

const emit = defineEmits(['start', 'stop', 'reset']);

const langStore = useLanguageStore();

const intervalId = ref(null);
const elapsedTime = ref(0);

onUnmounted(() => clearInterval(intervalId.value));

function start() {
    if (props.isActive || props.startDisabled) return;

    if (props.resetOnStart) {
        elapsedTime.value = 0;
    }

    emit('start');

    const interval = 10;
    const startTime = Date.now() - elapsedTime.value;
    intervalId.value = setInterval(() => {
        elapsedTime.value = Date.now() - startTime;
    }, interval);
}

function stop() {
    if (!props.isActive || props.stopDisabled) return;

    emit('stop');
    clearInterval(intervalId.value);
}

function reset() {
    if (props.isActive) return;

    elapsedTime.value = 0;
    emit('reset');
}

const formattedTime = computed(() => {
    const PADDING_TWO_DIGITS = 2;
    const MILLISECONDS_PER_SECOND = 1000;
    const CENTISECONDS_PER_MILLISECOND = 10;
    const SECONDS_PER_MINUTE = 60;
    const MINUTES_PER_HOUR = 60;

    const totalSeconds = Math.floor(elapsedTime.value / MILLISECONDS_PER_SECOND);
    const hours = Math.floor(totalSeconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
    const minutes = Math.floor((totalSeconds % (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    const centiseconds = Math.floor((elapsedTime.value % MILLISECONDS_PER_SECOND) / CENTISECONDS_PER_MILLISECOND);

    const pad2 = (n) => String(n).padStart(PADDING_TWO_DIGITS, '0');

    return hours > 0
        ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`
        : `${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`;
});
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
            <BaseButton :variant="`timer-${props.variant}`" :disabled="!props.isActive || props.stopDisabled" @click="stop">
                {{ langStore.getLabel('controls.stopButton') }}
            </BaseButton>
        </div>
        <div class="timer-display">
            <p>{{ langStore.getLabel('generalStats.time') }}: {{ formattedTime }}</p>
        </div>
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

.timer-display {
    font-size: 29px;
    font-weight: bold;
    margin-top: 8px;           
    border-top: 1px solid #000000;
    padding-top: 8px;
    line-height: 1;     
    width: 100%; 
    display: flex;
    justify-content: center; 
}
</style>