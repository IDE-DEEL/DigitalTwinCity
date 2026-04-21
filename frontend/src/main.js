import { createApp } from 'vue'
import App from '../src/App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import DigitalTwinPage from './components/pages/DigitalTwinPage.vue'
import SimulationPage from './components/pages/SimulationPage.vue'
import { connect } from './store.js'

import './index.css'

connect();

const page_router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/digital_twin', component: DigitalTwinPage },
        { path: '/simulation', component: SimulationPage },
        { path: '/', redirect: '/digital_twin' }
    ]
});

const app = createApp(App)

app.use(page_router)
app.mount('#app')