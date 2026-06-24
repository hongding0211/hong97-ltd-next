import {
  Battery,
  Clock3,
  Database,
  FileDown,
  HeartPulse,
  MapPinned,
  Settings2,
  ShieldCheck,
  UploadCloud,
  WifiOff,
} from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'

import StaticSiteFooter from '../../components/static-site-footer/StaticSiteFooter'

type Card = {
  title: string
  body: string
}

type PageCopy = {
  metaTitle: string
  eyebrow: string
  title: string
  intro: string
  effectiveDate: string
  privacyLink: string
  highlights: Card[]
  featuresEyebrow: string
  featuresTitle: string
  featuresIntro: string
  featureCards: Card[]
  syncEyebrow: string
  syncTitle: string
  syncIntro: string
  syncSteps: Card[]
  dataEyebrow: string
  dataTitle: string
  dataIntro: string
  dataCards: Card[]
  policyTitle: string
  policyBody: string
  policyPoints: string[]
  footer: string
  localePrefix: string
}

const COPY: Record<'en' | 'cn', PageCopy> = {
  en: {
    metaTitle: 'Pocket Telemetry App Guide',
    eyebrow: 'Pocket Telemetry',
    title: 'A personal record of what your iPhone observes.',
    intro:
      'Pocket Telemetry helps you keep a private timeline of useful signals from your iPhone, such as location, battery state, and health data you choose to allow. You can review the records on device, export them, or sync them to your own destination.',
    effectiveDate: 'Updated June 24, 2026',
    privacyLink: 'Read the full Privacy Policy',
    localePrefix: '',
    highlights: [
      {
        title: 'You choose what is recorded',
        body: 'The app asks for iOS permissions only when a feature needs them, and you can turn permissions off in iOS Settings or Apple Health.',
      },
      {
        title: 'Useful for a personal timeline',
        body: 'Pocket Telemetry is made for personal context, automation, experiments, and review. It is not a medical product or diagnosis tool.',
      },
      {
        title: 'Sync is optional',
        body: 'Nothing is sent just because the app is installed. Uploads happen only after you configure a destination and enable sync.',
      },
    ],
    featuresEyebrow: 'What it does',
    featuresTitle: 'Record the signals that matter to you',
    featuresIntro:
      'Pocket Telemetry focuses on a few practical data sources instead of trying to become a full health dashboard.',
    featureCards: [
      {
        title: 'Location history',
        body: 'Save location points so you can reconstruct movement, places visited, or time spent in different areas.',
      },
      {
        title: 'Device state',
        body: 'Track simple phone conditions such as battery level, charging state, Low Power Mode, and thermal state.',
      },
      {
        title: 'Health data you allow',
        body: 'Read selected Apple Health data only after you grant permission. You decide which health categories are available to the app.',
      },
      {
        title: 'Export and review',
        body: 'Inspect records in the app and export data when you want to analyze it elsewhere or keep your own archive.',
      },
    ],
    syncEyebrow: 'Auto Sync',
    syncTitle: 'Automatic when you want it, quiet when you do not',
    syncIntro:
      'Auto Sync is designed for personal workflows where the phone records data during the day and sends it later to a destination you control.',
    syncSteps: [
      {
        title: 'Choose a destination',
        body: 'Add your sync URL and token if your server requires one. This can be a personal server, a test collector, or another private endpoint.',
      },
      {
        title: 'Pick a rhythm',
        body: 'Use manual sync when you want full control, or choose hourly or daily sync for routine background uploads.',
      },
      {
        title: 'Network can fail safely',
        body: 'If the phone is offline or a request fails, the app keeps local records available so a later sync can try again.',
      },
    ],
    dataEyebrow: 'Data',
    dataTitle: 'Simple records, easy to inspect',
    dataIntro:
      'The app keeps data in practical categories. Exact fields may evolve, but the intent stays the same: make personal records readable, exportable, and syncable.',
    dataCards: [
      {
        title: 'Location',
        body: 'Time, latitude and longitude, accuracy, altitude when available, and movement-related values reported by iOS.',
      },
      {
        title: 'Battery',
        body: 'Battery percentage, charging status, Low Power Mode, and basic thermal condition.',
      },
      {
        title: 'Health',
        body: 'Health categories you explicitly authorize through Apple Health permissions.',
      },
      {
        title: 'Sync batches',
        body: 'When sync is enabled, selected records are grouped into upload batches so your destination can receive them consistently.',
      },
    ],
    policyTitle: 'Privacy in short',
    policyBody:
      'Pocket Telemetry records only what you enable. Data is not used for ads, sold, rented, traded, or used for cross-app tracking.',
    policyPoints: [
      'Permissions can be revoked in iOS Settings or Apple Health.',
      'Sync sends selected records only to a destination you configure.',
      'The full policy is available as a separate page for App Store review and user reference.',
    ],
    footer:
      'Pocket Telemetry is a personal data utility, not a medical device.',
  },
  cn: {
    metaTitle: 'Pocket Telemetry App 介绍',
    eyebrow: 'Pocket Telemetry',
    title: '把 iPhone 观察到的信息，变成你自己的个人记录。',
    intro:
      'Pocket Telemetry 可以帮你记录 iPhone 上有用的信号，例如位置、电量状态，以及你允许读取的健康数据。你可以在手机上查看这些记录，也可以导出，或同步到自己选择的目的地。',
    effectiveDate: '更新日期：2026 年 6 月 24 日',
    privacyLink: '查看完整 Privacy Policy',
    localePrefix: '/cn',
    highlights: [
      {
        title: '你决定记录什么',
        body: 'App 只会在功能需要时请求 iOS 权限。你可以随时在系统设置或 Apple 健康里关闭权限。',
      },
      {
        title: '适合做个人时间线',
        body: '它适合个人回顾、自动化、实验和数据整理。它不是医疗产品，也不提供诊断。',
      },
      {
        title: '同步是可选的',
        body: '安装 App 本身不会自动把数据发出去。只有你配置目的地并开启同步后，才会上传。',
      },
    ],
    featuresEyebrow: '功能',
    featuresTitle: '记录对你有用的信号',
    featuresIntro:
      'Pocket Telemetry 不试图做成一个完整健康面板，而是专注记录几个适合个人回顾和自动化使用的数据来源。',
    featureCards: [
      {
        title: '位置记录',
        body: '保存位置点，方便之后回看移动轨迹、到访地点，或不同区域停留的大致时间。',
      },
      {
        title: '设备状态',
        body: '记录手机的一些简单状态，例如电量、是否充电、低电量模式和温度状态。',
      },
      {
        title: '你授权的健康数据',
        body: '只有在你通过 Apple 健康授权后，App 才能读取对应健康类别。哪些类别可读由你决定。',
      },
      {
        title: '查看与导出',
        body: '你可以在 App 内查看记录，也可以在需要时导出数据，用于分析或自己留档。',
      },
    ],
    syncEyebrow: 'Auto Sync',
    syncTitle: '需要时自动同步，不需要时保持安静',
    syncIntro:
      'Auto Sync 适合这样的个人工作流：手机白天持续记录，之后按你选择的节奏，把数据发到你自己的目的地。',
    syncSteps: [
      {
        title: '选择同步目的地',
        body: '填写你的同步地址；如果服务器需要 token，也可以一起填写。目的地可以是个人服务器、测试采集器或其他私有服务。',
      },
      {
        title: '选择同步节奏',
        body: '如果想完全手动控制，可以使用手动同步；如果希望日常自动发送，可以选择每小时或每天同步。',
      },
      {
        title: '网络失败不会丢记录',
        body: '如果手机离线或请求失败，App 会保留本地记录，后面可以再次尝试同步。',
      },
    ],
    dataEyebrow: '数据',
    dataTitle: '数据结构尽量简单，方便查看和导出',
    dataIntro:
      'App 会把记录按实际用途分成几个类别。具体字段可能随版本演进，但目标不变：让个人记录容易读取、导出和同步。',
    dataCards: [
      {
        title: '位置',
        body: '时间、经纬度、精度、可用时的海拔，以及 iOS 提供的移动相关信息。',
      },
      {
        title: '电量',
        body: '电量百分比、充电状态、低电量模式，以及基础温度状态。',
      },
      {
        title: '健康',
        body: '你通过 Apple 健康明确授权的健康类别。',
      },
      {
        title: '同步批次',
        body: '开启同步后，App 会把选定记录整理成批次发送，方便你的接收端稳定处理。',
      },
    ],
    policyTitle: '隐私简述',
    policyBody:
      'Pocket Telemetry 只记录你开启的内容。数据不会用于广告，不会被出售、出租、交易，也不会用于跨 App 追踪。',
    policyPoints: [
      '你可以在 iOS 设置或 Apple 健康中撤销权限。',
      '同步只会把选定记录发送到你配置的目的地。',
      '完整政策单独成页，方便 App Store 审核和用户查看。',
    ],
    footer: 'Pocket Telemetry 是个人数据工具，不是医疗器械。',
  },
}

