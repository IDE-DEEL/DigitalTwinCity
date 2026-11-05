<template>
      <div class="col-span-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 class="text-xl font-semibold text-slate-900">{{ langStore.getLabel('adminManage.title') }}</h3>
            <p class="mt-1 text-sm text-slate-600">{{ langStore.getLabel('adminManage.description') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <label class="inline-flex items-center gap-2 text-slate-700">
              <input type="checkbox" :checked="allSelected" @change="emit('toggle-select-all')" />
              {{ langStore.getLabel('adminManage.selectAll') }}
            </label>
            <BaseButton @click="emit('bulk-extend')" :disabled="selectedCount === 0" variant="admin-general">
              {{ langStore.getLabel('adminManage.groupExtend') }} ({{ selectedCount }})
            </BaseButton>
            <BaseButton @click="emit('bulk-delete')" :disabled="selectedCount === 0" variant="admin-general">
              {{ langStore.getLabel('adminManage.groupDelete') }} ({{ selectedCount }})
            </BaseButton>
          </div>
        </div>
        <table class="min-w-full whitespace-nowrap text-left text-sm">
          <thead class="border-b-2 border-slate-200 uppercase tracking-wider text-slate-600">
            <tr>
              <th class="w-10 px-4 py-3">{{ langStore.getLabel('adminManage.tableId') }}</th>
              <th class="px-4 py-3">{{ langStore.getLabel('adminManage.tableName') }}</th>
              <th class="px-4 py-3">{{ langStore.getLabel('adminManage.tableExpires') }}</th>
              <th class="px-4 py-3">{{ langStore.getLabel('adminManage.tableStatus') }}</th>
              <th class="px-4 py-3">{{ langStore.getLabel('adminManage.tableActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="code in codes" :key="code.id" class="border-b border-slate-100">
              <td class="px-4 py-3">
                <input type="checkbox" :checked="selectedCodeIds.includes(code.id)" :value="code.id" @change="emit('toggle-code', code.id)" />
              </td>
              <td class="px-4 py-3 font-medium text-slate-900">{{ code.name }}</td>
              <td class="px-4 py-3 text-slate-700">{{ new Date(code.expires_at).toLocaleString() }}</td>
              <td class="px-4 py-3">
                <span v-if="code.is_revoked" class="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">{{ langStore.getLabel('adminManage.codeRevoked') }}</span>
                <span v-else-if="isExpired(code)" class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{{ langStore.getLabel('adminManage.codeExpired') }}</span>
                <span v-else class="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">{{ langStore.getLabel('adminManage.codeActive') }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-3">
                  <BaseButton v-if="!code.is_revoked && isActive(code)" @click="emit('revoke', code.id)" variant="admin-revoke">
                    {{ langStore.getLabel('adminManage.codeRevoke') }}
                  </BaseButton>
                  <BaseButton @click="emit('extend', code.id, code.expires_at)" variant="admin-codes">
                    {{ langStore.getLabel('adminManage.codeExtend') }}
                  </BaseButton>
                  <BaseButton @click="emit('delete', code.id, code.name)" variant="admin-codes">
                    {{ langStore.getLabel('adminManage.codeDelete') }}
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
</template>

<script setup>
import { useLanguageStore } from '../../stores/index.js';
import { BaseButton } from '../CustomComponents.js';

defineProps({
  codes: { type: Array, required: true },
  selectedCodeIds: { type: Array, required: true },
  allSelected: { type: Boolean, required: true },
  selectedCount: { type: Number, required: true }
});
const emit = defineEmits(['toggle-select-all', 'toggle-code', 'bulk-extend', 'bulk-delete', 'revoke', 'extend', 'delete']);
const langStore = useLanguageStore();

const getExpiryTime = (code) => new Date(code.expires_at).getTime();
const isExpired = (code) => getExpiryTime(code) < Date.now();
const isActive = (code) => getExpiryTime(code) > Date.now();
</script>
