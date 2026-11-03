import { isIPhoneOrIPad } from './apple-touch-device'

export const isMobileDevice = () => {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgentData = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData

  return (
    isIPhoneOrIPad() ||
    userAgentData?.mobile === true ||
    /Android|Mobile|Tablet/i.test(navigator.userAgent)
  )
}
