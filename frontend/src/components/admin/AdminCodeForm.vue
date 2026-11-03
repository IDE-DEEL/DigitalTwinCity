<template>
      <div class="col-span-1 h-fit rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <h3 class="mt-1 text-xl font-semibold text-slate-900">{{ langStore.getLabel('adminCode.new') }}</h3>
        <p class="mt-2 text-sm text-slate-600">
          {{ langStore.getLabel('adminCode.description') }}
        </p>
        <form @submit.prevent="emit('create')" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700">{{ langStore.getLabel('adminCode.codeLabel') }}</label>
            <input v-model="name" type="text" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">{{ langStore.getLabel('adminCode.expiresLabel') }}</label>
            <input v-model="expiresAt" type="datetime-local" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
          </div>
          <BaseButton type="submit" variant="login">
            {{ langStore.getLabel('adminCode.codeButton') }}
          </BaseButton>
        </form>

        <div v-if="generatedRawCode" class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p class="text-sm font-bold text-amber-900">{{ langStore.getLabel('adminCode.copyNewCode') }}</p>
          <p class="mt-2 text-sm text-slate-700">{{ langStore.getLabel('adminCode.newCodeDescription') }}</p>
          <p class="mt-3 break-all rounded-xl bg-white px-4 py-3 text-center font-mono text-lg text-slate-900 shadow-sm">{{ generatedRawCode }}</p>
        </div>
      </div>

</template>
<script setup>
import { computed } from 'vue';
import { useLanguageStore } from '../../stores/index.js';
import { BaseButton } from '../CustomComponents.js';
const props = defineProps({ codeName: String, expires: String, generatedRawCode: String });
const emit = defineEmits(['update:codeName', 'update:expires', 'create']);
const name = computed({ get: () => props.codeName, set: value => emit('update:codeName', value) });
const expiresAt = computed({ get: () => props.expires, set: value => emit('update:expires', value) });
const langStore = useLanguageStore();
</script>
