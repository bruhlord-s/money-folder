import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import type { IpcChannel, IpcInput, IpcOutput } from '@shared/ipc'

interface UseApi {
  /** Calls main. On failure shows a translated toast and resolves to `undefined`. */
  call: <C extends IpcChannel>(channel: C, input: IpcInput<C>) => Promise<IpcOutput<C> | undefined>
  notifySuccess: (summary: string) => void
}

export function useApi(): UseApi {
  const toast = useToast()
  const { t } = useI18n()

  return {
    async call(channel, input) {
      const result = await window.api.invoke(channel, input)
      if (result.ok) return result.data
      toast.add({
        severity: result.code === 'INTERNAL' ? 'error' : 'warn',
        summary: t(`errors.${result.code}`),
        life: 5000
      })
      return undefined
    },
    notifySuccess(summary) {
      toast.add({ severity: 'success', summary, life: 2500 })
    }
  }
}
