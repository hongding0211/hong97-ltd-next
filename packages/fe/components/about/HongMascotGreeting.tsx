import { TypingAnimation } from '@/components/ui/typing-animation'
import cx from 'classnames'
import { useRouter } from 'next/router'
import { type PointerEvent, useEffect, useRef, useState } from 'react'

import styles from './HongMascotGreeting.module.css'

const H_PATH =
  'M78.604 55.089L33.604 23.3492C19.6926 13.5371 0.5 23.4863 0.5 40.51V119.116C0.5 130.12 8.99375 139.258 19.968 140.06L64.968 143.352C77.1369 144.242 87.5 134.609 87.5 122.408V72.2498C87.5 65.4237 84.1822 59.0235 78.604 55.089Z'
const N_PATH =
  'M61.4385 12.658L14.4385 31.5078C5.71668 35.0058 0 43.4578 0 52.855V96C0 108.703 10.2975 119 23 119H70C82.7026 119 93 108.703 93 96V56.2438V34.0052C93 17.7245 76.5492 6.59774 61.4385 12.658Z'
const G_TAIL_PATH =
  'M100.754 47.7451C100.851 48.8257 100.934 49.9107 101 51C104.4 107.345 64.8286 141.51 14.4648 143.414L47.5 101L100.754 47.7451Z'

const pieces = {
  H: {
    viewBox: '0 0 88 145',
    center: { x: 44, y: 72.5 },
    face: { x: 44, y: 75, scale: 4 },
    offsetY: -34,
    scale: 0.88,
  },
  O: {
    viewBox: '0 0 114 114',
    center: { x: 57, y: 57 },
    face: { x: 57, y: 57, scale: 5.1 },
    offsetY: 0,
    scale: 1,
  },
  N: {
    viewBox: '0 0 93 119',
    center: { x: 46.5, y: 59.5 },
    face: { x: 46.5, y: 64, scale: 4.3 },
    offsetY: -18,
    scale: 0.94,
  },
  G: {
    viewBox: '0 0 102 146',
    center: { x: 51, y: 73 },
    face: { x: 50.5, y: 50.5, scale: 4.5 },
    offsetY: -8,
    scale: 0.92,
  },
} as const

type Piece = keyof typeof pieces
type Motion = 'thinking' | 'wink' | 'wide' | 'sleep' | 'play' | 'orbit'

const motions: Motion[] = ['thinking', 'wink', 'wide', 'sleep', 'play', 'orbit']

const copyLibrary: Record<Motion, readonly { en: string; cn: string }[]> = {
  thinking: [
    { en: 'Let me think...', cn: '让我想想...' },
    { en: 'One second...', cn: '等我一下...' },
    { en: 'Connecting dots...', cn: '正在理清思路...' },
    { en: 'Hmm...', cn: '嗯...' },
    { en: 'Let me check...', cn: '我看看...' },
    { en: 'Almost there...', cn: '快好了...' },
    { en: 'Working on it...', cn: '正在处理...' },
    { en: 'Give me a beat...', cn: '稍等一下...' },
  ],
  wink: [
    { en: 'I see you.', cn: '我懂你的意思。' },
    { en: 'Got it.', cn: '收到。' },
    { en: "We're good.", cn: '没问题。' },
    { en: 'Say no more.', cn: '懂了。' },
    { en: 'On it.', cn: '交给我。' },
    { en: 'You got it.', cn: '包在我身上。' },
    { en: 'Nice one.', cn: '这主意不错。' },
    { en: 'Leave it to me.', cn: '放心吧。' },
  ],
  wide: [
    { en: 'Oh?', cn: '哦？' },
    { en: 'Wait, really?', cn: '等等，真的？' },
    { en: "Didn't expect that.", cn: '有点意外。' },
    { en: 'No way?', cn: '不会吧？' },
    { en: 'Well, hello.', cn: '哎呀，你好。' },
    { en: "That's new.", cn: '这倒新鲜。' },
    { en: 'Plot twist?', cn: '反转了？' },
    { en: "Now I'm curious.", cn: '有点好奇。' },
  ],
  sleep: [
    { en: 'Quick nap...', cn: '先眯一会...' },
    { en: 'Back in a bit...', cn: '马上回来...' },
    { en: 'Low battery...', cn: '电量不足...' },
    { en: 'Five more minutes...', cn: '再睡五分钟...' },
    { en: 'Eyes closed...', cn: '眼睛闭上了...' },
    { en: 'Do not disturb...', cn: '请勿打扰...' },
    { en: 'Dreaming...', cn: '做梦中...' },
    { en: 'Wake me soon...', cn: '记得叫我...' },
  ],
  play: [
    { en: 'Hey!', cn: '你好！' },
    { en: 'Hi, welcome.', cn: '嗨，欢迎来。' },
    { en: 'Good to see you.', cn: '又见面了。' },
    { en: 'Hello!', cn: '哈喽！' },
    { en: 'Nice to meet you.', cn: '很高兴见到你。' },
    { en: 'Welcome!', cn: '欢迎！' },
    { en: 'Good timing.', cn: '来得正好。' },
    { en: 'Here we go.', cn: '出发吧。' },
  ],
  orbit: [
    { en: 'Looking around.', cn: '四处看看。' },
    { en: 'One more lap.', cn: '再绕一圈。' },
    { en: 'Still in orbit.', cn: '保持运转。' },
    { en: 'Taking a look.', cn: '看一圈。' },
    { en: 'Making the rounds.', cn: '正在巡游。' },
    { en: 'Still moving.', cn: '继续转动。' },
    { en: 'Checking the edges.', cn: '看看边缘。' },
    { en: 'Back around.', cn: '又绕回来了。' },
  ],
}

