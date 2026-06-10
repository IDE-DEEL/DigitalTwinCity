<script setup>
import "../assets/Table.css"
import { watch } from 'vue'
import { store, send_data } from '../store.js'

watch(() => {
  send_data("car_table", store.table_data)
})

function update_car(car, newValue) {
  const id_exists = store.table_data.some(item => item.auto_id === newValue && item !== car)
  
  if (id_exists) {
    alert('Dit auto_id is al bezet!')
    return
  }

  car.auto_id = newValue
}

function visualizing(car) {
  car.visueel = !car.visueel
}
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">Auto's:</label>
      <table class="table-container">
        <thead>
          <tr class="title-row">
            <th>Status</th>
            <th>Auto ID</th>
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
            <td><input class="package-input" type="text" size=6 v-model="car.auto_id" @change="update_car(car, $event.target.value)"></input></td>
            <td>{{ car.energie}} %</td>
            <td><input class="package-input" type="number" min=0 :max=store.max_packages v-model="car.pakketje"></input></td>
            <td>
              <select v-model="car.route">
                <option v-for="r in store.routes" :key="r.route" :value="r.route">{{ r.route }}</option>
              </select>
            </td>
            <td><button class="visualize" @click="visualizing(car)">{{ car.visueel ? 'Verberg' : 'Toon' }}</button></td>
          </tr>
        </tbody>
      </table>
  </div>
</template>