import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '../src/App.vue'
import './index.css'
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(Toast, {
    position: "top-right",
    timeout: 5000,
    closeOnClick: true,
    pauseOnHover: true,
});
app.mount('#app')
