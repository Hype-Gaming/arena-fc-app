"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Returns true shortly after mount so CSS transitions can run from an
 * initial "off" state to their final state. Components that use this mount
 * fresh (keyed by step id), so a one-shot trigger is all we need.
 */
export function useMountTrigger(delay = 60) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return on
}

/**
 * Animates a number from 0 to `end` over `duration` ms using rAF.
 * Respects prefers-reduced-motion by snapping to the final value.
 */
export function useCountUp(end: number, duration = 1100, startDelay = 150) {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setValue(end)
      return
    }

    let startTime = 0
    const startTimer = setTimeout(() => {
      const tick = (t: number) => {
        if (!startTime) startTime = t
        const progress = Math.min((t - startTime) / duration, 1)
        // easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * end))
        if (progress < 1) raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    }, startDelay)

    return () => {
      clearTimeout(startTimer)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [end, duration, startDelay])

  return value
}

/** Total length of an SVG polyline given its points. */
export function polylineLength(points: { x: number; y: number }[]) {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}
