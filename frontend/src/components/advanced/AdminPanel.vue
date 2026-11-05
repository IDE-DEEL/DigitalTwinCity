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
      <div class="col-span-2" aria-live="polite">
        <p v-if="isLoadingCodes" role="status" class="mb-3 text-sm text-slate-600">Toegangscodes worden geladen...</p>
        <div v-if="codesLoadError" role="alert" class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ codesLoadError }}
          <BaseButton @click="loadCodes" variant="admin-general">Opnieuw proberen</BaseButton>
        </div>
        <div v-if="actionError" role="alert" class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ actionError }}</div>
        <AdminCodeTable :codes="codes" :selected-code-ids="selectedCodeIds" :all-selected="allSelected" :selected-count="selectedCount" @toggle-select-all="toggleSelectAll" @toggle-code="toggleCode" @bulk-extend="bulkExtendCodes" @bulk-delete="bulkDeleteCodes" @revoke="revokeCode" @extend="extendCode" @delete="deleteCode" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { apiUrl } from '../../config/api';
import { useLanguageStore } from '../../stores/index.js';
import { LangToggle, BaseButton } from '../CustomComponents.js';
import AdminLogin from '../admin/AdminLogin.vue';
import AdminCodeForm from '../admin/AdminCodeForm.vue';
import AdminCodeTable from '../admin/AdminCodeTable.vue';
import { useAccessCodeLoader } from '../../composables/useAccessCodeLoader.js';

const isAuthenticated = ref(false);
const adminUser = ref('');
const adminPass = ref('');
const authError = ref('');
const actionError = ref('');

// I display admin action errors in the page instead of blocking browser alerts.
const showActionError = (message) => { actionError.value = message; };
const codes = ref([]);
const generatedRawCode = ref('');
const selectedCodeIds = ref([]);
const langStore = useLanguageStore();

const newCode = ref({ name: '', expires_at: '' });

const { isLoading: isLoadingCodes, error: codesLoadError, load: fetchCodes } = useAccessCodeLoader();
const loadCodes = async () => {
  const result = await fetchCodes(() => apiCall('/'));
  if (result !== null) {
    codes.value = result;
    selectedCodeIds.value = [];
  }
  return result;
};

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
      authError.value = "Je sessie is verlopen. Log opnieuw in.";
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

const toggleCode = (id) => {
  selectedCodeIds.value = selectedCodeIds.value.includes(id)
    ? selectedCodeIds.value.filter(selectedId => selectedId !== id)
    : [...selectedCodeIds.value, id];
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
    
    await loadCodes();
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
    await loadCodes();
  } catch {
    isAuthenticated.value = false;
    authError.value = 'De verbinding kon niet worden gecontroleerd. Probeer opnieuw in te loggen.';
  }
});

const createCode = async () => {
  actionError.value = '';
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
    showActionError("Fout bij het aanmaken.");
  }
};

const revokeCode = async (id) => {
  actionError.value = '';
  if (!confirm("Weet je zeker dat je deze code wilt intrekken?")) return;
  try {
    const updatedCode = await apiCall(`/${id}/revoke`, { method: 'PUT' });
    const index = codes.value.findIndex(c => c.id === id);
    if (index !== -1) codes.value[index] = updatedCode;
  } catch (error) {
    showActionError("Fout bij intrekken.");
  }
};

const extendCode = async (id, currentExpiresAt) => {
  actionError.value = '';
  const suggestedValue = toDateTimeLocalValue(currentExpiresAt);
  const input = prompt("Nieuwe vervaldatum (YYYY-MM-DDTHH:mm)", suggestedValue);
  if (!input) return;

  const parsedDate = new Date(input);
  if (Number.isNaN(parsedDate.getTime())) {
    showActionError("Ongeldige datum ingevoerd.");
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
    showActionError("Fout bij verlengen.");
  }
};

const deleteCode = async (id, name) => {
  actionError.value = '';
  if (!confirm(`Weet je zeker dat je code '${name}' permanent wilt verwijderen uit het overzicht en de geschiedenis?`)) return;

  try {
    await apiCall(`/${id}`, { method: 'DELETE' });
    codes.value = codes.value.filter(c => c.id !== id);
    selectedCodeIds.value = selectedCodeIds.value.filter(codeId => codeId !== id);
  } catch (error) {
    showActionError("Fout bij verwijderen.");
  }
};

const bulkExtendCodes = async () => {
  actionError.value = '';
  if (!selectedCodeIds.value.length) {
    showActionError("Selecteer eerst minimaal een code.");
    return;
  }

  const input = prompt("Nieuwe vervaldatum voor alle geselecteerde codes (YYYY-MM-DDTHH:mm)");
  if (!input) return;

  const parsedDate = new Date(input);
  if (Number.isNaN(parsedDate.getTime())) {
    showActionError("Ongeldige datum ingevoerd.");
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
    showActionError("Fout bij bulk verlengen.");
  }
};

const bulkDeleteCodes = async () => {
  actionError.value = '';
  if (!selectedCodeIds.value.length) {
    showActionError("Selecteer eerst minimaal een code.");
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
    showActionError("Fout bij bulk verwijderen.");
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