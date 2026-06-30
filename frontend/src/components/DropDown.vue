<script setup>
import { computed } from 'vue';
import { useLanguageStore, usePageStore } from '../stores/index.js';

const langStore = useLanguageStore();
const pageStore = usePageStore();

const model = defineModel({
    type: String,
    default: "",
});

const props =defineProps({
    name: String,
    type: String,
    list: Array,
    disabled: { type: Boolean, default: false },
});

const options = computed(() => {
    if (pageStore.isSimulation) {
        return props.list.map(item => ({
            value: item.value,
            label: langStore.getLabel(`simScenarios.${item.label}`)
        }));
    }

    return props.list.map(value => ({
        value,
        label: value
    }));
});
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <select class="w-full p-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue outline-none bg-white text-dark"
        v-model="model"
        :disabled="disabled"
        :class="{'opacity-50 cursor-not-allowed': disabled }"
        >
        <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            >
            {{ option.label }}
        </option>
      </select>
  </div> 
</template>