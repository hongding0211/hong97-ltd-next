import { TFunction } from 'i18next'
import { ExternalToast, toast as sonnerToast } from 'sonner'
import { emitter } from './emitter'

export function registerToast(t: TFunction) {
  emitter.on('toast', (args) => {
    if (!args) {
      return
    }
    let toastFn: any = sonnerToast
    if (args.options?.type === 'error') {
      toastFn = sonnerToast.error
    }
    if (args.options?.type === 'success') {
      toastFn = sonnerToast.success
    }
    toastFn(t(args.msg ?? ''), args.options)
  })
  return () => {
    emitter.off('toast')
  }
}

export function toast(
  msg?: string,
  options?: {
    type?: 'success' | 'error'
  } & ExternalToast,
) {
  emitter.emit('toast', {
    msg,
    options,
  })
}
