import { http } from '@services/http'
import { time } from './time'

/**
 * Initialize all global singleton services with locale
 * Called in _app.tsx render (not useEffect!) to ensure immediate sync
 * This matches the existing pattern for http.setLocale()
 *
 * @param locale - The current locale (e.g., 'cn', 'en')
 */
export function initializeGlobalServices(locale: string) {
  time.setLocale(locale)
  http.setLocale(locale)
}
