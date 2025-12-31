import cx from 'classnames'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'

import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { TypingAnimation } from '@/components/ui/typing-animation'
import Link from 'next/link'
import AppLayout from '../../components/app-layout/AppLayout'

function About() {
  const { t } = useTranslation('about')

  return (
    <>
      <Head>
        <title>{t('title')}</title>
      </Head>
      <AppLayout className="flex flex-col flex-1 mb-[-3svh]">
        <div
          className={cx(
            'flex flex-col max-w-2xl mx-auto flex-1',
            'text-[1.5rem] sm:text-[2rem]',
            'font-bold sm:font-semibold',
            'hyphens-auto break-words',
          )}
        >
          <div className={cx('mt-[28svh] sm:mt-[35svh]')}>
            <span className="text-[2.5rem] ml-[-0.4rem]">👋 </span>
            <TypingAnimation
              className="text-[2.5rem] font-bold"
              cursorStyle="underscore"
              startOnView={false}
              blinkCursor
              loop
              words={[
                'Hey there!',
                '你好!',
                'Hola!',
                'こんにちは!',
                'Bonjour!',
                '안녕하세요!',
              ]}
            />

            <p className="mt-[2rem]">{t('p1')}</p>

            <div
              className={cx(
                'flex items-center',
                'gap-x-2',
                'mt-[3rem]',
                'text-[1rem] sm:text-[1.25rem]',
                'underline',
              )}
            >
              <Link
                className="hover:opacity-70"
                target="_blank"
                href="https://github.com/hongding0211"
              >
                {t('github')}
              </Link>
              <Link
                className="hover:opacity-70"
                target="_blank"
                href="https://www.xiaohongshu.com/user/profile/5b4cb655f7e8b918f05ca063"
              >
                {t('xhs')}
              </Link>
            </div>
          </div>
        </div>

        <div
          className={cx(
            'flex flex-col sm:flex-row justify-start sm:justify-between pr-0 sm:pr-16 gap-y-8',
            'max-w-2xl mx-auto w-full flex-0 mt-[15svh]',
          )}
        >
          <div>
            <p className="flex items-center gap-x-1 text-[1rem] sm:text-[1.25rem] font-bold mb-1.5 sm:mb-3">
              {t('profile')}
            </p>
            <div className="mb-2 font-medium text-[0.85rem] sm:text-[1rem]">
              <p className="opacity-50 text-[0.75rem] sm:text-[0.9rem]">
                {t('mbti')}
              </p>
              <p>INTP</p>
            </div>
            <div className="mb-2 font-medium text-[0.85rem] sm:text-[1rem]">
              <p className="opacity-50 text-[0.75rem] sm:text-[0.9rem]">
                {t('contactMe')}
              </p>
              <p>keith.dh@hotmail.com</p>
            </div>
          </div>

          <div>
            <p className="flex items-center gap-x-1 text-[1rem] sm:text-[1.25rem] font-bold mb-1.5 sm:mb-3">
              {t('career')}
            </p>
            <div className="mb-2 font-medium text-[0.85rem] sm:text-[1rem]">
              <p className="opacity-50 text-[0.75rem] sm:text-[0.9rem]">
                2024 - {t('present')}
              </p>
              <p>{t('douyin')}</p>
            </div>
            <div className="font-medium text-[0.85rem] sm:text-[1rem]">
              <p className="opacity-50 text-[0.75rem] sm:text-[0.9rem]">
                2023 - 2024
              </p>
              <p>{t('xhsStore')}</p>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 w-svw h-[12svh] mx-[-1.25rem]">
          <ProgressiveBlur height="100%" />
        </div>
      </AppLayout>
    </>
  )
}

export default About

export async function getServerSideProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'about', 'toast'])),
    },
  }
}
