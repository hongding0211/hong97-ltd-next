'use client'

import { useEffect } from 'react'

interface ScrollLockSnapshot {
  scrollX: number
  scrollY: number
  body: {
    position: string
    top: string
    left: string
    right: string
    width: string
    overflow: string
    overscrollBehavior: string
  }
  html: {
    overflow: string
    overscrollBehavior: string
  }
}

let activeLocks = 0
let snapshot: ScrollLockSnapshot | null = null

const lockPageScroll = () => {
  activeLocks += 1
  if (activeLocks > 1) {
    return
  }

  const { body, documentElement } = document
  snapshot = {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    body: {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
    },
    html: {
      overflow: documentElement.style.overflow,
      overscrollBehavior: documentElement.style.overscrollBehavior,
    },
  }

  body.style.position = 'fixed'
  body.style.top = `-${snapshot.scrollY}px`
  body.style.left = `-${snapshot.scrollX}px`
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'
  body.style.overscrollBehavior = 'none'
  documentElement.style.overflow = 'hidden'
  documentElement.style.overscrollBehavior = 'none'
}

const unlockPageScroll = () => {
  activeLocks = Math.max(0, activeLocks - 1)
  if (activeLocks || !snapshot) {
    return
  }

  const currentSnapshot = snapshot
  snapshot = null
  const { body, documentElement } = document

  body.style.position = currentSnapshot.body.position
  body.style.top = currentSnapshot.body.top
  body.style.left = currentSnapshot.body.left
  body.style.right = currentSnapshot.body.right
  body.style.width = currentSnapshot.body.width
  body.style.overflow = currentSnapshot.body.overflow
  body.style.overscrollBehavior = currentSnapshot.body.overscrollBehavior
  documentElement.style.overflow = currentSnapshot.html.overflow
  documentElement.style.overscrollBehavior =
    currentSnapshot.html.overscrollBehavior
  window.scrollTo(currentSnapshot.scrollX, currentSnapshot.scrollY)
}

export const usePageScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) {
      return
    }

    lockPageScroll()
    return unlockPageScroll
  }, [locked])
}
