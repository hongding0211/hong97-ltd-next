import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React, { useEffect } from 'react'
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

const InputWithLabel: React.FC<
  InputProps & {
    label: string
  }
> = (props) => {
  const { label, ...restProps } = props

  return (
    <div className="flex flex-col gap-y-2">
      <Label className="text-sm">{label}</Label>
      <Input {...restProps} />
    </div>
  )
}

function Login() {
  const { t } = useTranslation('login')
  const { t: tCommon } = useTranslation('common')

  const { msg, account, password, setAccount, setPassword, login, cleanUp } =
    useLoginStore((state) => ({
      msg: state.msg,
      account: state.account,
      password: state.password,
      setAccount: state.setAccount,
      setPassword: state.setPassword,
      login: state.login,
      cleanUp: state.cleanUp,
    }))

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
        <div className="flex h-screen w-screen items-center justify-center">
          <Card className="relative w-[75%] min-w-[300px] max-w-[500px]">
            <div className="absolute right-5 top-5">
              <Logo width={16} enableLink={false} />
            </div>
            <CardHeader>
              <CardTitle>{t('login')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!!msg && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{tCommon('error')}</AlertTitle>
                  <AlertDescription>{t(msg)}</AlertDescription>
                </Alert>
              )}
              <InputWithLabel
                value={account}
                onInput={(e) => setAccount(e.currentTarget.value)}
                label={t('email')}
                placeholder={t('email') + ''}
              />
              <InputWithLabel
                value={password}
                onInput={(e) => setPassword(e.currentTarget.value)}
                label={t('password')}
                type="password"
                placeholder={t('password') + ''}
              />
            </CardContent>
            <CardFooter>
              <div className="flex-col">
                <div className="mb-4 flex gap-2">
                  <Button onClick={login}>{t('login')}</Button>
                  <Button variant="ghost">{t('signup')}</Button>
                </div>
                <CardDescription>
                  Copyright © {new Date().getFullYear()} hong97.ltd
                </CardDescription>
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
