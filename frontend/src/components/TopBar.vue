<script setup>
import Switch from './Switch.vue'
import '../assets/TopBar.css'
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiUrl } from '../config/api';
import { useLanguageStore } from '../stores/index.js';
import { LangToggle, BaseButton } from './CustomComponents.js';

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
        <BaseButton 
        @click="handleLogout" 
        :disabled="isLoggingOut"
        >
          {{ isLoggingOut ? langStore.getLabel('header.loggingOut') : langStore.getLabel('header.logout') }}
        </BaseButton>
        <Switch/>
      </div>
      <div class="lang-container"><LangToggle/></div>
    </div>
  </header>
</template>