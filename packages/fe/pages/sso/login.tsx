import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input, InputProps } from '@/components/ui/input'
import { Label } from '@radix-ui/react-label'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import { useRouter } from 'next/router'
import React, { useCallback, useEffect, useId, useMemo } from 'react'
import { ContextToggle } from '../../components/common/ContextToggle'
import Logo from '../../components/common/Logo'
import { useLoginStore } from './store'

const InputWithLabel: React.FC<
  InputProps & {
    label: string
  }
> = (props) => {
  const { label, ...restProps } = props

  const uid = useId()

  return (
    <div className="flex flex-col gap-y-2">
      <Label htmlFor={uid} className="text-sm">
        {label}
      </Label>
      <Input id={uid} {...restProps} />
    </div>
  )
}

function Login() {
  const { t } = useTranslation('login')
  const { t: tCommon } = useTranslation('common')

  const router = useRouter()

  const {
    msg,
    account,
    password,
    setAccount,
    setPassword,
    login,
    cleanUp,
    tab,
    changeTab,
    init,
    loading,
    signUp,
  } = useLoginStore((state) => ({
    msg: state.msg,
    account: state.account,
    password: state.password,
    setAccount: state.setAccount,
    setPassword: state.setPassword,
    login: state.login,
    cleanUp: state.cleanUp,
    tab: state.tab,
    changeTab: state.changeTab,
    init: state.init,
    loading: state.loading,
    signUp: state.signUp,
    showRedirecting: state.showRedirecting,
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
    return (
      <>
        <InputWithLabel
          value={account}
          onInput={(e) => setAccount(e.currentTarget.value)}
          label={t('account')}
          placeholder={t('email') + ''}
        />
        <InputWithLabel
          value={password}
          onInput={(e) => setPassword(e.currentTarget.value)}
          label={t('password')}
          type="password"
          placeholder={t('password') + ''}
          onKeyDown={handleKeyDown}
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={login} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('login')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => changeTab('signup')}
            disabled={loading}
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
  ])

  const signUpComponent = useMemo(() => {
    return (
      <>
        <InputWithLabel
          value={account}
          onInput={(e) => setAccount(e.currentTarget.value)}
          label={t('account')}
          placeholder={t('email') + ''}
        />
        <InputWithLabel
          value={password}
          onInput={(e) => setPassword(e.currentTarget.value)}
          type="password"
          label={t('password')}
          placeholder={t('password') + ''}
          onKeyDown={handleKeyDown}
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={signUp}>
            {t('signup')}
          </Button>
          <Button size="sm" onClick={() => changeTab('login')} variant="ghost">
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
  ])

  const redirectComponent = useMemo(() => {
    // if (!showRedirecting) {
    //   return null
    // }
    return <div>Redirecting...</div>
  }, [])

  useEffect(() => {
    init({
      redirect: router.query.redirect as string,
    })
    return cleanUp
  }, [init, cleanUp, router])

  return (
    <>
      <Head>
        <title>{t('login')}</title>
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
      <div className="flex h-dvh w-svw items-center justify-center">
        <Card className="relative w-[75%] min-w-[300px] max-w-[400px]">
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
            {redirectComponent}
            {tab === 'login' ? loginComponent : signUpComponent}
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
      </div>
    </>
  )
}

export default Login

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'login'])),
    },
  }
}
