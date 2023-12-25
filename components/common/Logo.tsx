import Link from 'next/link'
import React from 'react'

interface ILogo {
  width?: number
  className?: string
}

const Logo: React.FC<ILogo> = ({ width = 32, className }) => {
  const w = width
  const h = (57 / 32) * width

  return (
    <Link href="/">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={w}
        height={h}
        viewBox="0 0 32 57"
        className={className}
      >
        <g>
          <path d="M14.933 29.867v3.731c1.639-2.188 4.268-3.639 7.267-3.717 2.55-.14 5.048.75 6.902 2.458 1.855 1.708 2.903 4.083 2.898 6.566v1.975c0 8.449-7.047 15.298-15.74 15.298l6.441-8.235c-3.178.083-6.027-1.395-7.768-3.717v4.485H0V35.707l14.933-5.84zM0 0l14.933 12.645v2.29a9.422 9.422 0 110 11.019v3.913L0 28.559V0z" />
        </g>
      </svg>
    </Link>
  )
}

export default Logo
