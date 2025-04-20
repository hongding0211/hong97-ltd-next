import { Languages, Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

export const ContextToggle: React.FC = () => {
  const router = useRouter()
  const { pathname, asPath, query, locale } = router

  const [showThemeToggle, setShowThemeToggle] = useState(false)

  const { theme, setTheme, themes } = useTheme()

  const handleChangeLanguage = () => {
    router
      .push({ pathname, query }, asPath, {
        locale: locale === 'cn' ? 'en' : 'cn',
      })
      .then()
  }

  const ThemeIcon = (() => {
    if (theme === 'system') {
      return SunMoon
    }
    if (theme === 'dark') {
      return Moon
    }
    return Sun
  })()

  /** A fix for hydration error */
  useEffect(setShowThemeToggle.bind(null, true), [])

  return (
    <div className="flex gap-x-[10px]">
      {showThemeToggle && (
        <>
          <ThemeIcon
            className="h-[16px] w-[16px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
            onClick={() => {
              let nextThemeIdx = themes.indexOf(theme) + 1
              if (nextThemeIdx >= themes.length) {
                nextThemeIdx = 0
              }
              setTheme(themes[nextThemeIdx])
            }}
          />
          <Languages
            className="h-[16px] w-[16px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
            onClick={handleChangeLanguage}
          />
        </>
      )}
    </div>
  )
}
