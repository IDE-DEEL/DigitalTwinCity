<script setup>
import { useCarColors } from '../composables/useCarColors.js';
import "../assets/Table.css";
import { useLanguageStore } from '../stores/index.js';
import { BaseButton } from './CustomComponents.js';

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
    liveAgents: {
        type: Array,
        default: () => []
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const handleMaxPackagesInput = (carId) => {
    const car = props.modelValue.find(c => c.id === carId);
    if (!car) return;
    
    let value = Number(car.maxPackages);
    
    if (isNaN(value)) {
        value = props.minPackages;
    }

    // Clamp value between min_packages and max_packages
    value = Math.max(props.minPackages, Math.min(props.maxPackages, value));
    car.maxPackages = value;
};

const getStateOfCharge = (carId) => {
    const liveAgent = props.liveAgents.find(
        agent => String(agent.id) === String(carId)
    );

    return liveAgent?.state_of_charge ?? "-";
};
</script>

<template>
  <div class="table-container">
    <label class="block text-sm font-semibold mb-1">{{ props.name }}</label>
      <table class="table-content">
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
                <div class="car-energy">
                    <div>{{ getStateOfCharge(car.id) }} %</div>
                </div>
            </td>
            <td>
                <input 
                    class="package-input" 
                    type="number" 
                    :min="props.minPackages" 
                    :max="props.maxPackages" 
                    :disabled="props.disabled || car.routeName === 'inactive'"
                    v-model="car.maxPackages"
                    @blur="handleMaxPackagesInput(car.id)"
                    @keydown.enter="handleMaxPackagesInput(car.id)"
                >
            </td>
            <td>
              <select 
                v-model="car.routeName" 
                :disabled="props.disabled"
                class="route-select"
                :class="{ 'inactive-route': car.routeName === 'inactive' }"
              >
                <option 
                    :class="{ 'inactive-route-option': car.routeName === 'inactive' }" 
                    v-for="routeOption in props.routeOptions" 
                    :key="routeOption.key" 
                    :value="routeOption.value"
                >
                    {{ langStore.getLabel(`simRoutes.${routeOption.label}`) }}
                </option>
              </select>
            </td>
            <td class="button-cell">
                <BaseButton 
                    :disabled="car.routeName === 'inactive' && !car.routeVisibility"
                    :isActive="car.routeVisibility"
                    @click="emit('toggle-route-visibility', car.id)"
                >
                    {{ car.routeVisibility ? langStore.getLabel('carTable.hideRoute') : langStore.getLabel('carTable.showRoute') }}
                </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
  </div>
</template>