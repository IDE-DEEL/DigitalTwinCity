import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '../src/App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import DigitalTwinPage from './components/pages/DigitalTwinPage.vue'
import SimulationPage from './components/pages/SimulationPage.vue'
import Login from './components/Login.vue'
import AdminPage from './components/pages/AdminPage.vue'
import { apiUrl } from './config/api'
import './index.css'
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

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

async function verifySession() {
    try {
        const response = await fetch(apiUrl('/api/v1/auth/session'), {
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("Fout: Server stuurde geen JSON terug, maar:", contentType);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Netwerkfout tijdens sessiecontrole:", error);
        return null;
    }
}

function clearSession() {
    // Remove legacy token data from older versions of the frontend.
    localStorage.removeItem('deel_access_token');
    localStorage.removeItem('deel_session_name');

    if (sessionExpiryTimer) {
        clearTimeout(sessionExpiryTimer);
        sessionExpiryTimer = null;
    }
}

function scheduleSessionExpiry(session) {
    const expiryTime = session?.expires_at ? session.expires_at * 1000 : null;
    if (!expiryTime) {
        return;
    }

    if (sessionExpiryTimer) {
        clearTimeout(sessionExpiryTimer);
    }

    const timeRemaining = Math.max(expiryTime - Date.now(), 0);
    const MAX_TIMEOUT = 2147483647;

    if (timeRemaining > MAX_TIMEOUT) {
        sessionExpiryTimer = setTimeout(() => {
            scheduleSessionExpiry(session);
        }, MAX_TIMEOUT);
    } else {
        const CLOCK_SKEW_BUFFER_MS = 10000;
        const delay = timeRemaining < CLOCK_SKEW_BUFFER_MS ? CLOCK_SKEW_BUFFER_MS : timeRemaining;
        sessionExpiryTimer = setTimeout(async () => {
            const activeSession = await verifySession();
            if (activeSession) {
                scheduleSessionExpiry(activeSession);
            } else {
                clearSession();
                if (!['/login', '/admin'].includes(page_router.currentRoute.value.path)) {
                    page_router.push('/login');
                }
            }
        }, delay);
    }
}

function isStudentSession(session) {
    return Boolean(session) && session.role !== 'admin';
}

page_router.beforeEach(async (to) => {
    const publicPaths = ['/login', '/admin'];
    const requiresAuth = !publicPaths.includes(to.path);
    const session = await verifySession();
    const hasVerifiedSession = Boolean(session);
    const hasStudentSession = isStudentSession(session);

    clearSession();

    if (hasVerifiedSession) {
        scheduleSessionExpiry(session);
    }

    if (requiresAuth && !hasStudentSession) {
        return '/login';
    }

    if (to.path === '/login' && hasStudentSession) {
        return '/digital_twin';
    }

    return true;
});

const pinia = createPinia()
const app = createApp(App)

app.use(page_router)
app.use(pinia)
app.use(Toast, {
    position: "top-right",
    timeout: 5000,
    closeOnClick: true,
    pauseOnHover: true,
});
app.mount('#app')
