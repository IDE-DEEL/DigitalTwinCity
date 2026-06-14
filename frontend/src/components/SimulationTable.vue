<script setup>
import { useCarColors } from '../composables/useCarColors.js';
import "../assets/Table.css";
import { useLanguageStore } from '../stores/index.js';

const langStore = useLanguageStore();

const emit = defineEmits(['toggle-route-visibility']);

const { getColorForCarAndRoute } = useCarColors();

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => []
    },
    maxPackages: {
        type: Number,
        default: 10
    },
    minPackages: {
        type: Number,
        default: 1
    },
    routeOptions: {
        type: Array,
        default: () => []
    },
    name: {
        type: String,
        default: "Auto's"
    },
    headers: {
        type: Array,
        default: () => []
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const handleMaxPackagesInput = (carId, event) => {
    let value = Number(event.target.value);
    
    if (isNaN(value)) {
        value = props.minPackages;
    }

    // Clamp value between min_packages and max_packages
    value = Math.max(props.minPackages, Math.min(props.maxPackages, value));
    event.target.value = value;
};
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">{{ props.name }}</label>
      <table class="table-container">
        <thead>
          <tr class="title-row">
            <th v-for="(header, index) in props.headers" :key="index">
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody v-for="(car, index) in props.modelValue" :key="index">
          <tr>
            <td>
                <div class="car-id-container">
                    <div 
                        class="car-id-color"
                        :style="{ backgroundColor: getColorForCarAndRoute(car.id) }"
                    ></div>
                    <div>{{ car.id }}</div>
                </div>
            </td>
            <td>
                <input 
                    class="package-input" 
                    type="number" 
                    :min="props.minPackages" 
                    :max="props.maxPackages" 
                    :disabled="props.disabled"
                    v-model="car.maxPackages"
                    @blur="handleMaxPackagesInput(car.id, $event)"
                    @keydown.enter="handleMaxPackagesInput(car.id, $event)"
                >
            </td>
            <td>
              <select 
                v-model="car.routeName" 
                :disabled="props.disabled"
                class="route-select"
              >
                <option v-for="routeOption in props.routeOptions" :key="routeOption.key" :value="routeOption.value">{{ routeOption.label }}</option>
              </select>
            </td>
            <td>
                <button 
                    class="route-visibility-button"
                    @click="emit('toggle-route-visibility', car.id)"
                >
                    {{ car.routeVisibility ? langStore.getLabel('carTable.showRoute') : langStore.getLabel('carTable.hideRoute') }}
                </button></td>
          </tr>
        </tbody>
      </table>
  </div>
</template>