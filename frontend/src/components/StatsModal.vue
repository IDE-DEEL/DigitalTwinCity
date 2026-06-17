<template>
    <div v-if="isOpen" @click.self="closeModal" class="fixed backdrop-blur-xs bg-black/40 inset-0 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-gray-300 p-6 flex items-center justify-between">
                <h2 class="text-xl font-bold text-dark">{{ langStore.getLabel('simStats.title') }}</h2>
                <button
                    @click="emit('close')"
                    class="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                >
                    {{ langStore.getLabel('misc.closeButton') }}
                </button>
            </div>

            <!-- Concerns Statistics -->
            <slot name="concerns-statistics"></slot>

            <!-- Run Statistics -->
            <div class="p-6 space-y-6">
                <slot name="run-statistics"></slot>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { useLanguageStore } from '../stores/index.js';

const langStore = useLanguageStore();

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits(['close']);

const closeModal = () => {
    emit('close');
};

const handleKeyDown = (event) => {
    if (event.key === 'Escape' && props.isOpen) {
        closeModal();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
/* Ensure modal is on top of everything */
:deep(.fixed) {
    z-index: 50;
}
</style>