import { Skeleton } from '@/components/ui/skeleton'
import dayjs from 'dayjs'
import Head from 'next/head'
import React from 'react'
// import { useTranslation } from 'react-i18next'
import { IBlogConfig } from '../../types/blog'
import AppLayout from '../app-layout/AppLayout'
import MdxLayout from '../mdx-layout'

interface IBlogContainer {
  children: React.ReactNode
  meta: IBlogConfig
}

export const BlogContainer: React.FC<IBlogContainer> = (props) => {
  const { children, meta } = props

  // const { t, i18n } = useTranslation('common')
  // const currentLang = i18n.language

  return (
    <>
      <Head>
        <title>{meta.title}</title>
      </Head>
      <AppLayout authRequired={meta.authRequired} simplifiedFooter>
        {meta.coverImg && (
          <div className="relative w-dvw mx-[-1.25rem] aspect-[2/1] md:aspect-[3/1] lg:aspect-[4/1] mb-8 md:mb-12 lg:mb-16">
            <Skeleton className="w-full h-full absolute rounded-sm sm:rounded-none" />
            {/* biome-ignore lint/a11y/useAltText: <explanation> */}
            <img
              src={meta.coverImg}
              className="w-full h-full object-cover rounded-sm sm:rounded-none absolute top-0 left-0"
            />
          </div>
        )}
        <div className="m-auto max-w-[1000px] mt-[-1.5rem] flex justify-center">
          <MdxLayout>
            <h2 className="mb-2">{meta.title}</h2>
            <figcaption className="m-0 !mt-1 text-sm">
              {dayjs(meta.time).format('MMM DD, YYYY')}
              {meta.keywords?.length && <span> | </span>}
              {meta.keywords?.map((k, _i) => (
                <span key={k}>{` #${k}`}</span>
              ))}
            </figcaption>
            {children}
          </MdxLayout>
        </div>
      </AppLayout>
    </>
  )
}
