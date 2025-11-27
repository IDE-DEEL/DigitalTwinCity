<template>
  <footer class="bg-gray-100 p-4 flex justify-between items-center border-t">
    <div>
      <span class="mr-4">Score: {{ score }}</span>
      <span>Tijd: {{ time }}</span>
    </div>
    <div>
      <button class="bg-blue-400 text-white px-6 py-2 mr-2 hover:bg-blue-500">Start</button>
      <button class="bg-gray-300 px-6 py-2 hover:bg-gray-400">Stop</button>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'BottomBar',
  data() {
    return {
      score: 0,
      time: '00:00'
    }
  }
}
</script>
