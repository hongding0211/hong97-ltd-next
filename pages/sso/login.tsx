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
import { DarkModeProvider } from '../../components/hoc/dark-mode/DarkModeProvider'
import { Button } from '@/components/ui/button'
import Logo from '../../components/common/Logo'

function About() {
  const { t } = useTranslation('login')

  return (
    <>
      <Head>
        <title>{t('title')}</title>
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
      <DarkModeProvider>
        <div className="flex h-screen w-screen items-center justify-center">
          <Card className="relative w-[75%] max-w-[500px]">
            <div className="absolute right-5 top-5">
              <Logo width={16} enableLink={false} />
            </div>
            <CardHeader>
              <CardTitle>Login</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
            <CardFooter>
              <div className="flex-col">
                <div className="mb-4 flex gap-2">
                  <Button>Login In</Button>
                  <Button variant="ghost">Sign Up</Button>
                </div>
                <CardDescription>Copyright © 2024 hong97.ltd</CardDescription>
              </div>
            </CardFooter>
          </Card>
        </div>
      </DarkModeProvider>
    </>
  )
}

export default About

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'login'])),
    },
  }
}
