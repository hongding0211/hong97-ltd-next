import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export default function AnimatedGradientText({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'group relative bg-white/40 duration-500 ease-out [--bg-size:300%] dark:bg-black/40',
        className,
      )}
    >
      <div
        className={`animate-gradient from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:var(--bg-size)_100%] p-[1px] ![mask-composite:subtract] [border-radius:inherit] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]`}
      />

      {children}
    </div>
  )
}
