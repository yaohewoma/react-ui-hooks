# useInView — 视口检测

> **路由提醒**：本 Hook 用于检测元素是否进入视口。如果是无限滚动场景（需要持续检测底部元素），应设置 `triggerOnce: false`。

## 功能概述

检测元素是否进入视口的 IntersectionObserver Hook，支持一次性触发和自定义阈值。

## 路由提醒

- **何时使用**：懒加载组件、滚动动画触发、元素曝光统计
- **何时不用**：无限滚动加载（需配合额外逻辑，本 Hook 只负责检测可见性）
- **关键约束**：`ref` 必须绑定到 DOM 元素才生效
- **triggerOnce 策略**：懒加载和单次滚动动画用 `true`，导航高亮和持续监听用 `false`
- **rootMargin 选择**：懒加载提前 200px 触发可减少用户等待，滚动动画用 '0px'
- **与 useCountUp 的区别**：useCountUp 内部已集成 IO 检测，不需要额外使用 useInView 包裹

## 类型定义

```typescript
interface UseInViewOptions {
  threshold?: number    // 触发阈值（0-1），默认 0.1
  rootMargin?: string   // 根元素边距，默认 '200px'
  triggerOnce?: boolean  // 是否只触发一次，默认 true
}

interface UseInViewReturn {
  ref: React.RefObject<HTMLDivElement>  // 需要绑定的 DOM 元素
  inView: boolean      // 当前是否在视口中
  shouldRender: boolean // 是否应该渲染（考虑 triggerOnce）
}
```

## 实现代码

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * 检测元素是否进入视口的 IntersectionObserver Hook
 * @param options - 配置选项
 * @returns ref, inView, shouldRender
 */
export function useInView({
  threshold = 0.1,
  rootMargin = '200px',
  triggerOnce = true,
}: UseInViewOptions = {}) {
  const [inView, setInView] = useState(false)
  const [hasBeenInView, setHasBeenInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const cleanup = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [])

  useEffect(() => {
    cleanup()

    if (!ref.current) return
    if (triggerOnce && hasBeenInView) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting
        setInView(visible)
        if (visible && triggerOnce) {
          setHasBeenInView(true)
          cleanup()
        }
      },
      { threshold, rootMargin }
    )

    observerRef.current.observe(ref.current)

    return cleanup
  }, [threshold, rootMargin, triggerOnce, hasBeenInView, cleanup])

  const shouldRender = triggerOnce ? hasBeenInView || inView : inView

  return { ref, inView, shouldRender }
}
```

## 使用示例

### 基础用法 — 懒加载

```tsx
import { useInView } from '@/hooks'

function LazySection() {
  const { ref, shouldRender } = useInView()

  return (
    <div ref={ref}>
      {shouldRender && <HeavyComponent />}
    </div>
  )
}
```

### 滚动触发动画

```tsx
function AnimatedSection() {
  const { ref, inView } = useInView({ threshold: 0.3 })

  return (
    <div 
      ref={ref}
      className={`transition-all duration-700 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <h2>标题</h2>
      <p>内容</p>
    </div>
  )
}
```

### 持续监听 — 导航高亮

```tsx
function ScrollIndicator() {
  const { ref, inView } = useInView({ 
    triggerOnce: false,
    threshold: 0.5 
  })

  return (
    <div ref={ref} className={inView ? 'bg-green-500' : 'bg-gray-500'}>
      {inView ? '可见' : '不可见'}
    </div>
  )
}
```

## 配置说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| threshold | 0.1 | 元素可见比例达到多少时触发（0-1） |
| rootMargin | '200px' | 扩展/缩小视口边距，正值提前触发 |
| triggerOnce | true | 是否只触发一次，适合懒加载场景 |

## 应用场景

1. **懒加载** - 组件进入视口时才渲染
2. **滚动动画** - 元素进入视口时播放动画
3. **无限滚动** - 检测底部元素触发加载更多
4. **统计上报** - 元素曝光时上报数据