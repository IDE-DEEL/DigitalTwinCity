<template>
  <aside class="w-72 p-4 border-l bg-gray-50">
    <div class="mb-4">
      <label class="block font-bold">Snelheid:</label>
      <input type="range" min="0" max="100" v-model="speed" class="w-full" />
      <span class="float-right">{{ speed }}</span>
    </div>
    
    <div class="mb-4">
      <label class="block font-bold">Turn degree:</label>
      <input type="range" min="0" max="180" v-model="turnDegree" class="w-full" />
      <span class="float-right">{{ turnDegree }}</span>
    </div>
    
    <div class="mb-4">
      <label class="block font-bold">Scenario:</label>
      <select class="w-full border p-2">
        <option value="">--Select--</option>
      </select>
    </div>
    
    <div class="mb-4">
      <label class="block font-bold">Auto toevoegen:</label>
      <div class="mb-2">
        <label class="text-sm">Auto ID:</label>
        <select class="w-full border p-2">
          <option>Auto 1</option>
          <option>Auto 2</option>
        </select>
      </div>
      <div class="mb-2">
        <label class="text-sm">Pakketjes:</label>
        <select class="w-full border p-2">
          <option>Pakket A</option>
          <option>Pakket B</option>
        </select>
      </div>
      <button class="w-full bg-blue-200 p-2 hover:bg-blue-300">Toevoegen</button>
    </div>
    
    <div>
      <label class="block font-bold">Auto's:</label>
      <table class="w-full">
        <thead>
          <tr>
            <th class="text-left">ID</th>
            <th class="text-right">Pakketjes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="car in cars" :key="car.id">
            <td>{{ car.id }}</td>
            <td class="text-right">{{ car.packages }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'ControlPanel',
  data() {
    return {
      speed: 60,
      turnDegree: 10,
      cars: [
        { id: 'Auto 1', packages: 2 },
        { id: 'Auto 2', packages: 0 }
      ]
    }
  }
}
</script>
