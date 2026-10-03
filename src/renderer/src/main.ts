import './assets/main.css'

import { createApp } from 'vue'
import log from 'electron-log/renderer'
import App from './App.vue'

// Uncaught errors and unhandled rejections are forwarded to the main-process log file.
log.errorHandler.startCatching()

const app = createApp(App)
// Vue swallows component errors, so they never reach window.onerror.
app.config.errorHandler = (error, _instance, info) => {
  log.scope('renderer').error('vue error', { info }, error)
}
app.mount('#app')
