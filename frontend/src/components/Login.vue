<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
      <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
        DEEL Digital Twin
      </h2>
      
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="code" class="block text-sm font-medium text-gray-700">
            Toegangscode
          </label>
          <input 
            v-model="accessCode" 
            type="text" 
            id="code" 
            placeholder="Voer je code in (bijv. A1b2C3d4)" 
            class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div v-if="errorMessage" class="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {{ errorMessage }}
        </div>

        <button 
          type="submit" 
          :disabled="isLoading"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {{ isLoading ? 'Laden...' : 'Inloggen' }}
        </button>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiUrl } from '../config/api';

const emit = defineEmits(['authenticated']);
const router = useRouter();
const accessCode = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  errorMessage.value = '';
  isLoading.value = true;

  try {
    const response = await fetch(apiUrl('/api/v1/auth/verify-code'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: accessCode.value.trim() })
    });

    if (!response.ok) {
      let errorMsg = "De ingevoerde toegangscode is ongeldig of verlopen.";
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch (parseError) {
        console.error("Backend response kon niet gelezen worden als JSON.");
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();

    localStorage.setItem('deel_access_token', data.access_token);
    localStorage.setItem('deel_session_name', data.session_name);

    emit('authenticated');
    await router.push('/digital_twin');
    
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>
