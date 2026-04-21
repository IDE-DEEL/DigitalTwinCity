import { createApp } from 'vue'
import App from '../src/App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import DigitalTwinPage from './components/pages/DigitalTwinPage.vue'
import SimulationPage from './components/pages/SimulationPage.vue'
import Login from './components/Login.vue'
import AdminPage from './components/pages/AdminPage.vue'
import './index.css'

const page_router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/login', component: Login },
        { path: '/admin', component: AdminPage },
        { path: '/digital_twin', component: DigitalTwinPage },
        { path: '/simulation', component: SimulationPage },
        { path: '/', redirect: '/digital_twin' }
    ]
});

let sessionExpiryTimer = null;

function decodeJwtPayload(token) {
    try {
        const base64Payload = token.split('.')[1];
        const normalizedPayload = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedPayload = normalizedPayload.padEnd(
            normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
            '='
        );
        const jsonPayload = decodeURIComponent(
            atob(paddedPayload)
                .split('')
                .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

function getTokenExpiryTime(token) {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) {
        return null;
    }

    return payload.exp * 1000;
}

function isTokenExpired(token) {
    const expiryTime = getTokenExpiryTime(token);
    return !expiryTime || expiryTime <= Date.now();
}

function clearSession() {
    localStorage.removeItem('deel_access_token');
    localStorage.removeItem('deel_session_name');

    if (sessionExpiryTimer) {
        clearTimeout(sessionExpiryTimer);
        sessionExpiryTimer = null;
    }
}

function scheduleSessionExpiry(token) {
    const expiryTime = getTokenExpiryTime(token);
    if (!expiryTime) {
        clearSession();
        return;
    }

    if (sessionExpiryTimer) {
        clearTimeout(sessionExpiryTimer);
    }

    sessionExpiryTimer = setTimeout(() => {
        clearSession();

        if (!['/login', '/admin'].includes(page_router.currentRoute.value.path)) {
            page_router.push('/login');
        }
    }, Math.max(expiryTime - Date.now(), 0));
}

page_router.beforeEach((to) => {
    const token = localStorage.getItem('deel_access_token');
    const publicPaths = ['/login', '/admin'];
    const requiresAuth = !publicPaths.includes(to.path);
    const hasValidToken = token && !isTokenExpired(token);

    if (token && !hasValidToken) {
        clearSession();
    }

    if (hasValidToken) {
        scheduleSessionExpiry(token);
    }

    if (requiresAuth && !hasValidToken) {
        return '/login';
    }

    if (to.path === '/login' && hasValidToken) {
        return '/digital_twin';
    }

    return true;
});

const app = createApp(App)

app.use(page_router)
app.mount('#app')
