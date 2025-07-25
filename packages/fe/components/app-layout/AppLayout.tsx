import { faEllipsisVertical, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { animated, useSpring } from '@react-spring/web'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import React, { useContext, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useLogin } from '@hooks/useLogin'
import { useAppStore } from '@stores/general'
import { truncate } from '@utils/truncate'
import cx from 'classnames'
import { UserRound } from 'lucide-react'
import { menuConfig } from '../../config'
import Avatar from '../common/Avatar'
import Divider from '../common/Divider'
import Logo from '../common/Logo'
import { GeneralContext } from '../hoc/general-context/GeneralContext'
import NavButtons from './NavButtons'

interface IAppLayout {
  children?: React.ReactNode
  simplifiedFooter?: boolean
  authRequired?: boolean
}

const AppLayout: React.FC<IAppLayout> = (props) => {
  const [showMenu, setShowMenu] = useState(false)

  const { user } = useAppStore((state) => ({
    user: state.user,
  }))

  const { fallbackComponent, isLogin } = useLogin()

  const [menuContainerStyle, menuContainerApi] = useSpring(() => {})
  const [lineStyle, lineApi] = useSpring(() => {})
  const [menuItemStyle, menuItemApi] = useSpring(() => {})
  const { t } = useTranslation('common')

  const generalContext = useContext(GeneralContext)
  const { router } = generalContext

  const currentPath = router?.pathname || ''

  const handleClickAvatar = () => {
    router?.push('/sso/profile')
  }

  useEffect(() => {
    function resize() {
      const c = document.querySelector<HTMLElement>('.app-layout-content')
      if (!c) {
        return
      }
      c.style.minHeight = `${window.innerHeight - 64}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [])

  function handleClickShowMenu() {
    menuContainerApi.start({
      from: {
        y: -10,
        opacity: 0,
      },
      to: {
        y: 0,
        opacity: 1,
      },
    })
    lineApi.start({
      from: {
        scale: 0,
        x: '-50%',
      },
      to: {
        scale: 1,
        x: '0',
      },
    })
    menuItemApi.start({
      from: { opacity: 0 },
      to: { opacity: 1 },
    })
    setShowMenu(!showMenu)
  }

  return (
    <div className="text-neutral-900 dark:text-neutral-50">
      <nav className="sticky top-0 z-20 flex h-[64px] items-center justify-between bg-white/[0.5] px-5 backdrop-blur-xl backdrop-saturate-150 dark:bg-black/[0.8]">
        <Logo width={20} className="fill-neutral-800 dark:fill-neutral-100" />
        <FontAwesomeIcon
          icon={showMenu ? faXmark : faEllipsisVertical}
          className="h-[20px] cursor-pointer px-3 transition-transform duration-150 ease-in-out hover:scale-110 sm:hidden"
          onClick={handleClickShowMenu}
        />

        <div className="hidden items-center sm:flex">
          <div className="flex gap-x-[24px]">
            {menuConfig.map((m) => (
              <Link
                key={m.key}
                href={m.path}
                target={m.externalLink ? '_blank' : ''}
                className={`relative cursor-pointer ${
                  currentPath.startsWith(m.path)
                    ? 'text-neutral-900'
                    : 'text-neutral-500'
                } hover:text-neutral-900 ${
                  currentPath.startsWith(m.path)
                    ? 'dark:text-neutral-100'
                    : 'dark:text-neutral-400'
                } dark:hover:text-neutral-100`}
              >
                {t(`nav.${m.key}`)}
                {m.icon && (
                  <m.icon className="absolute h-[10px] w-[10px] top-0 right-[-13px]" />
                )}
              </Link>
            ))}
          </div>
          <div className="mx-[30px] h-[20px] w-[1px] bg-neutral-300 dark:bg-neutral-600" />
          {user ? (
            <>
              <div
                className="ml-[-15px] mr-[-10px] flex items-center cursor-pointer text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md p-1.5"
                onClick={handleClickAvatar}
              >
                <Avatar user={user} width={20} borderWidth={1} />
                <span className="ml-2 text-sm">
                  {truncate(user.profile.name)}
                </span>
              </div>
              <div className="mx-[20px] h-[20px] w-[1px] bg-neutral-300 dark:bg-neutral-600" />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="ml-[-25px] mr-[-10px] text-neutral-600 dark:text-neutral-400"
                onClick={() => {
                  window.location.href = `/sso/login?redirect=${encodeURIComponent(
                    window.location.href,
                  )}`
                }}
              >
                <UserRound className="w-4 h-4 mr-2" />
                {t('login')}
              </Button>
              <div className="mx-[20px] h-[20px] w-[1px] bg-neutral-300 dark:bg-neutral-600" />
            </>
          )}
          <div className="relative top-[2px]">
            <NavButtons />
          </div>
        </div>
      </nav>
      {showMenu && (
        <animated.div
          style={{ ...menuContainerStyle }}
          className="fixed bottom-0 left-0 right-0 top-[64px] z-10 bg-white sm:hidden dark:bg-black"
        >
          <div className="mx-5 grid grid-cols-1 dark:divide-neutral-300">
            {menuConfig.map((m) => (
              <div key={m.key}>
                <animated.span style={{ ...menuItemStyle }}>
                  <Link
                    href={m.path}
                    className={`relative my-4 block cursor-pointer ${
                      currentPath.startsWith(m.path)
                        ? 'text-neutral-900'
                        : 'text-neutral-500'
                    } hover:text-neutral-900 ${
                      currentPath.startsWith(m.path)
                        ? 'dark:text-neutral-100'
                        : 'dark:text-neutral-400'
                    } hover:text-neutral-900 dark:hover:text-neutral-100 text-nowrap w-min`}
                  >
                    {t(`nav.${m.key}`)}
                    {m.icon && (
                      <m.icon className="absolute h-[10px] w-[10px] top-0 right-[-13px]" />
                    )}
                  </Link>
                </animated.span>
                <animated.div style={{ ...lineStyle }}>
                  <Divider />
                </animated.div>
              </div>
            ))}
            {!user && (
              <>
                <Link
                  href={`/sso/login?redirect=${encodeURIComponent(
                    window.location.href,
                  )}`}
                  className="relative my-4 block cursor-pointer text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  {t('login')}
                </Link>
                <animated.div style={{ ...lineStyle }}>
                  <Divider />
                </animated.div>
              </>
            )}
            <animated.div
              style={{ ...menuItemStyle }}
              className={`flex w-full items-center pt-5 ${
                user ? 'justify-between' : 'justify-end'
              }`}
            >
              {user && (
                <div
                  className="flex items-center relative left-[-4px] top-[-4px]"
                  onClick={handleClickAvatar}
                >
                  <div
                    className={
                      'text-neutral-500 dark:text-neutral-400 flex position items-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-md p-1.5'
                    }
                  >
                    <Avatar user={user} width={20} borderWidth={1} />
                    <span className="ml-2 text-sm relative top-[-1px]">
                      {truncate(user.profile.name)}
                    </span>
                  </div>
                </div>
              )}
              <NavButtons onPress={setShowMenu.bind(null, false)} />
            </animated.div>
          </div>
        </animated.div>
      )}

      <div className="app-layout-content flex flex-col justify-between">
        <div className="p-5">
          {!props?.authRequired && props.children}
          {props?.authRequired &&
            (isLogin ? props.children : fallbackComponent)}
        </div>

        <footer
          className={cx(
            'text-xs flex justify-center mb-6 font-light text-neutral-600 dark:text-neutral-400 ',
            {
              '!mb-4': props?.simplifiedFooter,
              'opacity-[80%]': props?.simplifiedFooter,
            },
          )}
        >
          <p
            className={cx(
              'rounded-full py-2 px-4 flex w-max items-center gap-1 justify-center',
              {
                'bg-neutral-100 dark:bg-neutral-900': !props?.simplifiedFooter,
              },
            )}
          >
            <span>Copyright © {new Date().getFullYear()} hong97.ltd. </span>
            <a
              href="https://beian.miit.gov.cn/#/Integrated/index"
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer hover:underline hidden sm:block"
            >
              沪 ICP 备 2022003448 号
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}

export default AppLayout
