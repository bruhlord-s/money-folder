import { contextBridge, ipcRenderer } from 'electron'
import { ipcChannels, type Api } from '@shared/ipc'

const allowedChannels = new Set<string>(ipcChannels)

// The renderer gets this one typed entry point, never ipcRenderer itself.
const api: Api = {
  invoke: (channel, input) => {
    if (!allowedChannels.has(channel)) {
      return Promise.reject(new Error(`Unknown IPC channel: ${channel}`))
    }
    return ipcRenderer.invoke(channel, input)
  }
}

contextBridge.exposeInMainWorld('api', api)
