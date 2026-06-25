<script setup>
import "../assets/Table.css"
import { watch } from 'vue'
import { useDigitalTwinStore } from '../stores/digital-twin.js'
import { useLanguageStore } from '../stores/index.js';
import { BaseButton } from './CustomComponents.js';

const store = useDigitalTwinStore()
const langStore = useLanguageStore();

function visualizing(car) {
  car.visueel = !car.visueel
}

function send_packages(car) {
  store.sendData('packages', {
    car_id: car.auto_id,
    packages: car.pakketje
  })
}

function send_route(car) {
  store.sendData('route', {
    car_id: car.auto_id,
    route: car.route
  })
}
</script>

<template>
  <div class="table-container">
    <label class="block text-sm font-semibold mb-1">Auto's:</label>
      <table class="table-content">
        <thead>
          <tr class="title-row">
            <th>{{ langStore.getLabel('carTable.status') }}</th>
            <th>{{ langStore.getLabel('carTable.carId') }}</th>
            <th>{{ langStore.getLabel('carTable.energy') }}</th>
            <th>{{ langStore.getLabel('carTable.packages') }}</th>
            <th>{{ langStore.getLabel('carTable.route') }}</th>
            <th>{{ langStore.getLabel('carTable.routeVisibility') }}</th>
          </tr>
        </thead>
        <tbody v-for="(car, index) in store.table_data" :key="index">
          <tr>
            <td>
              <div class="circle" :class="{ 'is-active': car.status }"></div>
            </td>
            <td>
              <div class="car-id-container">
                <div :style="{backgroundColor: car.color}" class="car-id-color"></div>
                <div>{{ index += 1 }}</div>
              </div>
            </td>
            <td>{{ car.energie }} %</td>
            <td>
              <input class="package-input" 
                     type="number" 
                     min=0 
                     :max=store.max_packages 
                     v-model="car.pakketje" 
                     :disabled="car.route === 'inactive'"
                     @change="send_packages(car)">
              </input>
            </td>
            <td>
              <select class="route-select" 
                      v-model="car.route" 
                      @change="send_route(car)"
                      :class="{ 'inactive-route': car.route === 'inactive' }"
              >
                <option 
                    :class="{ 'inactive-route-option': car.route === 'inactive' }" 
                    v-for="r in store.routes" 
                    :key="r.route" 
                    :value="r.route" 
                    @change="send_route(car)"
                >
                    {{ langStore.getLabel(`simRoutes.${r.route}`) || r.route }}
                </option>
              </select>
            </td>
            <td class="button-cell"><BaseButton @click="visualizing(car)" :is-active="car.visueel" :disabled="car.route === 'inactive' && !car.visueel">{{ car.visueel ? langStore.getLabel('carTable.hideRoute') : langStore.getLabel('carTable.showRoute') }}</BaseButton></td>
          </tr>
        </tbody>
      </table>
  </div>
</template>