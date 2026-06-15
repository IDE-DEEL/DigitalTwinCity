<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <LangToggle id="login-lang"></LangToggle>
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
      <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
        {{ langStore.getLabel('login.title') }}
      </h2>
      
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="code" class="block text-sm font-medium text-gray-700">
            {{ langStore.getLabel('login.codeLabel') }}
          </label>
          <input 
            v-model="accessCode" 
            @input="formatAccessCode"
            type="text" 
            id="code" 
            :placeholder="langStore.getLabel('login.codePlaceholder')"
            maxlength="11"
            pattern="[A-Z0-9]{5}-?[A-Z0-9]{5}"
            autocomplete="one-time-code"
            autocapitalize="characters"
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
          {{ isLoading ? langStore.getLabel('login.loggingIn') : langStore.getLabel('login.loginButton') }}
        </button>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiUrl } from '../config/api';
import { useLanguageStore } from '../stores/index.js';
import { LangToggle } from './CustomComponents.js';

const emit = defineEmits(['authenticated']);
const router = useRouter();
const accessCode = ref('');
const errorMessage = ref('');
const isLoading = ref(false);
const langStore = useLanguageStore();

const normalizeAccessCodeForDisplay = (value) => {
  const typedTrailingDash = value.endsWith('-');
  const compact = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);

  if (compact.length > 5 || (compact.length === 5 && typedTrailingDash)) {
    return `${compact.slice(0, 5)}-${compact.slice(5)}`;
  }

  return compact;
};

const formatAccessCode = () => {
  accessCode.value = normalizeAccessCodeForDisplay(accessCode.value);
};

const handleLogin = async () => {
  errorMessage.value = '';
  isLoading.value = true;

  try {
    const response = await fetch(apiUrl('/api/v1/auth/verify-code'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code: normalizeAccessCodeForDisplay(accessCode.value).trim() })
    });

    if (!response.ok) {
      let errorMsg = langStore.getLabel('login.error');
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch (parseError) {
        console.error("Backend response kon niet gelezen worden als JSON.");
      }
      throw new Error(errorMsg);
    }

    await response.json();

    emit('authenticated');
    await router.push('/digital_twin');
    
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
#login-lang {
  position: absolute;
  top: 1rem;
  right: 1rem;
}
</style>