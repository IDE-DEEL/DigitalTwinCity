<script setup>
import { useCarColors } from '../composables/useCarColors.js'
import "../assets/Table.css"

const emit = defineEmits(['toggle-route-visibility'])

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
    }
})
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
                    <input class="package-input" type="text" size=6 v-model="car.id""></input>
                </div>
            </td>
            <td><input class="package-input" type="number" :min="props.minPackages" :max="props.maxPackages" v-model="car.maxPackages"></input></td>
            <td>
              <select v-model="car.routeName">
                <option v-for="routeOption in props.routeOptions" :key="routeOption.key" :value="routeOption.value">{{ routeOption.label }}</option>
              </select>
            </td>
            <td>
                <button 
                    class="route-visibility-button"
                    @click="emit('toggle-route-visibility', car.id)"
                >
                    {{ car.routeVisibility ? 'Verberg' : 'Toon' }}
                </button></td>
          </tr>
        </tbody>
      </table>
  </div>
</template>