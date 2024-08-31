import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React, { useEffect, useId, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { GeneralProvider } from '../../components/hoc/general-context/GeneralProvider'
import { Button } from '@/components/ui/button'
import Logo from '../../components/common/Logo'
import { Input, InputProps } from '@/components/ui/input'
import { Label } from '@radix-ui/react-label'
import { useLoginStore } from './store'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { ContextToggle } from '../../components/common/ContextToggle'

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
  }))

  const loginComponent = useMemo(
    () => (
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
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={login}>
            {t('login')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => changeTab('signup')}>
            {t('signup')}
          </Button>
        </div>
      </>
    ),
    [account, password, setAccount, setPassword, t, login, changeTab],
  )

  const signUpComponent = useMemo(
    () => (
      <>
        <InputWithLabel label={t('account')} placeholder={t('email') + ''} />
        <InputWithLabel
          label={t('password')}
          placeholder={t('password') + ''}
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => changeTab('signup')}>
            {t('signup')}
          </Button>
          <Button size="sm" onClick={() => changeTab('login')} variant="ghost">
            {tCommon('back')}
          </Button>
        </div>
      </>
    ),
    [changeTab, t, tCommon],
  )

  useEffect(() => {
    return cleanUp
  }, [cleanUp])

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
      <GeneralProvider>
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
      </GeneralProvider>
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
