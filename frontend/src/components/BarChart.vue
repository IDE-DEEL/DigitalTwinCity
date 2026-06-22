<script setup>
import { reactive, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import '../assets/BarChart.css'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  scoreData: Array,
})

const chartData = computed(() => {
  return {
    labels: ['Omgeving', 'Economie', 'Sociaal', 'Energie', 'Veiligheid', 'Onderhoudbaarheid'],
    datasets: [
      {
        label: 'Score',
        data: props.scoreData || [0, 0, 0, 0, 0, 0],
        backgroundColor: '#0084ff',
        borderRadius: 4
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      display: false
    },
    x: {
      min: 0,
      max: 100,
      ticks: {
        callback: function(value) {
          if (value === 0 || value === 50 || value === 100) {
            return value
          }
          return null
        }
      },
      grid: {
        color: function(context) {
          if (context.tick.value === 50) {
            return '#999999'
          }
          return '#e0e0e0'
        },
        borderDash: function(context) {
          if (context.tick.value === 50) {
            return [5, 5]
          }
          return []
        },
        lineWidth: function(context) {
          return context.tick.value === 50 ? 2 : 1
        }
      }
    }
  }
}
</script>

<template>
  <div class="chart-container">
    <div class="icon-column">
      <div v-for="(label, index) in chartData.labels" :key="index" class="icon-row">
        <img 
          :src="`/assets/results/${label}.svg`" 
          :alt="label" 
          class="concern-icon" 
        />
      </div>
    </div>
    <div class="chart-wrapper">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>