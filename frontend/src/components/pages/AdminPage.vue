<template>
  <div class="min-h-screen w-full bg-slate-100">
    <main class="mx-auto max-w-6xl px-6 py-6">
      <AdminPanel @close-admin="handleCloseAdmin" />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import AdminPanel from '../AdminPanel.vue';

const router = useRouter();

const handleCloseAdmin = async () => {
  await router.push('/login');
};
</script>
