import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'

import StaticSiteFooter from '../../components/static-site-footer/StaticSiteFooter'

type PolicyCopy = {
  metaTitle: string
  title: string
  intro: string
  effectiveDate: string
  sections: Array<{
    title: string
    body: string
  }>
  footer: string
  productLink: string
  localePrefix: string
}

const COPY: Record<'en' | 'cn', PolicyCopy> = {
  en: {
    metaTitle: 'Pocket Telemetry Privacy Policy',
    title: 'Privacy Policy',
    intro:
      'Pocket Telemetry records sensitive personal information only when you enable the related feature. This policy explains what the app may record, how it is used, and what stays under your control.',
    effectiveDate: 'Effective date: June 24, 2026',
    productLink: 'Pocket Telemetry app overview',
    localePrefix: '',
    sections: [
      {
        title: 'Permissions',
        body: 'The app may request Location, Background Location, and Apple Health permissions for features you choose to use. You can revoke these permissions at any time in iOS Settings or the Apple Health app.',
      },
      {
        title: 'Data the app may record',
        body: 'Pocket Telemetry may record location points, basic device state such as battery and charging status, and Apple Health data categories you explicitly authorize.',
      },
      {
        title: 'How data is used',
        body: 'The app uses recorded data to show your personal timeline, support export, and sync selected records to a destination you configure.',
      },
      {
        title: 'Storage, export, and sync',
        body: 'Records and settings may remain on your iPhone until you clear them, reset the app, delete the app, or erase the device. Exported files and configured sync destinations are handled by the places you choose to send data.',
      },
      {
        title: 'No advertising or sale',
        body: 'Pocket Telemetry does not sell, rent, trade, or use your location, health, or device records for advertising or cross-app tracking.',
      },
      {
        title: 'Health and safety',
        body: 'Pocket Telemetry is not a medical device and does not provide medical advice, diagnosis, treatment, prevention, emergency monitoring, or health alerts.',
      },
      {
        title: 'Children',
        body: 'Pocket Telemetry is not directed to children under 13.',
      },
      {
        title: 'Contact',
        body: 'For privacy questions, contact keith.dh@hotmail.com.',
      },
    ],
    footer: 'This policy may be updated as Pocket Telemetry changes.',
  },
  cn: {
    metaTitle: 'Pocket Telemetry 隐私政策',
    title: 'Privacy Policy',
    intro:
      'Pocket Telemetry 只会在你开启相关功能后记录敏感个人信息。本政策说明 App 可能记录什么、这些数据如何使用，以及哪些内容由你控制。',
    effectiveDate: '生效日期：2026 年 6 月 24 日',
    productLink: '查看 Pocket Telemetry 介绍页',
    localePrefix: '/cn',
    sections: [
      {
        title: '权限',
        body: 'App 可能会为你选择使用的功能请求位置、后台位置和 Apple 健康权限。你可以随时在 iOS 设置或 Apple 健康 App 中撤销这些权限。',
      },
      {
        title: 'App 可能记录的数据',
        body: 'Pocket Telemetry 可能记录位置点、电量和充电状态等基础设备状态，以及你明确授权的 Apple 健康数据类别。',
      },
      {
        title: '数据如何使用',
        body: 'App 使用记录的数据来展示你的个人时间线、支持导出，并在你配置同步目的地后发送选定记录。',
      },
      {
        title: '存储、导出与同步',
        body: '记录和设置可能保存在你的 iPhone 上，直到你清除数据、重置 App、删除 App 或抹掉设备。导出的文件和同步目的地由你选择，对应位置会按自己的规则处理数据。',
      },
      {
        title: '无广告和数据出售',
        body: 'Pocket Telemetry 不会出售、出租、交易你的定位、健康或设备记录，也不会把这些数据用于广告或跨 App 追踪。',
      },
      {
        title: '健康与安全',
        body: 'Pocket Telemetry 不是医疗器械，不提供医学建议、诊断、治疗、预防、紧急监测或健康提醒。',
      },
      {
        title: '儿童',
        body: 'Pocket Telemetry 并非面向 13 岁以下儿童。',
      },
      {
        title: '联系',
        body: '如有隐私问题，请联系 keith.dh@hotmail.com。',
      },
    ],
    footer: '本政策可能会随着 Pocket Telemetry 的功能变化而更新。',
  },
}

export default function PocketTelemetryPrivacy({
  copy,
  currentYear,
  locale,
}: {
  copy: PolicyCopy
  currentYear: number
  locale: string
}) {
  return (
    <>
      <Head>
        <title>{copy.metaTitle}</title>
        <meta name="description" content={copy.intro} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>
      <main className="min-h-screen bg-[#f7f8f8] text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <article className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            Pocket Telemetry
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-base leading-7 text-neutral-700 dark:text-neutral-300 sm:text-lg">
            {copy.intro}
          </p>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            {copy.effectiveDate}
          </p>

          <div className="mt-10 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {copy.sections.map((section) => (
              <section key={section.title} className="p-5 sm:p-6">
                <h2 className="text-lg font-semibold">{section.title}</h2>
                <p className="mt-2 text-base leading-7 text-neutral-600 dark:text-neutral-300">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <footer className="mt-8 flex flex-col gap-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
            <span>{copy.footer}</span>
            <a
              className="font-medium text-emerald-700 underline decoration-emerald-700/30 underline-offset-4 dark:text-emerald-300"
              href={`${copy.localePrefix}/static/pocket-telemetry`}
            >
              {copy.productLink}
            </a>
          </footer>
        </article>
        <StaticSiteFooter currentYear={currentYear} locale={locale} />
      </main>
    </>
  )
}

export async function getStaticProps({ locale }: { locale?: string }) {
  const normalizedLocale = locale === 'cn' ? 'cn' : 'en'

  return {
    props: {
      ...(await serverSideTranslations(normalizedLocale, ['toast'])),
      copy: COPY[normalizedLocale],
      currentYear: new Date().getFullYear(),
      locale: normalizedLocale,
    },
  }
}
