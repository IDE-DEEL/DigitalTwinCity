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
            'timer-simulation',
            'timer-digital-twin',
            'statistics',
            'stats-modal',
            'x',
            'tags',
            'dev-small',
            'websocket',
            'login',
            'admin-general',
            'admin-revoke',
            'admin-codes',
            'logout',
            'table',
        ].includes(value),
    },
    isActive: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['click']);
</script>

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

<style scoped>
/* Base styling */
.base-button {
    background-color: var(--color-primary-blue);
    place-items: center;
    color: var(--color-text-white);
    border: 1px groove gray;
    border-radius: var(--rounded-sm);
    font-size: var(--text-xl);
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px outset var(--color-primary-blue);
    box-sizing: border-box;
    padding: 10px;
}

.base-button:hover {
    background-color: var(--color-primary-blue-hover);
    border: 2px outset var(--color-primary-blue-hover);
}

.base-button:disabled {
    background-color: var(--color-button-disabled);
    border: 2px outset var(--color-button-disabled);
    cursor: not-allowed;
}

.base-button--active {
    background-color: var(--color-button-active);
    border: 2px outset var(--color-button-active);
}

.base-button:focus {
    outline: none;
    box-shadow:
        0 0 0 2px #fff,
        0 0 0 4px black;
}

/* Variant styles */
.base-button--timer-simulation {
    width: 155px;
    height: 36px;
}

.base-button--timer-digital-twin {
    width: 100px;
    height: 36px;
}

.base-button--statistics {
    width: 316px;
    height: 40px;
}

.base-button--stats-modal {
    width: 100%;
    height: 51px;
}

.base-button--x {
    background-color: #ef9c9c;
    border: 2px outset #ef9c9c;;
    font-weight: bold;
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    height: 2rem;
}

.base-button--x:hover {
    background-color: #dc2626;
    border: 2px outset #dc2626;
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.base-button--x:active {
    transform: scale(0.95);
}

.base-button--tags {
    width: 120px;
    height: 38px;
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
    height: 42px;
}

.base-button--login:focus {
    outline: none;
    box-shadow:
        0 0 0 2px #fff,
        0 0 0 4px #3b82f6;
}

.base-button--admin-general {
    height: 50px;
}

.base-button--admin-revoke {
    background: none;
    border: none;
    color: #dc2626;
    font-weight: 500;
}

.base-button--admin-revoke:hover:not(:disabled) {
    color: #991b1b;
}

.base-button--admin-codes {
    background: none;
    border: none;
    color: #0369a1;
    font-weight: 500;
}

.base-button--admin-codes:hover:not(:disabled) {
    color: #0c4a6e;
}

.base-button--logout {
    height: 35px;
}

.base-button--table {
    height: 32px;
}
</style>