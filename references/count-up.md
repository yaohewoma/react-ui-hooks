# useCountUp — 数字滚动动画

> **路由提醒**：本 Hook 用于数字滚动动画场景。如果需要简单静态数字展示，直接用 `{number.toLocaleString()}` 即可，无需使用本 Hook。

## 功能概述

数字滚动动画 Hook，支持前缀/后缀、自定义格式化、延迟触发，使用共享 IntersectionObserver 优化性能。

## 路由提醒

- **何时使用**：Dashboard 统计卡片、KPI 展示、计数器动画
- **何时不用**：静态数字展示、只需要格式化不需要动画
- **关键约束**：必须将 ref 绑定到 DOM 元素，动画仅在元素进入视口时触发
- **性能特点**：直接操作 `textContent` 跳过 React 渲染管线，多个实例共享同一个 IO
- **多个实例**：所有 `useCountUp` 实例自动共享模块级 IntersectionObserver，无需手动管理

## 类型定义

```typescript
interface UseCountUpOptions {
  end: number                    // 目标数值
  duration?: number              // 动画时长（毫秒），默认 1500
  delay?: number                 // 延迟触发（毫秒），默认 0
  prefix?: string                // 前缀，如 '$'
  suffix?: string                // 后缀，如 '+'
  formatter?: (val: number) => string  // 自定义格式化函数
}

interface UseCountUpReturn {
  display: string    // 初始显示值
  ref: React.RefObject<HTMLDivElement>  // 需要绑定的 DOM 元素
}
```

## 实现代码

```typescript
import { useEffect, useRef, useState, useCallback } from 'react'

/** 模块级共享 IntersectionObserver，避免每个实例创建独立的 IO */
type ObserverCallback = () => void
const observerCallbacks = new Map<Element, ObserverCallback>()
let sharedObserver: IntersectionObserver | null = null

function getSharedObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = observerCallbacks.get(entry.target)
            if (cb) {
              cb()
              observerCallbacks.delete(entry.target)
              sharedObserver?.unobserve(entry.target)
            }
          }
        }
      },
      { threshold: 0.3 }
    )
  }
  return sharedObserver
}

/**
 * 数字滚动动画 Hook
 * 使用 useRef 直接操作 DOM 避免每帧重渲染
 */
export function useCountUp({ end, duration = 1500, delay = 0, prefix = '', suffix = '', formatter }: UseCountUpOptions) {
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cancelledRef = useRef(false)
  const rafRef = useRef(0)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = getSharedObserver()
    const cb = () => setStarted(true)
    observerCallbacks.set(el, cb)
    obs.observe(el)

    return () => {
      observerCallbacks.delete(el)
      obs.unobserve(el)
    }
  }, [])

  /** 直接更新 DOM textContent，不触发 React 重渲染 */
  const updateDom = useCallback((value: number) => {
    const el = ref.current
    if (!el) return
    const text = formatter ? formatter(value) : `${prefix}${value.toLocaleString()}${suffix}`
    if (el.textContent !== text) {
      el.textContent = text
    }
  }, [formatter, prefix, suffix])

  useEffect(() => {
    if (!started || !ref.current) return

    const timeout = setTimeout(() => {
      if (cancelledRef.current) return
      const startTime = performance.now()

      const animate = (now: number) => {
        if (cancelledRef.current) return
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)  // easeOutCubic
        const current = Math.round(eased * end)

        updateDom(current)

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }

      rafRef.current = requestAnimationFrame(animate)

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }, delay)

    return () => clearTimeout(timeout)
  }, [started, end, duration, delay, updateDom])

  const [display] = useState(() => formatter ? formatter(0) : `${prefix}0${suffix}`)

  return { display, ref }
}
```

## 使用示例

```tsx
import { useCountUp } from '@/hooks'

function StatsCard() {
  const projects = useCountUp({ end: 3400, suffix: '+', duration: 2000 })
  const score = useCountUp({ 
    end: 95.5, 
    duration: 1500,
    formatter: (val) => val.toFixed(1) + '%'
  })
  const revenue = useCountUp({ 
    end: 1250000, 
    prefix: '$',
    formatter: (val) => '$' + (val / 1000000).toFixed(1) + 'M'
  })

  return (
    <div>
      <div ref={projects.ref}>{projects.display}</div>
      <div ref={score.ref}>{score.display}</div>
      <div ref={revenue.ref}>{revenue.display}</div>
    </div>
  )
}
```

## 性能优化

1. **共享 IntersectionObserver** - 所有 useCountUp 实例共享同一个 IO
2. **直接 DOM 操作** - 使用 ref.current.textContent 而非 state
3. **easeOutCubic 缓动** - `1 - Math.pow(1 - progress, 3)`
4. **自动清理** - 组件卸载时取消动画帧

## 注意事项

1. ref 必须绑定到一个 DOM 元素
2. 元素进入视口后自动开始动画
3. triggerOnce 默认为 true，只触发一次
4. 支持自定义 formatter 处理复杂格式
5. 多实例时共享 IO，无需担心性能问题