<template>
  <div class="min-h-screen w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-8">
    <LangToggle id="admin-lang"></LangToggle>
    <div class="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{{ langStore.getLabel('adminHeader.title') }}</p>
        <h2 class="text-2xl font-bold text-slate-900">{{ langStore.getLabel('adminHeader.subTitle') }}</h2>
      </div>
      <BaseButton @click="$emit('close-admin')" variant="admin-general">
        {{langStore.getLabel('adminHeader.back2Login')}}
      </BaseButton>
    </div>

    <AdminLogin v-if="!isAuthenticated" v-model:username="adminUser" v-model:password="adminPass" :auth-error="authError" @login="verifyAdmin" />
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      
      <AdminCodeForm v-model:code-name="newCode.name" v-model:expires="newCode.expires_at" :generated-raw-code="generatedRawCode" @create="createCode" />
      <div class="col-span-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 class="text-xl font-semibold text-slate-900">{{ langStore.getLabel('adminManage.title') }}</h3>
            <p class="mt-1 text-sm text-slate-600">{{ langStore.getLabel('adminManage.description') }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <label class="inline-flex items-center gap-2 text-slate-700">
              <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
              {{ langStore.getLabel('adminManage.selectAll') }}
            </label>
            <BaseButton @click="bulkExtendCodes" :disabled="selectedCount === 0" variant="admin-general">
              {{ langStore.getLabel('adminManage.groupExtend') }} ({{ selectedCount }})
            </BaseButton>
            <BaseButton @click="bulkDeleteCodes" :disabled="selectedCount === 0" variant="admin-general">
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
                <input type="checkbox" v-model="selectedCodeIds" :value="code.id" />
              </td>
              <td class="px-4 py-3 font-medium text-slate-900">{{ code.name }}</td>
              <td class="px-4 py-3 text-slate-700">{{ new Date(code.expires_at).toLocaleString() }}</td>
              <td class="px-4 py-3">
                <span v-if="code.is_revoked" class="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">{{ langStore.getLabel('adminManage.codeRevoked') }}</span>
                <span v-else-if="new Date(code.expires_at) < new Date()" class="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{{ langStore.getLabel('adminManage.codeExpired') }}</span>
                <span v-else class="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">{{ langStore.getLabel('adminManage.codeActive') }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-3">
                  <BaseButton v-if="!code.is_revoked && new Date(code.expires_at) > new Date()" @click="revokeCode(code.id)" variant="admin-revoke">
                    {{ langStore.getLabel('adminManage.codeRevoke') }}
                  </BaseButton>
                  <BaseButton @click="extendCode(code.id, code.expires_at)" variant="admin-codes">
                    {{ langStore.getLabel('adminManage.codeExtend') }}
                  </BaseButton>
                  <BaseButton @click="deleteCode(code.id, code.name)" variant="admin-codes">
                    {{ langStore.getLabel('adminManage.codeDelete') }}
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { apiUrl } from '../config/api';
import { useLanguageStore } from '../stores/index.js';
import { LangToggle, BaseButton } from './CustomComponents.js';
import AdminLogin from './admin/AdminLogin.vue';
import AdminCodeForm from './admin/AdminCodeForm.vue';

const isAuthenticated = ref(false);
const adminUser = ref('');
const adminPass = ref('');
const authError = ref('');
const codes = ref([]);
const generatedRawCode = ref('');
const selectedCodeIds = ref([]);
const langStore = useLanguageStore();

const newCode = ref({ name: '', expires_at: '' });

const selectedCount = computed(() => selectedCodeIds.value.length);
const allSelected = computed(() => {
  return codes.value.length > 0 && selectedCodeIds.value.length === codes.value.length;
});

const apiCall = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  const response = await fetch(apiUrl(`/api/v1/admin/access-codes${endpoint}`), {
    ...options,
    headers,
    credentials: 'include'
  });
  
  if (response.status === 401 || response.status === 403) {
      isAuthenticated.value = false;
      throw new Error("Sessie verlopen, log opnieuw in.");
  }
  if (!response.ok) throw new Error('API Error');

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const toDateTimeLocalValue = (dateString) => {
  const date = new Date(dateString);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedCodeIds.value = [];
    return;
  }
  selectedCodeIds.value = codes.value.map(code => code.id);
};

watch(codes, (nextCodes) => {
  const existingIds = new Set(nextCodes.map(code => code.id));
  selectedCodeIds.value = selectedCodeIds.value.filter(id => existingIds.has(id));
});

const verifyAdmin = async () => {
  authError.value = '';
  try {
    const response = await fetch(apiUrl('/api/v1/auth/admin-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: adminUser.value, password: adminPass.value })
    });

    if (!response.ok) throw new Error('Ongeldige gebruikersnaam of wachtwoord');

    await response.json();
    isAuthenticated.value = true;
    
    codes.value = await apiCall('/');
    selectedCodeIds.value = [];
  } catch (error) {
    authError.value = error.message;
  }
};

onMounted(async () => {
  try {
    const response = await fetch(apiUrl('/api/v1/auth/session'), {
      credentials: 'include'
    });

    if (!response.ok) return;

    const session = await response.json();
    if (session.role !== 'admin') return;

    isAuthenticated.value = true;
    codes.value = await apiCall('/');
  } catch {
    isAuthenticated.value = false;
  }
});

const createCode = async () => {
  try {
    const expiry = new Date(newCode.value.expires_at).toISOString();
    const result = await apiCall('/', {
      method: 'POST',
      body: JSON.stringify({ name: newCode.value.name, expires_at: expiry })
    });
    
    generatedRawCode.value = result.raw_code;
    codes.value.unshift(result);
    newCode.value.name = '';
    newCode.value.expires_at = '';
  } catch (error) {
    alert("Fout bij het aanmaken.");
  }
};

const revokeCode = async (id) => {
  if (!confirm("Weet je zeker dat je deze code wilt intrekken?")) return;
  try {
    const updatedCode = await apiCall(`/${id}/revoke`, { method: 'PUT' });
    const index = codes.value.findIndex(c => c.id === id);
    if (index !== -1) codes.value[index] = updatedCode;
  } catch (error) {
    alert("Fout bij intrekken.");
  }
};

const extendCode = async (id, currentExpiresAt) => {
  const suggestedValue = toDateTimeLocalValue(currentExpiresAt);
  const input = prompt("Nieuwe vervaldatum (YYYY-MM-DDTHH:mm)", suggestedValue);
  if (!input) return;

  const parsedDate = new Date(input);
  if (Number.isNaN(parsedDate.getTime())) {
    alert("Ongeldige datum ingevoerd.");
    return;
  }

  try {
    const updatedCode = await apiCall(`/${id}/extend`, {
      method: 'PUT',
      body: JSON.stringify({ expires_at: parsedDate.toISOString() })
    });
    const index = codes.value.findIndex(c => c.id === id);
    if (index !== -1) codes.value[index] = updatedCode;
  } catch (error) {
    alert("Fout bij verlengen.");
  }
};

const deleteCode = async (id, name) => {
  if (!confirm(`Weet je zeker dat je code '${name}' permanent wilt verwijderen uit het overzicht en de geschiedenis?`)) return;

  try {
    await apiCall(`/${id}`, { method: 'DELETE' });
    codes.value = codes.value.filter(c => c.id !== id);
    selectedCodeIds.value = selectedCodeIds.value.filter(codeId => codeId !== id);
  } catch (error) {
    alert("Fout bij verwijderen.");
  }
};

const bulkExtendCodes = async () => {
  if (!selectedCodeIds.value.length) {
    alert("Selecteer eerst minimaal een code.");
    return;
  }

  const input = prompt("Nieuwe vervaldatum voor alle geselecteerde codes (YYYY-MM-DDTHH:mm)");
  if (!input) return;

  const parsedDate = new Date(input);
  if (Number.isNaN(parsedDate.getTime())) {
    alert("Ongeldige datum ingevoerd.");
    return;
  }

  const confirmation = confirm(`Weet je zeker dat je ${selectedCodeIds.value.length} codes wilt verlengen naar dezelfde datum/tijd?`);
  if (!confirmation) return;

  try {
    const updates = await Promise.all(
      selectedCodeIds.value.map(async (id) => {
        const updatedCode = await apiCall(`/${id}/extend`, {
          method: 'PUT',
          body: JSON.stringify({ expires_at: parsedDate.toISOString() })
        });
        return { id, updatedCode };
      })
    );

    updates.forEach(({ id, updatedCode }) => {
      const index = codes.value.findIndex(c => c.id === id);
      if (index !== -1) codes.value[index] = updatedCode;
    });
  } catch (error) {
    alert("Fout bij bulk verlengen.");
  }
};

const bulkDeleteCodes = async () => {
  if (!selectedCodeIds.value.length) {
    alert("Selecteer eerst minimaal een code.");
    return;
  }

  const confirmation = confirm(`Weet je zeker dat je ${selectedCodeIds.value.length} codes permanent wilt verwijderen uit het overzicht en de geschiedenis?`);
  if (!confirmation) return;

  const idsToDelete = [...selectedCodeIds.value];

  try {
    await Promise.all(idsToDelete.map(id => apiCall(`/${id}`, { method: 'DELETE' })));
    const idsSet = new Set(idsToDelete);
    codes.value = codes.value.filter(code => !idsSet.has(code.id));
    selectedCodeIds.value = [];
  } catch (error) {
    alert("Fout bij bulk verwijderen.");
  }
};
</script>

<style scoped>
#admin-lang {
  position: absolute;
  top: 1rem;
  right: 1rem;
}
</style>