import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SiteImage } from '@components/common/SiteImage'
import { useSsoPasskey } from '@hooks/useSsoPasskey'
import { Label } from '@radix-ui/react-label'
import { recoverFoodSession } from '@services/sso/food-session-recovery'
import {
  PasskeyRequestError,
  claimPasskeyInvite,
  createPasskey,
  isPasskeyCancelled,
  passkeyCreationError,
} from '@services/sso/passkeys'
import {
  readSsoSourceQuery,
  resolveSsoSourceConfig,
} from '@services/sso/source-config'
import { useLoginStore } from '@stores/sso'
import { uploadImage } from '@utils/oss'
import { toast } from '@utils/toast'
import {
  AlertCircle,
  ArrowUpRight,
  Coffee,
  Eye,
  EyeClosed,
  Github,
  KeyRound,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import * as motion from 'motion/react-client'
import { GetStaticPropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ContextToggle } from '../../components/common/ContextToggle'
import Logo from '../../components/common/Logo'
import ImageCrop from '../../components/common/image-crop/ImageCrop'
import { InputWithLabel } from '../../components/common/input-with-label'
import { useGeneralContext } from '../../components/hoc/general-context/GeneralContext'

const readRedirectQuery = (redirect: string | string[] | undefined) => {
  if (typeof redirect === 'string') {
    return redirect
  }
  if (Array.isArray(redirect)) {
    return redirect[0] ?? ''
  }
  if (typeof window === 'undefined') {
    return ''
  }

  return new URLSearchParams(window.location.search).get('redirect') ?? ''
}

const Uploader: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const [showImageCrop, setShowImageCrop] = useState(false)

  const imgFile = useRef<File | null>(null)
  const croppedImgFile = useRef<File | null>(null)

  const { avatar, setAvatar } = useLoginStore((state) => ({
    avatar: state.avatar,
    setAvatar: state.setAvatar,
  }))

  const { t } = useTranslation('login')

  const uid = useId()

  const upload = () => {
    if (!croppedImgFile.current) {
      return
    }
    setLoading(true)
    uploadImage(croppedImgFile.current, 'sso', 'avatar')
      .then((p) => {
        if (!p) {
          return
        }
        setAvatar(p)
      })
      .finally(setLoading.bind(null, false))
  }

  const selectFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.id = uid
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        return
      }
      imgFile.current = file
      setShowImageCrop(true)
    }
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }

  const handleClickButton = () => {
    selectFile()
  }

  return (
    <>
      <div className="flex flex-col gap-y-3">
        <div className="flex items-center gap-x-1">
          <Label htmlFor={uid} className="text-sm">
            {t('avatar')}
          </Label>
          <Badge
            variant="secondary"
            className="relative px-1.5 text-[0.5rem] top-[0.1rem]"
          >
            {t('optional')}
          </Badge>
        </div>
        <div className="relative flex gap-x-2">
          {avatar ? (
            <div
              className="relative cursor-pointer"
              onClick={setAvatar.bind(null, '')}
            >
              <Avatar className="border-2 border-neutral-200 dark:border-neutral-800">
                <SiteImage
                  src={avatar}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </Avatar>
              <Avatar className="opacity-0 hover:opacity-100 border-2 border-neutral-200 dark:border-neutral-800 absolute right-0 bottom-0 items-center justify-center hover:backdrop-brightness-50 hover:backdrop-blur-sm hidden md:flex">
                <Trash2 className="h-3.5 w-3.5 text-neutral-200" />
              </Avatar>
              <div className="absolute right-0 top-0 h-3 w-3 bg-neutral-800 dark:bg-neutral-100 rounded-full flex items-center justify-center md:hidden">
                <X className="h-2.5 w-2.5 text-neutral-200 dark:text-neutral-800" />
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="gap-x-2 px-2.5 py-1.5 h-[none] font-normal text-[0.8rem]"
              onClick={handleClickButton}
              disabled={loading}
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {!loading && <Upload className="h-3 w-3" />}
              <span>{t('upload')}</span>
            </Button>
          )}
        </div>
      </div>
      <ImageCrop
        show={showImageCrop}
        onShowChange={setShowImageCrop}
        onApply={(f) => {
          croppedImgFile.current = f
          setShowImageCrop(false)
          upload()
        }}
        file={imgFile.current}
      />
    </>
  )
}

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [firstRender, setFirstRender] = useState(true)
  const [githubLoading, setGithubLoading] = useState(false)
  const [passkeyInvite, setPasskeyInvite] = useState<{ finish: () => void }>()
  const [creatingPasskey, setCreatingPasskey] = useState(false)
  const [finishingPasskeyInvite, setFinishingPasskeyInvite] = useState<
    'create' | 'skip'
  >()
  const inviteHeading = useRef<HTMLHeadingElement>(null)
  const accountInput = useRef<HTMLInputElement>(null)

  const { t } = useTranslation('login')
  const { t: tCommon } = useTranslation('common')
  const { t: tPasskey } = useTranslation('passkeys')

  const router = useRouter()
  const userId = useGeneralContext().user?.userId

  const {
    msg,
    account,
    password,
    name,
    setAccount,
    setPassword,
    setName,
    login,
    completeLogin,
    tab,
    changeTab,
    loading,
    signUp,
    showRedirecting,
    init,
    cleanUp,
  } = useLoginStore((state) => ({
    msg: state.msg,
    account: state.account,
    password: state.password,
    name: state.name,
    setAccount: state.setAccount,
    setPassword: state.setPassword,
    setName: state.setName,
    login: state.login,
    completeLogin: state.completeLogin,
    tab: state.tab,
    changeTab: state.changeTab,
    loading: state.loading,
    signUp: state.signUp,
    showRedirecting: state.showRedirecting,
    avatar: state.avatar,
    init: state.init,
    cleanUp: state.cleanUp,
  }))

  const passkey = useSsoPasskey(
    router.isReady &&
      tab === 'login' &&
      !loading &&
      !passkeyInvite &&
      !showRedirecting &&
      !githubLoading,
    readRedirectQuery(router.query.redirect),
    completeLogin,
  )

  const handlePasswordLogin = useCallback(() => {
    if (passkey.busy || passkeyInvite || showRedirecting) return
    passkey.clearError()
    void login(async (finish) => {
      if (!passkey.supported || !(await claimPasskeyInvite())) return false
      setPassword('')
      setFinishingPasskeyInvite(undefined)
      const profile =
        router.locale === 'cn' ? '/cn/sso/profile' : '/sso/profile'
      setPasskeyInvite({ finish: () => finish(profile) })
      return true
    })
  }, [
    login,
    passkey.busy,
    passkey.clearError,
    passkey.supported,
    passkeyInvite,
    router.locale,
    setPassword,
    showRedirecting,
  ])

  useEffect(() => {
    if (passkeyInvite) inviteHeading.current?.focus()
  }, [passkeyInvite])

  const finishPasskeyInvite = (action: 'create' | 'skip') => {
    if (!passkeyInvite || finishingPasskeyInvite) return
    setFinishingPasskeyInvite(action)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(passkeyInvite.finish)
    })
  }

  const createInvitedPasskey = async () => {
    setCreatingPasskey(true)
    try {
      await createPasskey()
      toast(tPasskey('created'), { type: 'success' })
      finishPasskeyInvite('create')
    } catch (error) {
      if (error instanceof PasskeyRequestError && error.status === 409) {
        finishPasskeyInvite('create')
      } else if (!isPasskeyCancelled(error)) {
        toast(tPasskey(passkeyCreationError(error)), { type: 'error' })
      }
    } finally {
      setCreatingPasskey(false)
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') {
        return
      }
      if (tab === 'login') {
        handlePasswordLogin()
      }
      if (tab === 'signup') {
        signUp()
      }
    },
    [tab, handlePasswordLogin, signUp],
  )

  const githubError = useMemo(() => {
    return typeof router.query.github_error === 'string'
      ? router.query.github_error
      : ''
  }, [router.query.github_error])

  const sourceConfig = useMemo(() => {
    if (!router.isReady) {
      return undefined
    }
    return resolveSsoSourceConfig(readSsoSourceQuery(router.query.source))
  }, [router.isReady, router.query.source])
  const sourcePrivacyLink = sourceConfig?.privacyLink
  const showGithubLogin =
    sourceConfig !== undefined && !sourceConfig.hideGithubLogin

  const handleGithubLogin = useCallback(() => {
    setGithubLoading(true)
    const redirect = readRedirectQuery(router.query.redirect)
    const url = new URL('/api/auth/github', window.location.origin)
    if (redirect) {
      url.searchParams.set('redirect', redirect)
    }
    window.location.href = url.toString()
  }, [router.query.redirect])

  const loginComponent = useMemo(() => {
    const PasswordRight = showPassword ? Eye : EyeClosed

    return (
      <>
        {showRedirecting && (
          <motion.div
            key={showRedirecting + ''}
            initial={{
              opacity: 0,
              y: -20,
              filter: 'blur(10px)',
            }}
            animate={{
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
            }}
            exit={{
              opacity: 0,
              y: 20,
              filter: 'blur(10px)',
            }}
            transition={{
              type: 'spring',
              duration: 1,
              bounce: 0.3,
            }}
          >
            <Alert>
              <Coffee className="h-4 w-4 animate-pulse" />
              <AlertTitle>
                {`${t('redirectTitle', {
                  name,
                })}`}
              </AlertTitle>
              <AlertDescription className="mt-3">
                {t('redirectDescription')}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
        <InputWithLabel
          value={account}
          onInput={(e) => setAccount(e.currentTarget.value)}
          label={t('account')}
          placeholder={t('email') + ''}
          name="username"
          inputRef={accountInput}
          onFocus={passkey.startAutofill}
          autoComplete={passkey.supported ? 'username webauthn' : 'username'}
          disabled={showRedirecting || passkey.busy}
        />
        <InputWithLabel
          value={password}
          onInput={(e) => setPassword(e.currentTarget.value)}
          label={t('password')}
          type={showPassword ? 'text' : 'password'}
          placeholder={t('password') + ''}
          onKeyDown={handleKeyDown}
          name="password"
          autoComplete="current-password"
          disabled={showRedirecting || passkey.busy}
          right={
            !showRedirecting && (
              <div
                className="cursor-pointer p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
                onClick={setShowPassword.bind(null, !showPassword)}
              >
                <PasswordRight className="h-4 w-4" />
              </div>
            )
          }
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={handlePasswordLogin}
            disabled={
              loading || showRedirecting || passkey.busy || githubLoading
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('login')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => changeTab('signup')}
            disabled={
              loading || showRedirecting || passkey.busy || githubLoading
            }
          >
            {t('signup')}
          </Button>
        </div>
        <div className="mt-1 -mb-1 flex flex-col gap-2">
          {passkey.supported && !showRedirecting && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="w-full gap-1"
              onClick={passkey.busy ? passkey.cancel : passkey.start}
              disabled={loading || githubLoading}
            >
              {passkey.busy ? (
                <Loader2
                  aria-hidden="true"
                  className="!h-3 !w-3 animate-spin"
                />
              ) : (
                <KeyRound aria-hidden="true" className="!h-3 !w-3" />
              )}
              {tPasskey(passkey.busy ? 'cancel' : 'signIn')}
            </Button>
          )}
          {showGithubLogin && (
            <Button
              size="xs"
              variant="outline"
              className="w-full gap-1"
              onClick={handleGithubLogin}
              disabled={
                loading || showRedirecting || githubLoading || passkey.busy
              }
              aria-label={t('githubLogin')}
              title={t('githubLogin')}
            >
              {githubLoading ? (
                <Loader2 className="!h-3 !w-3 animate-spin" />
              ) : (
                <Github className="!h-3 !w-3" />
              )}
              {t('githubLogin')}
            </Button>
          )}
        </div>
      </>
    )
  }, [
    account,
    password,
    setAccount,
    setPassword,
    t,
    tPasskey,
    passkey,
    handlePasswordLogin,
    changeTab,
    handleKeyDown,
    loading,
    githubLoading,
    showGithubLogin,
    showRedirecting,
    showPassword,
    name,
    handleGithubLogin,
  ])

  const signUpComponent = useMemo(() => {
    const PasswordRight = showPassword ? Eye : EyeClosed

    return (
      <>
        <InputWithLabel
          value={account}
          onInput={(e) => setAccount(e.currentTarget.value)}
          label={t('account')}
          placeholder={t('email') + ''}
        />
        <InputWithLabel
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          label={t('name')}
          placeholder={t('name') + ''}
        />
        <InputWithLabel
          value={password}
          onInput={(e) => setPassword(e.currentTarget.value)}
          type={showPassword ? 'text' : 'password'}
          label={t('password')}
          placeholder={t('password') + ''}
          onKeyDown={handleKeyDown}
          right={
            <div
              className="cursor-pointer p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              <PasswordRight className="h-4 w-4" />
            </div>
          }
        />
        <Uploader />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={signUp}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('signup')}
          </Button>
          <Button
            size="sm"
            disabled={loading}
            onClick={() => changeTab('login')}
            variant="ghost"
          >
            {tCommon('back')}
          </Button>
        </div>
      </>
    )
  }, [
    changeTab,
    t,
    tCommon,
    account,
    password,
    handleKeyDown,
    setAccount,
    setPassword,
    signUp,
    loading,
    name,
    setName,
    showPassword,
    Uploader,
  ])

  const step = passkeyInvite ? 'passkey' : tab
  const inviteBusy = creatingPasskey || Boolean(finishingPasskeyInvite)
  const inviteCreating = creatingPasskey || finishingPasskeyInvite === 'create'
  const passkeyError = step === 'login' && !showRedirecting && passkey.failed

  useEffect(() => {
    if (router.isReady && step === 'login') accountInput.current?.focus()
  }, [router.isReady, step])

  useEffect(() => {
    setFirstRender(false)
  }, [])

  useEffect(() => {
    if (!router.isReady) {
      return
    }
    init({ redirect: readRedirectQuery(router.query.redirect) })
    return cleanUp
  }, [router.isReady, router.query.redirect, cleanUp, init])

  useEffect(() => {
    if (!router.isReady || !userId || loading || passkeyInvite) return
    const controller = new AbortController()
    try {
      void recoverFoodSession({
        redirect: readRedirectQuery(router.query.redirect),
        origin: window.location.origin,
        fetch: window.fetch.bind(window),
        storage: window.sessionStorage,
        replace: (path) => window.location.replace(path),
        signal: controller.signal,
      })
    } catch {
      // Login remains available if browser storage is disabled.
    }
    return () => controller.abort()
  }, [router.isReady, router.query.redirect, userId, loading, passkeyInvite])

  return (
    <>
      <Head>
        <title>{t('login')}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#fff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#000"
        />
      </Head>
      <div className="flex h-dvh w-svw justify-center items-center">
        <AnimatePresence mode="wait">
          <Card className="relative w-[90%] min-w-[300px] max-w-[400px]">
            <div className="absolute right-5 top-5">
              <Logo
                width={16}
                enableLink={false}
                className="fill-neutral-800 dark:fill-neutral-100"
              />
            </div>
            <CardHeader>
              {passkeyInvite ? (
                <CardTitle ref={inviteHeading} tabIndex={-1}>
                  {tPasskey('title')}
                </CardTitle>
              ) : (
                <CardTitle>{t(tab)}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!passkeyInvite && (msg || passkeyError) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{tCommon('error')}</AlertTitle>
                  <AlertDescription>
                    {passkeyError ? tPasskey('loginFailed') : t(msg)}
                  </AlertDescription>
                </Alert>
              )}
              {!passkeyInvite && showGithubLogin && !!githubError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{tCommon('error')}</AlertTitle>
                  <AlertDescription>{t('githubLoginFailed')}</AlertDescription>
                </Alert>
              )}
              <motion.div
                className="flex flex-col gap-4"
                key={step}
                layout={false}
                initial={
                  firstRender
                    ? false
                    : {
                        opacity: 0,
                        x: step === 'login' ? -20 : 20,
                        filter: 'blur(6px)',
                      }
                }
                animate={{
                  opacity: 1,
                  x: 0,
                  filter: 'blur(0px)',
                }}
                exit={{
                  opacity: 0,
                  x: step === 'login' ? -20 : 20,
                  filter: 'blur(6px)',
                }}
                transition={{
                  type: 'tween',
                }}
              >
                {passkeyInvite ? (
                  <>
                    <CardDescription>
                      {tPasskey('inviteDescription')}
                    </CardDescription>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={createInvitedPasskey}
                        aria-busy={inviteCreating}
                        disabled={inviteBusy}
                      >
                        {inviteCreating && (
                          <Loader2
                            aria-hidden="true"
                            className="mr-2 h-4 w-4 animate-spin"
                          />
                        )}
                        {tPasskey('inviteCreate')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => finishPasskeyInvite('skip')}
                        aria-busy={finishingPasskeyInvite === 'skip'}
                        disabled={inviteBusy}
                      >
                        {finishingPasskeyInvite === 'skip' && (
                          <Loader2
                            aria-hidden="true"
                            className="mr-2 h-4 w-4 animate-spin"
                          />
                        )}
                        {tPasskey('skip')}
                      </Button>
                    </div>
                  </>
                ) : tab === 'login' ? (
                  loginComponent
                ) : (
                  signUpComponent
                )}
              </motion.div>
            </CardContent>
            <CardFooter>
              <div className="flex w-full items-center justify-between gap-4">
                {sourcePrivacyLink ? (
                  <div className="flex items-center text-xs leading-none text-neutral-500 dark:text-neutral-400">
                    <a
                      href={sourcePrivacyLink.href}
                      className="inline-flex w-fit items-center gap-0.5 text-current underline-offset-4 hover:underline"
                    >
                      {t(sourcePrivacyLink.labelKey)}
                      <ArrowUpRight className="h-3 w-3" aria-hidden />
                    </a>
                  </div>
                ) : (
                  <CardDescription className="text-xs">
                    Copyright © {new Date().getFullYear()} hong97.ltd
                  </CardDescription>
                )}
                <ContextToggle />
              </div>
            </CardFooter>
          </Card>
        </AnimatePresence>
      </div>
    </>
  )
}

export default Login

export async function getStaticProps(context: GetStaticPropsContext) {
  const { locale = 'en' } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, [
        'common',
        'login',
        'toast',
        'passkeys',
      ])),
    },
  }
}
