<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { useLanguageStore } from '../stores/index.js';

const langStore = useLanguageStore();

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
    scoreData: {
        type: Object,
        default: () => ({
            environment: 0,
            economic: 0,
            social: 0,
            energy: 0,
            safety: 0,
            maintenance: 0,
            total: 0
        })
    }
});

const categories = [
    { key: 'environment', labelKey: 'tripStats.surroundings', icon: 'Omgeving', color: 'rgba(30, 255, 0, 0.5)' },
    { key: 'economic', labelKey: 'tripStats.economy', icon: 'Economie', color: 'rgba(255, 243, 0, 0.5)' },
    { key: 'social', labelKey: 'tripStats.social', icon: 'Sociaal', color: 'rgba(64, 0, 255, 0.5)' },
    { key: 'energy', labelKey: 'tripStats.energy', icon: 'Energie', color: 'rgba(0, 116, 255, 0.5)' },
    { key: 'safety', labelKey: 'tripStats.safety', icon: 'Veiligheid', color: 'rgba(255, 0, 0, 0.5)' },
    { key: 'maintenance', labelKey: 'tripStats.maintenance', icon: 'Onderhoudbaarheid', color: 'rgba(255, 115, 0, 0.5)' }
];

const labels = computed(() => 
    categories.map(category => langStore.getLabel(category.labelKey))
);

const icons = computed(() => 
    categories.map(category => `/assets/results/${category.icon}.svg`)
);

const chartData = computed(() => ({
    labels: labels.value,
    datasets: [
        {
            label: langStore.getLabel('barChart.score'),
            data: categories.map(category => (props.scoreData?.[category.key] ?? 0)),
            backgroundColor: categories.map(category => category.color),
            borderRadius: 4
        }
    ]
}));

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
    <p class="visual-label">{{ langStore.getLabel('barChart.title') }}: </p>
    <div class="chart-container">
        <div class="icon-column">
            <div v-for="(category, index) in categories" :key="category.key" class="icon-row">
                <img 
                :src="icons[index]" 
                :alt="langStore.getLabel(category.labelKey)" 
                class="concern-icon" 
                />
            </div>
        </div>
        <div class="chart-wrapper">
            <Bar :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>

<style scoped>
.visual-label {
  font-weight: bold; 
  font-size: 24px;
}

.chart-container {
  display: flex;
  align-items: stretch;
  width: 100%;
  max-width: 600px;
  height: 300px;
  overflow: hidden;
}

.icon-column {
  display: flex;
  flex-direction: column;
  margin-right: 5px;
  height: 90%;
}

.icon-row {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.concern-icon {
  width: 28px;
  height: 28px; 
  object-fit: contain;
}

.chart-wrapper {
  flex: 1;
  min-height: 0;
  min-width: 0;
}
</style>