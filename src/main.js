import '@/assets/styles/main.css'
import '@/assets/styles/Navbar/stylesheet.css'
import '@/assets/styles/Navbar/scopedStylesheet.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