const highlightIcons = [ShieldCheck, MapPinned, UploadCloud]
const featureIcons = [MapPinned, Battery, HeartPulse, FileDown]
const syncIcons = [Settings2, Clock3, WifiOff]
const dataIcons = [MapPinned, Battery, HeartPulse, Database]

export default function PocketTelemetryStatic({
  copy,
  currentYear,
  locale,
}: {
  copy: PageCopy
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
      <main className="box-border min-h-screen w-full overflow-hidden bg-[#f7f8f8] text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <section className="relative border-b border-neutral-200/80 bg-[#edf4f1] px-4 pb-10 pt-8 dark:border-neutral-800 dark:bg-neutral-900 sm:px-8 sm:pb-16 sm:pt-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600 dark:text-neutral-400 sm:text-sm">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 max-w-3xl text-[2.5rem] font-semibold leading-[1.05] text-neutral-950 dark:text-neutral-50 sm:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-700 dark:text-neutral-300 sm:text-lg">
                {copy.intro}
              </p>
              <div className="mt-5 flex flex-col gap-3 text-sm text-neutral-500 dark:text-neutral-400 sm:flex-row sm:items-center">
                <span>{copy.effectiveDate}</span>
                <a
                  className="font-medium text-emerald-700 underline decoration-emerald-700/30 underline-offset-4 dark:text-emerald-300"
                  href={`${copy.localePrefix}/privacy/pocket-telemetry`}
                >
                  {copy.privacyLink}
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {copy.highlights.map((item, index) => {
                const Icon = highlightIcons[index] ?? ShieldCheck
                return (
                  <article
                    key={item.title}
                    className="rounded-lg border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60"
                  >
                    <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    <h2 className="mt-3 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                      {item.body}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                {copy.featuresEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-4xl">
                {copy.featuresTitle}
              </h2>
              <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
                {copy.featuresIntro}
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {copy.featureCards.map((card, index) => {
                const Icon = featureIcons[index] ?? Database
                return (
                  <article
                    key={card.title}
                    className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                      {card.body}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-neutral-200 bg-white px-4 py-10 dark:border-neutral-800 dark:bg-neutral-900 sm:px-8 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">
                {copy.syncEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-4xl">
                {copy.syncTitle}
              </h2>
              <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
                {copy.syncIntro}
              </p>
            </div>

            <div className="grid gap-4">
              {copy.syncSteps.map((step, index) => {
                const Icon = syncIcons[index] ?? Clock3
                return (
                  <article
                    key={step.title}
                    className="grid grid-cols-[auto_1fr] gap-4 rounded-lg border border-neutral-200 bg-[#f8faf9] p-5 dark:border-neutral-800 dark:bg-neutral-950"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        {step.body}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-400">
                  {copy.dataEyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-semibold sm:text-4xl">
                  {copy.dataTitle}
                </h2>
                <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
                  {copy.dataIntro}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {copy.dataCards.map((card, index) => {
                  const Icon = dataIcons[index] ?? Database
                  return (
                    <article
                      key={card.title}
                      className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <Icon className="h-5 w-5 text-violet-700 dark:text-violet-300" />
                      <h3 className="mt-4 text-base font-semibold">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        {card.body}
                      </p>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-neutral-950 text-neutral-50 dark:border-neutral-800">
          <div className="px-4 py-10 sm:px-8 sm:py-14">
            <div className="mx-auto max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">
                Privacy Policy
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-4xl">
                {copy.policyTitle}
              </h2>
              <p className="mt-4 text-base leading-7 text-neutral-300">
                {copy.policyBody}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {copy.policyPoints.map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-neutral-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <footer className="mt-8 flex flex-col gap-3 text-sm leading-6 text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
                <span>{copy.footer}</span>
                <a
                  className="font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-4"
                  href={`${copy.localePrefix}/privacy/pocket-telemetry`}
                >
                  {copy.privacyLink}
                </a>
              </footer>
            </div>
          </div>
          <StaticSiteFooter
            currentYear={currentYear}
            locale={locale}
            tone="dark"
          />
        </section>
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
