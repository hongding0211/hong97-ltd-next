import NumberTicker from '@/components/ui/number-ticker'
import { useEffect, useRef } from 'react'
import { Images } from '../common/images'
import confetti from 'canvas-confetti'

export const TLDR = () => {
  return (
    <>
      <h5>
        我的 Model 3 在没有刹车的情况下，🔰 安全行驶了{' '}
        <NumberTicker
          className="text-green-600 dark:text-green-400"
          value={22382}
        />{' '}
        km。
      </h5>
      <h5>
        高贵的 💎 iCloud 2TB 服务，帮助我存储了{' '}
        <NumberTicker
          className="text-blue-500 dark:text-blue-500"
          value={6305}
        />{' '}
        张照片和视频，占所有照片的 12.87%。
      </h5>
      <h5>
        靠着双脚，一共 🗼 到访了{' '}
        <span className="text-rose-500 dark:text-rose-500">9</span> 座城市。
      </h5>
      <h5>
        购入新的 ⚡ 电子设备{' '}
        <span className="text-amber-600 dark:text-amber-500">10</span> 件，其中
        Apple 产品占 2 件，
      </h5>
      <h5>为 Apple 的 ♻️ 碳中和使命，做了亿点微小的贡献。</h5>
    </>
  )
}

export const Imgs0 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/IMG_2347 Medium.jpeg',
          alt: 'nikon z6ii',
        },
      ]}
    />
  )
}

export const Imgs1 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/IMG_2367 Medium.jpeg',
          alt: 'mehaa0',
        },
        {
          src: '/img/IMG_2400 Medium.jpeg',
          alt: 'mehaa1',
        },
      ]}
    />
  )
}

export const Imgs2 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/DSC_0687 Medium.jpeg',
          alt: 'mehaa at sea 0',
        },
        {
          src: '/img/DSC_0685 Medium.jpeg',
          alt: 'mehaa at sea 0',
        },
      ]}
      caption="也算是 🐱 生照片了"
    />
  )
}

export const Imgs3 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/IMG_2454 Medium.jpeg',
          alt: 'fz0',
        },
        {
          src: '/img/IMG_2488 Medium.jpeg',
          alt: 'fz1',
        },
      ]}
    />
  )
}

export const Imgs4 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/IMG_4392 Medium.jpeg',
          alt: 'tl0',
        },
        {
          src: '/img/IMG_4337 Medium.jpeg',
          alt: 'tl1',
        },
        {
          src: '/img/IMG_4362 Medium.jpeg',
          alt: 'tl2',
        },
      ]}
    />
  )
}

export const Imgs5 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/IMG_4403 Medium.jpeg',
          alt: 'tl3',
        },
      ]}
    />
  )
}

export const Imgs6 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/20240801_145644.jpg',
          alt: 'xhs-t-shirt',
        },
        {
          src: '/img/wx_camera_1722598591872.jpg',
          alt: 'xhs-82',
        },
      ]}
      caption="小红书传统，一周年赠送带有姓名和编号的 T 恤"
    />
  )
}

export const Imgs7 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/mmexport1726202905331.jpg',
          alt: 'bd',
        },
      ]}
    />
  )
}

export const Imgs8 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/IMG_5715 Large.jpeg',
          alt: 'tv',
        },
        {
          src: '/img/IMG_5754 Large.jpeg',
          alt: 'charger',
        },
      ]}
    />
  )
}

export const Imgs9 = () => {
  return (
    <Images
      imgs={[
        {
          src: '/img/IMG_5907 Large.jpeg',
          alt: 'tv',
        },
      ]}
    />
  )
}

export const End = () => {
  const h3Ref = useRef<HTMLHeadingElement>(null)
  const fired = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            entry.intersectionRatio === 1 &&
            !fired.current
          ) {
            // fired.current = true;
            const duration = 5 * 1000
            const animationEnd = Date.now() + duration
            const defaults = {
              startVelocity: 30,
              spread: 360,
              ticks: 60,
              zIndex: 0,
            }

            const randomInRange = (min: number, max: number) =>
              Math.random() * (max - min) + min

            const interval = window.setInterval(() => {
              const timeLeft = animationEnd - Date.now()

              if (timeLeft <= 0) {
                return clearInterval(interval)
              }

              const particleCount = 50 * (timeLeft / duration)
              confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
              })
              confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
              })
            }, 250)
          }
        })
      },
      { threshold: 1.0 }, // 1.0 表示元素完全可见时触发
    )

    if (h3Ref.current) {
      observer.observe(h3Ref.current)
    }
  }, [])

  return (
    <div
      style={{
        height: 150,
        width: 300,
        position: 'relative',
      }}
    >
      <h3 ref={h3Ref} style={{ paddingTop: 50 }}>
        Thanks!
      </h3>
    </div>
  )
}
