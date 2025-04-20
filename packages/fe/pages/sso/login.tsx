import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
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
import { ACCESS_TOKEN_KEY } from '@constants'
import { Label } from '@radix-ui/react-label'
import { http } from '@services/http'
import { useLoginStore } from '@stores/sso'
import { uploadFile2Oss } from '@utils/oss'
import {
  AlertCircle,
  Coffee,
  Eye,
  EyeClosed,
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
    uploadFile2Oss(croppedImgFile.current)
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
                <AvatarImage src={avatar} className="object-cover" />
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

  const { t } = useTranslation('login')
  const { t: tCommon } = useTranslation('common')

  const router = useRouter()

  const {
    msg,
    account,
    password,
    name,
    setAccount,
    setPassword,
    setName,
    login,
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
    tab: state.tab,
    changeTab: state.changeTab,
    loading: state.loading,
    signUp: state.signUp,
    showRedirecting: state.showRedirecting,
    avatar: state.avatar,
    init: state.init,
    cleanUp: state.cleanUp,
  }))

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') {
        return
      }
      if (tab === 'login') {
        login()
      }
      if (tab === 'signup') {
        signUp()
      }
    },
    [tab, login, signUp],
  )

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
          disabled={showRedirecting}
        />
        <InputWithLabel
          value={password}
          onInput={(e) => setPassword(e.currentTarget.value)}
          label={t('password')}
          type={showPassword ? 'text' : 'password'}
          placeholder={t('password') + ''}
          onKeyDown={handleKeyDown}
          disabled={showRedirecting}
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
            onClick={login}
            disabled={loading || showRedirecting}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('login')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => changeTab('signup')}
            disabled={loading || showRedirecting}
          >
            {t('signup')}
          </Button>
        </div>
      </>
    )
  }, [
    account,
    password,
    setAccount,
    setPassword,
    t,
    login,
    changeTab,
    handleKeyDown,
    loading,
    showRedirecting,
    showPassword,
    name,
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

  useEffect(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }, [])

  useEffect(() => {
    setFirstRender(false)
  }, [])

  useEffect(() => {
    const { query } = router
    const { redirect } = query
    init({ redirect: (redirect as string | undefined) ?? '' })
    return cleanUp
  }, [router, cleanUp, init])

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
              <CardTitle>{t(tab)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!!msg && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{tCommon('error')}</AlertTitle>
                  <AlertDescription>{t(msg)}</AlertDescription>
                </Alert>
              )}
              <motion.div
                className="flex flex-col gap-4"
                key={tab}
                layout={false}
                initial={
                  firstRender
                    ? false
                    : {
                        opacity: 0,
                        x: tab === 'login' ? -20 : 20,
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
                  x: tab === 'login' ? -20 : 20,
                  filter: 'blur(6px)',
                }}
                transition={{
                  type: 'tween',
                }}
              >
                {tab === 'login' ? loginComponent : signUpComponent}
              </motion.div>
            </CardContent>
            <CardFooter>
              <div className="w-full flex-col">
                <div className="flex w-full items-center justify-between">
                  <CardDescription className="text-xs">
                    Copyright © {new Date().getFullYear()} hong97.ltd
                  </CardDescription>
                  <ContextToggle />
                </div>
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
  const { locale = 'cn' } = context
  http.setLocale(locale)
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'login', 'toast'])),
    },
  }
}
