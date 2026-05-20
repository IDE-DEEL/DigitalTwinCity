<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from './components/TopBar.vue'
import './assets/App.css'

const route = useRoute();
const showTopBar = computed(() => route.path !== '/login' && route.path !== '/admin');
</script>

<template>
  <div class="app-container">

    <!-- Topbar -->
    <!-- ><TopBar v-if="showTopBar" class="topbar"/> -->
    <TopBar class="topbar"/>
    <router-view></router-view>

  </div>
</template>