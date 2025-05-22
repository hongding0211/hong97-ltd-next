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
      <AppLayout authRequired={meta.authRequired}>
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
