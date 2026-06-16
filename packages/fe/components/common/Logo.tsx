import Link from 'next/link'
import React from 'react'

type LogoVariant = 'auto' | 'default' | 'pride'

interface ILogo {
  width?: number
  className?: string
  enableLink?: boolean
  variant?: LogoVariant
}

const LOGO_PATH =
  'M14.933 29.867v3.731c1.639-2.188 4.268-3.639 7.267-3.717 2.55-.14 5.048.75 6.902 2.458 1.855 1.708 2.903 4.083 2.898 6.566v1.975c0 8.449-7.047 15.298-15.74 15.298l6.441-8.235c-3.178.083-6.027-1.395-7.768-3.717v4.485H0V35.707l14.933-5.84zM0 0l14.933 12.645v2.29a9.422 9.422 0 110 11.019v3.913L0 28.559V0z'

const PRIDE_STRIPES = [
  '#e40303',
  '#ff8c00',
  '#ffed00',
  '#008026',
  '#24408e',
  '#732982',
]

function resolveLogoVariant(
  variant: LogoVariant,
): Exclude<LogoVariant, 'auto'> {
  if (variant !== 'auto') {
    return variant
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
  const h = (57 / 32) * width
  const resolvedVariant = resolveLogoVariant(variant)

  const content = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={w}
      height={h}
      viewBox="0 0 32 57"
      className={className}
    >
      {resolvedVariant === 'pride' ? (
        <>
          <defs>
            <clipPath id="hong97-pride-logo-clip">
              <path d={LOGO_PATH} />
            </clipPath>
          </defs>
          <g clipPath="url(#hong97-pride-logo-clip)">
            {PRIDE_STRIPES.map((color, index) => (
              <rect
                key={color}
                x="0"
                y={(57 / PRIDE_STRIPES.length) * index}
                width="32"
                height={57 / PRIDE_STRIPES.length}
                fill={color}
              />
            ))}
          </g>
        </>
      ) : (
        <path d={LOGO_PATH} />
      )}
    </svg>
  )

  if (enableLink) {
    return <Link href="/">{content}</Link>
  }
  return content
}

export default Logo
