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
    <div v-if="isOpen" @click.self="closeModal" class="modal-overlay">
        <div class="modal-content">
            <!-- Header -->
            <div class="modal-header">
                <h2 class="modal-title">{{ langStore.getLabel('statsModal.simTitle') }}</h2>
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

.modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    backdrop-filter: blur(4px);
    background-color: rgba(0, 0, 0, 0.4);
}

.modal-content {
    background-color: white;
    border-radius: var(--rounded-lg);
    box-shadow:
        0 10px 15px -3px rgba(0, 0, 0, 0.1),
        0 4px 6px -4px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 42rem;
    max-height: 95vh;
    overflow: auto;
}

.modal-header {
    position: sticky;
    top: 0;
    background-color: white;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: #d1d5db;
    padding: 1.5rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.modal-title {
    font-size: var(--text-xl);
    line-height: 1.75rem;
    font-weight: var(--font-bold);
}

.section-divider {
    height: 2px;
    width: 90%;
    margin: auto;
    background: linear-gradient(to right, var(--color-primary-blue-hover), var(--color-primary-blue));
}
</style>