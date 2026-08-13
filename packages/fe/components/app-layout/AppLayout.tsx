import { faEllipsisVertical, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { animated, useTransition } from '@react-spring/web'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import React, { useContext, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useLogin } from '@hooks/useLogin'
import { truncate } from '@utils/truncate'
import cx from 'classnames'
import { UserRound } from 'lucide-react'
import { useRouter } from 'next/router'
import { menuConfig } from '../../config'
import Avatar from '../common/Avatar'
import Divider from '../common/Divider'
import Logo from '../common/Logo'
import { GeneralContext } from '../hoc/general-context/GeneralContext'
import NavButtons from './NavButtons'

type AnimatedDivProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> & {
  style?: unknown
}
const AnimatedDiv = animated.div as React.ComponentType<AnimatedDivProps>

interface IAppLayout {
  children?: React.ReactNode
  simplifiedFooter?: boolean
  authRequired?: boolean
  hideNavBar?: boolean
  className?: string
}

const AppLayout: React.FC<IAppLayout> = (props) => {
  const [showMenu, setShowMenu] = useState(false)
  const hideNavBar = props.hideNavBar === true

  const generalContext = useContext(GeneralContext)
  const { router, user } = generalContext

  const { fallbackComponent, isLogin } = useLogin()

  const { locale } = useRouter()

  const menuTransition = useTransition(showMenu, {
    from: { progress: 0 },
    enter: { progress: 1 },
    leave: { progress: 0 },
    config: { tension: 170, friction: 26, clamp: true },
  })
  const { t } = useTranslation('common')

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
      c.style.minHeight = `${window.innerHeight - (hideNavBar ? 0 : 64)}px`
    }
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
    }
  }, [hideNavBar])

  useEffect(() => {
    if (hideNavBar) {
      setShowMenu(false)
    }
  }, [hideNavBar])

  function handleClickShowMenu() {
    setShowMenu((isVisible) => !isVisible)
  }

  return (
    <div className="text-neutral-900 dark:text-neutral-50">
      {!hideNavBar && (
        <nav className="sticky top-0 z-20 flex h-[64px] items-center justify-between bg-white/[0.5] px-5 backdrop-blur-xl backdrop-saturate-150 dark:bg-black/[0.8]">
          <Logo width={20} className="fill-neutral-800 dark:fill-neutral-100" />
          <button
            type="button"
            aria-controls="mobile-navigation-menu"
            aria-expanded={showMenu}
            aria-label={
              locale === 'cn'
                ? showMenu
                  ? '关闭导航菜单'
                  : '打开导航菜单'
                : showMenu
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
            }
            className="relative box-content h-[20px] w-[20px] cursor-pointer px-3 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:scale-110 sm:hidden"
            onClick={handleClickShowMenu}
          >
            <FontAwesomeIcon
              aria-hidden="true"
              icon={faEllipsisVertical}
              className={`pointer-events-none absolute inset-0 m-auto h-[20px] w-[20px] transition-[opacity,transform] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
                showMenu
                  ? 'rotate-90 scale-75 opacity-0'
                  : 'rotate-0 scale-100 opacity-100'
              }`}
            />
            <FontAwesomeIcon
              aria-hidden="true"
              icon={faXmark}
              className={`pointer-events-none absolute inset-0 m-auto h-[20px] w-[20px] transition-[opacity,transform] duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
                showMenu
                  ? 'rotate-0 scale-100 opacity-100'
                  : '-rotate-90 scale-75 opacity-0'
              }`}
            />
          </button>

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
                  {m.badge && (
                    <span
                      aria-hidden="true"
                      className="absolute right-[-10px] top-0 text-[7px] font-semibold leading-none tracking-[-0.02em]"
                    >
                      {m.badge}
                    </span>
                  )}
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
                    window.location.href = `/${
                      locale ?? 'en'
                    }/sso/login?redirect=${encodeURIComponent(
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
      )}
      {!hideNavBar &&
        menuTransition(
          ({ progress }, isMenuVisible) =>
            isMenuVisible && (
              <AnimatedDiv
                id="mobile-navigation-menu"
                className="fixed bottom-0 left-0 right-0 top-[64px] z-[100] bg-white sm:hidden dark:bg-black"
                style={{
                  opacity: progress,
                  y: progress.to([0, 1], [-10, 0]),
                }}
                onClick={() => setShowMenu(false)}
              >
                <div
                  className="mx-5 grid grid-cols-1 dark:divide-neutral-300"
                  onClick={(event) => event.stopPropagation()}
                >
                  {menuConfig.map((m) => (
                    <div key={m.key}>
                      {/* @ts-ignore */}
                      <animated.span style={{ opacity: progress }}>
                        <Link
                          href={m.path}
                          onClick={
                            currentPath.startsWith(m.path)
                              ? () => setShowMenu(false)
                              : undefined
                          }
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
                          {m.badge && (
                            <span
                              aria-hidden="true"
                              className="absolute right-[-11px] top-[1px] text-[7px] font-semibold leading-none tracking-[-0.02em]"
                            >
                              {m.badge}
                            </span>
                          )}
                          {m.icon && (
                            <m.icon className="absolute h-[10px] w-[10px] top-0 right-[-13px]" />
                          )}
                        </Link>
                      </animated.span>
                      {/* @ts-ignore */}
                      <animated.div
                        style={{
                          scale: progress,
                          x: progress.to([0, 1], ['-50%', '0%']),
                        }}
                      >
                        <Divider />
                      </animated.div>
                    </div>
                  ))}
                  {!user && (
                    <>
                      {/* @ts-ignore */}
                      <animated.div style={{ opacity: progress }}>
                        <Link
                          href={`/sso/login?redirect=${encodeURIComponent(
                            window.location.href,
                          )}`}
                          className="relative my-4 block cursor-pointer text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                        >
                          {t('login')}
                        </Link>
                      </animated.div>
                      {/* @ts-ignore */}
                      <animated.div
                        style={{
                          scale: progress,
                          x: progress.to([0, 1], ['-50%', '0%']),
                        }}
                      >
                        <Divider />
                      </animated.div>
                    </>
                  )}
                  {/* @ts-ignore */}
                  <animated.div
                    style={{ opacity: progress }}
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
              </AnimatedDiv>
            ),
        )}

      <div className="app-layout-content flex flex-col justify-between min-h-screen">
        <div className={`p-5 ${props.className || ''}`}>
          {!props?.authRequired && props.children}
          {props?.authRequired &&
            (isLogin ? props.children : fallbackComponent)}
        </div>

        <footer
          className={cx(
            'text-xs px-5 sm:px-8 mb-4 font-light text-neutral-500 dark:text-neutral-500 ',
          )}
        >
          <div className="h-[0.5px] my-2.5 sm:my-3 bg-neutral-200 dark:bg-neutral-800 dark:opacity-80" />
          <div className="flex flex-col gap-y-0.5">
            <p className={cx('flex w-max items-center gap-1 justify-center')}>
              <span>Copyright © {new Date().getFullYear()} hong97.ltd. </span>
              {locale === 'cn' && (
                <a
                  href="https://beian.miit.gov.cn/#/Integrated/index"
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer hover:underline hidden sm:block"
                >
                  沪 ICP 备 2022003448 号
                </a>
              )}
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default AppLayout
