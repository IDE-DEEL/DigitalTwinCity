<script setup>
import "../assets/Table.css"
import { watch } from 'vue'
import { useDigitalTwinStore } from '../stores/digital-twin.js'

const store = useDigitalTwinStore()

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
  <div>
    <label class="block text-sm font-semibold mb-1">Auto's:</label>
      <table class="table-container">
        <thead>
          <tr class="title-row">
            <th>Status</th>
            <th>ID</th>
            <th>Energie</th>
            <th>Pakketjes</th>
            <th>Route</th>
            <th>Visueel</th>
          </tr>
        </thead>
        <tbody v-for="(car, index) in store.table_data" :key="index">
          <tr>
            <td>
              <div class="circle" :class="{ 'is-active': car.status }"></div>
            </td>
            <td>{{ car.auto_id }}</td>
            <td>{{ car.energie }} %</td>
            <td>
              <input class="package-input" 
                     type="number" 
                     min=0 
                     :max=store.max_packages 
                     v-model="car.pakketje" 
                     @change="send_packages(car)">
              </input>
            </td>
            <td>
              <select class="route-select" 
                      v-model="car.route" 
                      @change="send_route(car)">
                <option v-for="r in store.routes" :key="r.route" :value="r.route" @change="send_route(car)">{{ r.route }}</option>
              </select>
            </td>
            <td><button class="visualize" @click="visualizing(car)">{{ car.visueel ? 'Verberg' : 'Toon' }}</button></td>
          </tr>
        </tbody>
      </table>
  </div>
</template>