<script setup>
import Switch from './Switch.vue'
import '../assets/TopBar.css'
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiUrl } from '../config/api';
import { useLanguageStore } from '../stores/index.js';
import { LangToggle } from './CustomComponents.js';

const router = useRouter();
const isLoggingOut = ref(false);
const langStore = useLanguageStore();

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
    <div class="title-container">
      <img src="../../public/assets/hu-logo.png" alt="HU Logo" width="60" height="60">
      <h1>{{ langStore.getLabel('header.title') }}</h1>
    </div>
    <div class="button-container">
      <div class="general-container">
        <button 
        @click="handleLogout" 
        :disabled="isLoggingOut"
        class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm disabled:opacity-50"
        >
          {{ isLoggingOut ? langStore.getLabel('header.loggingOut') : langStore.getLabel('header.logout') }}
        </button>
        <LangToggle></LangToggle>
      </div>
      <Switch/>

    </div>
  </header>
</template>