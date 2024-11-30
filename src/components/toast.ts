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

export function toastImportantError(err: Error | any, title?: any, options?: ToastOptions) {
  return toastError(err, title, { closable: true, duration: Infinity, variant: 'danger', ...options })
}

export function toastError(err: Error | any, title?: any, options?: ToastOptions) {
  const errMsg = err.message ?? err
  try {
    console.warn('[toast error]', title ?? '', err)
  } catch (e) {}
  return _toast({
    icon: 'exclamation-triangle',
    variant: 'warning',
    innerHTML: title ? `<h4 style="margin-block: 0;">${title}</h4>${errMsg}` : errMsg,
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
    console.info('[toast]', message)
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
  Object.assign(alert, { originHide: alert.hide })
  /** Sometimes SlAlert is toasting, need to wait for it before hiding */
  alert.hide = () =>
    alert.open
      ? (alert as any).originHide()
      : new Promise<void>((resolve) =>
          alert.addEventListener('sl-after-show', () => resolve((alert as any).originHide()), { once: true })
        )
  return { alert, toasting: alert.toast() }
}
