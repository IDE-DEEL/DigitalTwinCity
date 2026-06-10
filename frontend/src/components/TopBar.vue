<script setup>
import Switch from './Switch.vue'
import '../assets/TopBar.css'
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiUrl } from '../config/api';

const router = useRouter();
const isLoggingOut = ref(false);

const handleLogout = async () => {
  isLoggingOut.value = true;
  
  try {
    await fetch(apiUrl('/api/v1/auth/logout'), {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Fout bij uitloggen op server:', error);
  } finally {
    isLoggingOut.value = false;
    await router.push('/login');
  }
};

</script>

<template>
  <header>
    <h1>Explore The Digital Twin</h1>
    <div class="button-container">
      <button 
        @click="handleLogout" 
        :disabled="isLoggingOut"
        class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm disabled:opacity-50"
      >
          {{ isLoggingOut ? 'Uitloggen...' : 'Uitloggen' }}
        </button>
      <Switch/>
    </div>
  </header>
</template>