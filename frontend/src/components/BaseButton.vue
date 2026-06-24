<template>
    <button
        :disabled="disabled"
        :type="type"
        @click="$emit('click', $event)"
        :class="['base-button', `base-button--${variant}`, { 'base-button--active': isActive }]"
    >
        <slot></slot>
    </button>
</template>

<script setup>
defineProps({
    disabled: {
        type: Boolean,
        default: false,
    },
    type: {
        type: String,
        default: 'button',
    },
    variant: {
        type: String,
        default: 'primary',
        validator: (value) => [
            'primary',
            'timer',
            'statistics',
            'stats-modal',
            'x',
            'tags',
            'dev-small',
            'websocket',
            'login',
        ].includes(value),
    },
    isActive: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['click']);
</script>

<style scoped>
/* Base styling */
.base-button {
    padding: 10px;
    background-color: var(--color-primary-blue);
    place-items: center;
    color: var(--color-text-white);
    border: 1px groove gray;
    border-radius: var(--rounded-sm);
    font-size: var(--text-xl);
    cursor: pointer;
    transition: background-color 0.2s;
}

.base-button:hover {
    background-color: var(--color-primary-blue-hover);
}

.base-button:disabled {
    background-color: var(--color-button-disabled);
    cursor: not-allowed;
}

.base-button--active {
    background-color: var(--color-button-active);
}

/* Variant styles */
.base-button--timer {
    width: 88px;
    height: 36px;
    padding: 0px;
}

.base-button--statistics {
    width: 184px;
    height: 40px;
    padding: 0px;
}

.base-button--stats-modal {
    width: 100%;
}

.base-button--x {
    background-color: #ef9c9c;
    font-weight: bold;
    border: 2px solid #dc2626;
    width: 40px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.base-button--x:hover {
    background-color: #dc2626;
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.base-button--x:active {
    transform: scale(0.95);
}

.base-button--tags {
    width: 120px;
    height: 38px;
    padding: 0px;
}

.base-button--dev-small {
    padding: 4px;
    font-size: var(--text-sm);
}

.base-button--websocket {
    margin-left: auto;
    width: 3rem;
    height: 2rem;
    display: flex;
    justify-content: center;
}

.base-button--login {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: var(--rounded-md);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.base-button--login:focus {
    outline: none;
    box-shadow:
        0 0 0 2px #fff,
        0 0 0 4px #3b82f6;
}
</style>