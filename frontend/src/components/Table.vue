<script setup>
import "../assets/Table.css"
const props = defineProps({ name: String, key: String, data: Array})
</script>

<template>
  <div>
    <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <table class="table-container">
        <thead>
          <tr class="title-row">
            <th>Auto ID</th>
            <th>Pakketjes</th>
            <th>Route</th>
            <th>Visueel</th>
          </tr>
        </thead>
        <tbody v-for="car in data">
          <tr>
            <td>{{ car.auto_id }}</td>
            <td>{{ car.pakketje }}</td>
            <td>{{ car.route }}</td>
            <td>
              <input type="checkbox" class="circle" :checked="car.visueel"></input>
            </td>
          </tr>
        </tbody>
      </table>
  </div>
</template>