import '@shoelace-style/shoelace/dist/components/alert/alert'
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert'
import '@shoelace-style/shoelace/dist/components/icon/icon'

/** @see https://shoelace.style/components/icon#default-icons for icon names */
type ToastOptions = {
  variant?: 'primary' | 'success' | 'neutral' | 'warning' | 'danger'
  closable?: boolean
  duration?: number
  countdown?: 'rtl' | 'ltr'
  icon?: string
  innerHTML?: string
}

export function toastImportant(message: any, options?: ToastOptions) {
  const isError = message instanceof Error
  return toast(message, {
    closable: true,
    duration: Infinity,
    variant: isError ? 'danger' : 'primary',
    icon: isError ? 'exclamation-octagon' : undefined,
    ...options
  })
}

export function toast(message: any, options?: ToastOptions) {
  const isError = message instanceof Error
  try {
    console.info(isError ? 'toasting error:' : 'toasting', message?.message, message)
  } catch (e) {}
  const alert: SlAlert = Object.assign(document.createElement('sl-alert'), {
    duration: 3500,
    countdown: options?.duration ? undefined : 'rtl',
    variant: options?.variant ?? (isError ? 'warning' : 'default'),
    innerHTML: `<sl-icon slot="icon" name=${
      options?.icon ?? (isError ? 'exclamation-triangle' : 'info-circle')
    }></sl-icon>${message?.message ?? message}`,
    ...options
  })
  document.body.append(alert)
  return { alert, toasting: alert.toast() }
}
