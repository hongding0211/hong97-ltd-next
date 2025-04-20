import { Github, Languages, Moon, Sun, SunMoon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

interface INavButtons {
  onPress?: () => void
}

const NavButtons: React.FC<INavButtons> = (props) => {
  const router = useRouter()
  const { pathname, asPath, query, locale } = router

  const { theme, setTheme, themes } = useTheme()

  const [atClient, setAtClient] = useState(false)

  function handleChangeLanguage() {
    router
      .push({ pathname, query }, asPath, {
        locale: locale === 'cn' ? 'en' : 'cn',
      })
      .then()
    props.onPress?.()
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
  useEffect(setAtClient.bind(null, true), [])

  return (
    <div className="flex gap-x-[20px]">
      <a
        href="https://github.com/hongding0211"
        target="_blank"
        rel="noreferrer"
      >
        <Github className="h-[20px] w-[20px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300" />
      </a>
      {atClient ? (
        <ThemeIcon
          className="h-[20px] w-[20px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
          onClick={() => {
            let nextThemeIdx = themes.indexOf(theme) + 1
            if (nextThemeIdx >= themes.length) {
              nextThemeIdx = 0
            }
            setTheme(themes[nextThemeIdx])
          }}
        />
      ) : (
        <SunMoon className="h-[20px] w-[20px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300" />
      )}
      <Languages
        className="h-[20px] w-[20px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
        onClick={handleChangeLanguage}
      />
    </div>
  )
}

export default NavButtons
