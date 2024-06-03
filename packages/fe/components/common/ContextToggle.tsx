import { faLanguage, faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRouter } from 'next/router'
import React, { useContext } from 'react'
import { GeneralContext } from '../hoc/general-context/GeneralContext'

type IContextToggle = {}

export const ContextToggle: React.FC<IContextToggle> = (_props) => {
  const router = useRouter()
  const { pathname, asPath, query, locale } = router

  const generalContext = useContext(GeneralContext)
  const { darkModeEnabled, setDarkModeEnabled } = generalContext

  const handleChangeLanguage = () => {
    router
      .push({ pathname, query }, asPath, {
        locale: locale === 'cn' ? 'en' : 'cn',
      })
      .then()
  }

  return (
    <div className="flex gap-x-[8px]">
      <FontAwesomeIcon
        icon={!darkModeEnabled ? faMoon : faSun}
        className="h-[16px] w-[16px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
        onClick={() => setDarkModeEnabled(!darkModeEnabled)}
      />
      <FontAwesomeIcon
        icon={faLanguage}
        className="h-[16px] w-[16px] cursor-pointer text-neutral-500 transition-colors duration-150 ease-in-out hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
        onClick={handleChangeLanguage}
      />
    </div>
  )
}
