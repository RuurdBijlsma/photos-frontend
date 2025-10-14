import './assets/main.css'

import { createApp } from 'vue'

import App from './App.vue'
import router, { registerNavigationGuard } from '@/plugins/router'
import { vuetify } from '@/plugins/vuetify'
import { pinia } from '@/plugins/pinia'

const app = createApp(App)

app.use(pinia)
registerNavigationGuard()
app.use(router)
app.use(vuetify)
app.mount('#app')
