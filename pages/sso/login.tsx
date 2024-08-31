import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'
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
              <InputWithLabel
                label={t('email')}
                placeholder={t('email') + ''}
              />
              <InputWithLabel
                label={t('password')}
                type="password"
                placeholder={t('password') + ''}
              />
            </CardContent>
            <CardFooter>
              <div className="flex-col">
                <div className="mb-4 flex gap-2">
                  <Button>{t('login')}</Button>
                  <Button variant="ghost">{t('signup')}</Button>
                </div>
                <CardDescription>Copyright © 2024 hong97.ltd</CardDescription>
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
