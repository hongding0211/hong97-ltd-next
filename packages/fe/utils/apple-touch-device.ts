export const isIPhoneOrIPad = () => {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent
  const platform = navigator.platform
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  const isIPadOS =
    (/Macintosh/.test(userAgent) || /Mac/.test(platform)) &&
    navigator.maxTouchPoints > 1
  const isAppleTouchDevice =
    /Apple/.test(navigator.vendor) && navigator.maxTouchPoints > 1

  return isIOS || isIPadOS || isAppleTouchDevice
}
