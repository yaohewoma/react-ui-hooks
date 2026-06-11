# useScrollToTop — 回到顶部

> **路由提醒**：本 Hook 默认监听 `<main>` 元素的滚动事件。如果页面滚动容器不是 `<main>`，需修改源码中的选择器。

## 功能概述

滚动监听与回到顶部 Hook，检测滚动位置并提供平滑滚动回顶部的功能。

## 路由提醒

- **何时使用**：长页面导航、文章阅读、数据列表浏览
- **何时不用**：页面内容很短无需滚动
- **关键约束**：默认监听 `<main>` 元素，确保该元素存在且设置了 `overflow: auto/scroll`
- **threshold 选择**：常规页面 400px、短页面 200px、超长页面 800px
- **性能特点**：使用 `passive: true` 优化滚动性能

## 类型定义

```typescript
/**
 * @param threshold - 显示回到顶部按钮的滚动阈值（像素），默认 400
 * @returns visible, scrollToTop
 */
function useScrollToTop(threshold?: number): {
  visible: boolean       // 是否显示回到顶部按钮
  scrollToTop: () => void // 平滑滚动到顶部
}
```

## 实现代码

```typescript
import { useEffect, useState, useCallback } from 'react'

/**
 * 滚动监听与回到顶部 Hook
 * @param threshold - 显示按钮的滚动阈值（像素）
 * @returns visible 和 scrollToTop
 */
export function useScrollToTop(threshold = 400) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const container = document.querySelector('main')
    if (!container) return

    const handleScroll = () => {
      setVisible(container.scrollTop > threshold)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()  // 初始化时检查一次
    return () => container.removeEventListener('scroll', handleScroll)
  }, [threshold])

  const scrollToTop = useCallback(() => {
    const container = document.querySelector('main')
    container?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { visible, scrollToTop }
}
```

## 使用示例

### 基础用法

```tsx
import { useScrollToTop } from '@/hooks'

function App() {
  const { visible, scrollToTop } = useScrollToTop()

  return (
    <main className="h-screen overflow-auto">
      {/* 页面内容 */}
      <div style={{ height: '3000px' }}>长内容</div>
      
      {/* 回到顶部按钮 */}
      {visible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-blue-500 text-white rounded-full shadow-lg"
        >
          ↑
        </button>
      )}
    </main>
  )
}
```

### 自定义阈值

```tsx
function LongPage() {
  const { visible, scrollToTop } = useScrollToTop(800)

  return (
    <>
      <main className="h-screen overflow-auto">
        {/* 内容 */}
      </main>
      
      <button 
        onClick={scrollToTop}
        className={visible ? 'opacity-100' : 'opacity-0'}
      >
        回到顶部
      </button>
    </>
  )
}
```

### 带动画效果

```tsx
function AnimatedScrollButton() {
  const { visible, scrollToTop } = useScrollToTop(300)

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-8 right-8 p-3 
        bg-blue-500 text-white rounded-full 
        transition-all duration-300
        ${visible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}
    >
      ↑
    </button>
  )
}
```

## 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| threshold | 400 | 显示回到顶部按钮的滚动阈值（像素） |

## 应用场景

1. **长页面导航** - 用户滚动较深后提供快速回到顶部的方式
2. **文章阅读** - 长文章阅读后回到标题
3. **列表页面** - 浏览大量数据后回到顶部筛选

## 注意事项

1. 监听的是 `main` 元素的滚动事件
2. 使用 `passive: true` 优化滚动性能
3. 使用 `behavior: 'smooth'` 实现平滑滚动
4. 阈值变化时会重新绑定事件