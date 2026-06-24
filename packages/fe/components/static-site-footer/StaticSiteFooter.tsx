type StaticSiteFooterProps = {
  currentYear: number
  locale?: string
  tone?: 'light' | 'dark'
}

export default function StaticSiteFooter({
  currentYear,
  locale,
  tone = 'light',
}: StaticSiteFooterProps) {
  const isDark = tone === 'dark'

  return (
    <footer
      className={
        isDark
          ? 'px-4 pb-5 text-xs font-light text-neutral-500 sm:px-8'
          : 'px-4 pb-5 text-xs font-light text-neutral-500 dark:text-neutral-500 sm:px-8'
      }
    >
      <div
        className={
          isDark
            ? 'mx-auto mb-3 h-px max-w-6xl bg-white/10'
            : 'mx-auto mb-3 h-px max-w-6xl bg-neutral-200 dark:bg-neutral-800'
        }
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-y-0.5">
        <p className="flex w-max items-center gap-1">
          <span>Copyright © {currentYear} hong97.ltd.</span>
          {locale === 'cn' && (
            <a
              href="https://beian.miit.gov.cn/#/Integrated/index"
              target="_blank"
              rel="noreferrer"
              className="hidden cursor-pointer hover:underline sm:block"
            >
              沪 ICP 备 2022003448 号
            </a>
          )}
        </p>
      </div>
    </footer>
  )
}
