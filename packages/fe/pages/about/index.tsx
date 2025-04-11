import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'

import BlurFade from '@/components/magicui/blur-fade'
import { cn } from '@/lib/utils'
import AppLayout from '../../components/app-layout/AppLayout'
import AnimatedGradientText from '../../components/magicui/animated-gradient-text'

const CatsImgs = [
  '/img/cat0.jpeg',
  '/img/cat1.jpeg',
  '/img/cat2.jpeg',
  '/img/cat3.jpeg',
]

function About() {
  const { t } = useTranslation('about')

  return (
    <>
      <Head>
        <title>{t('title')}</title>
      </Head>
      <AppLayout>
        <article className="prose prose-sm prose-neutral dark:prose-invert sm:prose-base lg:prose-lg mb-6 sm:mx-auto sm:mb-12">
          <img src="/img/cover.jpeg" alt="me" className="rounded" />

          <div className="mb-6 mt-12 sm:mb-12 sm:mt-24">
            <BlurFade inView>
              <AnimatedGradientText>
                <h1
                  className={cn(
                    'animate-gradient inline bg-gradient-to-r from-[#007BFF] via-[#00fbff] to-[#007BFF] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent',
                  )}
                >
                  {t('title')}
                </h1>
              </AnimatedGradientText>
            </BlurFade>
          </div>
          <BlurFade delay={0.25}>
            <h2>{t('p1')}</h2>
          </BlurFade>
          <BlurFade delay={0.5}>
            <h2>{t('p2')}</h2>
          </BlurFade>
          <BlurFade delay={0.75}>
            <h2>{t('p3')}</h2>
          </BlurFade>
          <figure>
            <Carousel
              opts={{
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 3000,
                }),
              ]}
            >
              <CarouselContent>
                {CatsImgs.map((src, index) => (
                  <CarouselItem key={src}>
                    <img
                      src={src}
                      alt={`cat-${index}`}
                      className="!my-0 rounded"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            <figcaption>{t('c1')}</figcaption>
          </figure>
          {/* <h2>{t('h2')}</h2>
          <p>{t('p4')}</p> */}
        </article>
      </AppLayout>
    </>
  )
}

export default About

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'about', 'toast'])),
    },
  }
}
