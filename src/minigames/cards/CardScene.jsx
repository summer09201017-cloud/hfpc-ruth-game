import { useEffect, useRef } from 'react'
import { drawBackdrop, CORNELIUS, ELIJAH, SAUL, DANIEL, EXODUS } from './scenes'

// 卡片關的 Canvas 場景層。
//  - 永遠先畫 drawBackdrop(通用輕量背景動畫,所有卡片關共用)。
//  - 若 sceneKey 命中某個逐幕 drawer(目前:福音奇兵 CORNELIUS),再疊上手繪動畫。
// 尊重 prefers-reduced-motion:只畫一幀靜態(t=0.8 取一個好看的定格)。
// 零美術檔、可離線;桌遊嵌入版也能用(只是一個 <canvas>)。

const DRAWERS = { ...CORNELIUS, ...ELIJAH, ...SAUL, ...DANIEL, ...EXODUS }

export default function CardScene({ sceneKey, accent }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let raf = 0, t0 = null

    const size = () => {
      const r = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width * dpr)), h2 = Math.max(1, Math.round(r.height * dpr))
      if (canvas.width !== w || canvas.height !== h2) { canvas.width = w; canvas.height = h2 }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawer = sceneKey ? DRAWERS[sceneKey] : null
    const render = (t) => {
      const w = canvas.width / dpr, hh = canvas.height / dpr
      ctx.clearRect(0, 0, w, hh)
      drawBackdrop(ctx, w, hh, t, accent)
      if (drawer) drawer(ctx, w, hh, t)
    }

    size()
    if (reduced) {
      render(0.8)
    } else {
      const frame = (ts) => {
        if (t0 == null) t0 = ts
        size() // 每幀對齊容器尺寸:版面/字體/全螢幕變動都不會讓場景被壓扁
        render((ts - t0) / 1000)
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }

    // 容器尺寸改變時(版面在掛載後才定案、切全螢幕)重新量測,reduced-motion 也能更新一幀
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { size(); if (reduced) render(0.8) }) : null
    if (ro) ro.observe(canvas)
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect() }
  }, [sceneKey, accent && accent.join(',')])

  return <canvas ref={ref} className="mgscene__canvas" aria-hidden="true" />
}
