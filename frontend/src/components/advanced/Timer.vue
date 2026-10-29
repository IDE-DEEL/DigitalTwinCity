<script setup>
import { ref, computed, onUnmounted, watch } from 'vue';
import { useLanguageStore } from '../../stores/index.js';
const props = defineProps({
    isActive: { type: Boolean, required: true },
    isPaused: { type: Boolean, default: false },
});
const langStore = useLanguageStore();
const intervalId = ref(null);
const elapsedTime = ref(0);

onUnmounted(() => clearInterval(intervalId.value));

function startTicking() {
    if (intervalId.value) return; // prevent double activation
    
    const interval = 10;
    const startTime = Date.now() - elapsedTime.value;
    intervalId.value = setInterval(() => {
        elapsedTime.value = Date.now() - startTime;
    }, interval);
}

function stopTicking() {
    clearInterval(intervalId.value);
    intervalId.value = null;
}

watch(
    () => props.isActive && !props.isPaused,
    (running) => {
        if (running) {
            startTicking();
        } else {
            stopTicking();
        }
    },
    { immediate: true }
);

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
    <div class="timer-display">
        <p>{{ langStore.getLabel('generalStats.time') }}: {{ formattedTime }}</p>
    </div>
</template>
<style scoped>
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
