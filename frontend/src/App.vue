<script setup>
import TopBar from './components/TopBar.vue'
import './assets/App.css'
</script>

<template>
  <div class="app-container">

    <!-- Topbar -->
    <TopBar class="topbar"/>
    <router-view></router-view>

  </div>
</template>