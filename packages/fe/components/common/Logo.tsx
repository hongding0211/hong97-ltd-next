import Link from 'next/link'
import React from 'react'

export type LogoVariant = 'auto' | 'default' | 'development' | 'pride'

interface ILogo {
  width?: number
  className?: string
  enableLink?: boolean
  variant?: LogoVariant
}

const LOGO_WIDTH = 173
const LOGO_HEIGHT = 306
const TOP_LEFT_PATH = 'M80.5 68.576L0.5 1.07605V153.576L80.5 160.576V68.576Z'
const BOTTOM_LEFT_PATH = 'M80 160.576L0.5 192.076V261.076H80V208.076V160.576Z'
const BOTTOM_RIGHT_TAIL_PATH =
  'M172.254 207.321C172.351 208.402 172.434 209.487 172.5 210.576C175.9 266.921 136.329 301.086 85.9648 302.99L119 260.576L172.254 207.321Z'

const PRIDE_STRIPES = [
  '#e40303',
  '#ff8c00',
  '#ffed00',
  '#008026',
  '#24408e',
  '#732982',
]

const LogoShape: React.FC<{ fill?: string }> = ({ fill }) => (
  <>
    <path d={TOP_LEFT_PATH} fill={fill} />
    <circle cx="122" cy="110.076" r="50.5" fill={fill} />
    <path d={BOTTOM_LEFT_PATH} fill={fill} />
    <circle cx="122" cy="210.076" r="50.5" fill={fill} />
    <path d={BOTTOM_RIGHT_TAIL_PATH} fill={fill} />
  </>
)

export function resolveLogoVariant(
  variant: LogoVariant,
): Exclude<LogoVariant, 'auto'> {
  if (variant !== 'auto') {
    return variant
  }

  if (process.env.NODE_ENV === 'development') {
    return 'development'
  }

  const month = new Date().getMonth()
  if (month === 5) {
    return 'pride'
  }

  return 'default'
}

const Logo: React.FC<ILogo> = ({
  width = 32,
  className,
  enableLink = true,
  variant = 'auto',
}) => {
  const w = width
  const h = (LOGO_HEIGHT / LOGO_WIDTH) * width
  const resolvedVariant = resolveLogoVariant(variant)
  const logoId = React.useId().replaceAll(':', '')
  const developmentPatternId = `hong97-development-logo-pattern-${logoId}`

  const content = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={w}
      height={h}
      viewBox={`0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}`}
      className={className}
    >
      {resolvedVariant === 'development' ? (
        <>
          <defs>
            <pattern
              id={developmentPatternId}
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-35)"
            >
              <rect width="24" height="48" fill="#facc15" />
              <rect x="24" width="24" height="48" fill="#171717" />
            </pattern>
          </defs>
          <LogoShape fill={`url(#${developmentPatternId})`} />
        </>
      ) : resolvedVariant === 'pride' ? (
        <>
          <defs>
            <linearGradient
              id={developmentPatternId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              {PRIDE_STRIPES.flatMap((color, index) => {
                const start = index / PRIDE_STRIPES.length
                const end = (index + 1) / PRIDE_STRIPES.length
                return [
                  <stop
                    key={`${color}-start`}
                    offset={start}
                    stopColor={color}
                  />,
                  <stop key={`${color}-end`} offset={end} stopColor={color} />,
                ]
              })}
            </linearGradient>
          </defs>
          <LogoShape fill={`url(#${developmentPatternId})`} />
        </>
      ) : (
        <LogoShape />
      )}
    </svg>
  )

  if (enableLink) {
    return <Link href="/">{content}</Link>
  }
  return content
}

export default Logo
