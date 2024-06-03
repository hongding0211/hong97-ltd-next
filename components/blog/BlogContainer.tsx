import React from 'react'
import AppLayout from '../app-layout/AppLayout'
import MdxLayout from '../mdx-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useTranslation } from 'react-i18next'

interface IBlogContainer {
  children: React.ReactNode
  title: string
}

export const BlogContainer: React.FC<IBlogContainer> = (props) => {
  const { children, title } = props

  const { t, i18n } = useTranslation('common')
  const currentLang = i18n.language

  return (
    <AppLayout>
      <Breadcrumb className="my-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${currentLang}/blog`}>
              {t('nav.blog')}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <MdxLayout>
        <h1>{title}</h1>
        {children}
      </MdxLayout>
    </AppLayout>
  )
}
