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
    timeout: 3000,
    closeOnClick: true,
    pauseOnHover: true,
    // draggable: true,
    // draggablePercent: 0.6,
    // showCloseButtonOnHover: false,
    // hideProgressBar: false,
    // closeButton: "button",
    // icon: true,
    // rtl: false
});
app.mount('#app')