function shuffle<T>(values: readonly T[]) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function drawMotion(queue: Motion[], previous?: Motion) {
  if (queue.length === 0) {
    queue.push(...shuffle(motions))
    if (previous && queue[0] === previous && queue.length > 1) {
      ;[queue[0], queue[1]] = [queue[1], queue[0]]
    }
  }
  return queue.shift() as Motion
}

function randomPhraseOrder(motion: Motion) {
  return shuffle(copyLibrary[motion].map((_, index) => index))
}

function PieceArtwork({ piece }: { piece: Piece }) {
  switch (piece) {
    case 'H':
      return <path d={H_PATH} />
    case 'O':
      return <circle cx="57" cy="57" r="57" />
    case 'N':
      return <path d={N_PATH} />
    case 'G':
      return (
        <>
          <circle cx="50.5" cy="50.5" r="50.5" />
          <path d={G_TAIL_PATH} />
        </>
      )
  }
}

function HongMascot({ piece, motion }: { piece: Piece; motion: Motion }) {
  const [gaze, setGaze] = useState({ x: 0, y: 0 })
  const geometry = pieces[piece]
  const { center, face } = geometry
  const rootTransform = `translate(0 ${geometry.offsetY}) translate(${
    center.x
  } ${center.y}) scale(${geometry.scale}) translate(${-center.x} ${-center.y})`

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch') return
    const box = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width - 0.5) * 2
    const y = ((event.clientY - box.top) / box.height - 0.5) * 2
    setGaze({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    })
  }

  return (
    <svg
      aria-hidden="true"
      className={styles.mascot}
      data-motion={motion}
      data-shape={piece}
      onPointerLeave={() => setGaze({ x: 0, y: 0 })}
      onPointerMove={handlePointerMove}
      viewBox={geometry.viewBox}
    >
      <g className={styles.character}>
        <g transform={rootTransform}>
          <g className={styles.body}>
            <PieceArtwork piece={piece} />
          </g>
          <g
            className={styles.face}
            transform={`translate(${face.x + gaze.x * 3.6} ${
              face.y + gaze.y * 2.8
            }) scale(${face.scale})`}
          >
            <g className={styles.eyePair}>
              <g transform="translate(0.71225 -0.51516) rotate(-13)">
                <rect
                  className={styles.eye}
                  height="4.532"
                  rx="1.116"
                  transform="translate(-2.89 0)"
                  width="2.232"
                  x="-1.116"
                  y="-2.266"
                />
                <rect
                  className={styles.eye}
                  height="4.532"
                  rx="1.116"
                  transform="translate(2.89 0)"
                  width="2.232"
                  x="-1.116"
                  y="-2.266"
                />
              </g>
            </g>
          </g>
          <g
            className={styles.decor}
            transform={`translate(${face.x + 38} ${face.y - 32})`}
          >
            <circle className={styles.thoughtDot} cx="0" cy="0" r="4" />
            <circle
              className={cx(styles.thoughtDot, styles.thoughtDotTwo)}
              cx="15"
              cy="-15"
              r="6"
            />
            <text className={styles.sleepZ} x="0" y="0">
              Z
            </text>
            <text
              className={cx(styles.sleepZ, styles.sleepZTwo)}
              x="18"
              y="-20"
            >
              Z
            </text>
            <text
              className={cx(styles.sleepZ, styles.sleepZThree)}
              x="40"
              y="-45"
            >
              Z
            </text>
          </g>
        </g>
      </g>
    </svg>
  )
}

export function HongMascotGreeting() {
  const { locale } = useRouter()
  const queueRef = useRef<Motion[]>([])
  const initializedRef = useRef(false)
  const [state, setState] = useState({
    piece: 'H' as Piece,
    motion: 'play' as Motion,
    phraseOrder: [0],
    revision: 0,
    ready: false,
  })

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const pieceKeys = Object.keys(pieces) as Piece[]
    const motion = drawMotion(queueRef.current)
    setState({
      piece: pieceKeys[Math.floor(Math.random() * pieceKeys.length)],
      motion,
      phraseOrder: randomPhraseOrder(motion),
      revision: 1,
      ready: true,
    })
  }, [])

  const advance = () => {
    setState((current) => {
      const motion = drawMotion(queueRef.current, current.motion)
      return {
        ...current,
        motion,
        phraseOrder: randomPhraseOrder(motion),
        revision: current.revision + 1,
      }
    })
  }

  const language = locale === 'cn' ? 'cn' : 'en'
  const words = state.phraseOrder.map(
    (index) => copyLibrary[state.motion][index][language],
  )

  return (
    <button
      aria-label={
        language === 'cn' ? '切换动作和文字' : 'Change motion and text'
      }
      className={styles.trigger}
      onClick={advance}
      style={{ visibility: state.ready ? 'visible' : 'hidden' }}
      type="button"
    >
      <span className={styles.mascotSlot}>
        <HongMascot motion={state.motion} piece={state.piece} />
      </span>
      <TypingAnimation
        key={`${state.revision}-${language}`}
        blinkCursor
        className="font-bold"
        cursorStyle="underscore"
        loop
        startOnView={false}
        typeSpeed={60}
        words={words}
      />
    </button>
  )
}
