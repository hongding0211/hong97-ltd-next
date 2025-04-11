export const truncate = (text: string, maxLength = 6): string => {
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}
