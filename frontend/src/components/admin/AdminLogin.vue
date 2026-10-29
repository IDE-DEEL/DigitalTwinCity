<template>
    <div  class="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
      <h3 class="text-xl font-bold text-slate-900">{{ langStore.getLabel('adminLogin.loginTitle') }}</h3>
      <form @submit.prevent="emit('login')" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700">{{ langStore.getLabel('adminLogin.usernameLabel') }}</label>
          <input v-model="adminUser" type="text" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">{{ langStore.getLabel('adminLogin.passwordLabel') }}</label>
          <input v-model="adminPass" type="password" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
        </div>
        <BaseButton type="submit" variant="login">
          {{ langStore.getLabel('adminLogin.loginButton') }}
        </BaseButton>
      </form>
      <p v-if="authError" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ authError }}</p>
    </div>

</template>
<script setup>
import { computed } from 'vue';
import { useLanguageStore } from '../../stores/index.js';
import { BaseButton } from '../CustomComponents.js';
const props = defineProps({ username: String, password: String, authError: String });
const emit = defineEmits(['update:username', 'update:password', 'login']);
const adminUser = computed({ get: () => props.username, set: value => emit('update:username', value) });
const adminPass = computed({ get: () => props.password, set: value => emit('update:password', value) });
const langStore = useLanguageStore();
</script>
