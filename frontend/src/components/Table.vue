<script setup>
import "../assets/Table.css"
import { watch } from 'vue'
import { store, send_data } from '../store.js'

watch(() => {
  send_data("car_table", store.table_data)
})

function add_car(event) {
  const new_car = {
    "auto_id": "Auto 1", 
    "pakketje": 0, 
    "route": "Route 1", 
    "visueel": false,
  }
  
  for (let i=0; i < store.table_data.length; i++) {
    if (store.table_data[i].auto_id === new_car.auto_id) {
      new_car.auto_id = "Auto " + ((i + 1) + 1)
    }
  }
  
  store.table_data.push(new_car)
}

function remove_car(index) {
  store.table_data.splice(index, 1)
}

function update_car(car, newValue) {
  const id_exists = store.table_data.some(item => item.auto_id === newValue && item !== car)
  
  if (id_exists) {
    alert('Dit auto_id is al bezet!')
    return
  }

  car.auto_id = newValue
}
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">Auto's:</label>
      <table class="table-container">
        <thead>
          <tr class="title-row">
            <th>
              <button class="add-car" @click="add_car">
                <img style="transform: scale(0.6, 0.6);" src="/assets/plus-sign.png" alt="Auto" />
              </button>
            </th>
            <th>Auto ID</th>
            <th>Pakketjes</th>
            <th>Route</th>
            <th>Visueel</th>
          </tr>
        </thead>
        <tbody v-for="(car, index) in store.table_data" :key="index">
          <tr>
            <td><button class="remove-car" @click="remove_car(index)">x</button></td>
            <td><input class="package-input" type="text" size=6 v-model="car.auto_id" @change="update_car(car, $event.target.value)"></input></td>
            <td><input class="package-input" type="number" min=0 :max=store.max_packages v-model="car.pakketje"></input></td>
            <td>
              <select v-model="car.route">
                <option v-for="r in store.routes" :key="r.route" :value="r.route">{{ r.route }}</option>
              </select>
            </td>
            <td><input type="checkbox" class="circle" v-model="car.visueel"></input></td>
          </tr>
        </tbody>
      </table>
  </div>
</template>