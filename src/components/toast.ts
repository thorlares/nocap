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

export function toastImportantError(err: Error, message?: any, options?: ToastOptions) {
  return toastError(err, message, { closable: true, duration: Infinity, variant: 'danger', ...options })
}

export function toastError(err: Error, message?: any, options?: ToastOptions) {
  const errMsg = err.message ?? err
  return _toast({
    icon: 'exclamation-triangle',
    variant: 'warning',
    innerHTML: message ? `<h4 style="margin-block: 0;">${message}</h4>${errMsg}` : errMsg,
    ...options
  })
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
  return _toast({
    variant: options?.variant ?? (isError ? 'warning' : 'primary'),
    icon: isError ? 'exclamation-triangle' : 'info-circle',
    innerHTML: message?.message ?? message,
    ...options
  })
}

function _toast(options: ToastOptions) {
  const alert: SlAlert = Object.assign(document.createElement('sl-alert'), {
    duration: 3500,
    countdown: options?.duration == Infinity ? undefined : 'rtl',
    ...options,
    innerHTML: `<sl-icon slot="icon" name="${options?.icon ?? 'info-circle'}"></sl-icon>${options.innerHTML}`
  })
  document.body.append(alert)
  return { alert, toasting: alert.toast() }
}
