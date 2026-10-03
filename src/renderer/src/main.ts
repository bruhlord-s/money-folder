import 'primeicons/primeicons.css'
import './assets/main.css'

import { createApp } from 'vue'
import log from 'electron-log/renderer'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import App from './App.vue'
import { i18n } from './i18n'
import { router } from './router'
import { warmPreset } from './theme'

// Uncaught errors and unhandled rejections are forwarded to the main-process log file.
log.errorHandler.startCatching()

const app = createApp(App)
// Vue swallows component errors, so they never reach window.onerror.
app.config.errorHandler = (error, _instance, info) => {
  log.scope('renderer').error('vue error', { info }, error)
}
app.use(PrimeVue, { theme: { preset: warmPreset, options: { darkModeSelector: 'none' } } })
app.use(ToastService)
app.use(ConfirmationService)
app.use(i18n)
app.use(router)
app.mount('#app')
