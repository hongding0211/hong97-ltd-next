import { Github, Languages, Moon, Sun } from 'lucide-react'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

interface INavButtons {
  darkMode: boolean
  onDarkModeChange: (isDarkMode: boolean) => void
  onPress?: () => void
}

const NavButtons: React.FC<INavButtons> = (props) => {
  const router = useRouter()
  const { pathname, asPath, query, locale } = router
  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => {
    setDarkMode(props.darkMode)
  }, [props.darkMode])

  function handleChangeLanguage() {
    router
      .push({ pathname, query }, asPath, {
        locale: locale === 'cn' ? 'en' : 'cn',
      })
      .then()
    props.onPress?.()
  }

  const ThemeIcon = darkMode ? Sun : Moon

  return (
    <div className="flex gap-x-[20px]">
      <a
        href="https://github.com/hongding0211"
        target="_blank"
        rel="noreferrer"
      >
        <Github className="h-[20px] w-[20px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300" />
      </a>
      <ThemeIcon
        className="h-[20px] w-[20px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
        onClick={() => {
          props.onDarkModeChange(!props.darkMode)
          props.onPress?.()
        }}
      />
      <Languages
        className="h-[20px] w-[20px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
        onClick={handleChangeLanguage}
      />
    </div>
  )
}

export default NavButtons
