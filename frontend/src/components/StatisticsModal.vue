<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { useLanguageStore } from '../stores/index.js';
import { BaseButton } from './CustomComponents.js';

const langStore = useLanguageStore();

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    },
    title: {
        type: String,
        default: ''
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

<template>
    <div v-if="isOpen" @click.self="closeModal" class="fixed backdrop-blur-xs bg-black/40 inset-0 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[95vh] overflow-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-gray-300 p-6 pt-3 pb-3 flex items-center justify-between">
                <h2 class="text-xl font-bold text-dark">{{ langStore.getLabel('statsModal.simTitle') }}</h2>
                <BaseButton
                    @click="emit('close')"
                    variant="x"
                >
                    {{ langStore.getLabel('misc.closeButton') }}
                </BaseButton>
            </div>

            <!-- Concerns Statistics -->
            <slot name="concerns-statistics"></slot>

            <hr v-if="$slots['concerns-statistics'] && $slots['run-statistics']" class="section-divider" /> 

            <!-- Run Statistics -->
            <slot name="run-statistics"></slot>
        </div>
    </div>
</template>

<style scoped>
/* Ensure modal is on top of everything */
:deep(.fixed) {
    z-index: 50;
}

.header {
    background: var(--color-primary-gray1);
}

.section-divider {
    height: 2px;
    width: 90%;
    margin: auto;
    background: linear-gradient(to right, var(--color-primary-blue-hover), var(--color-primary-blue));
}
</style>