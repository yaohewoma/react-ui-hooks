# useDebounce — 输入防抖

> **路由提醒**：本 Hook 用于将频繁变化的值延迟为稳定值。核心原则：在 useEffect 中务必依赖防抖后的值，而不是原始值。

## 功能概述

防抖 Hook，延迟返回更新后的值，常用于搜索输入、窗口 resize 等场景。

## 路由提醒

- **何时使用**：搜索框输入、窗口 resize 监听、表单实时验证、自动保存
- **何时不用**：需要节流（固定频率触发）而非防抖的场景
- **关键约束**：在 useEffect 中必须依赖 `debouncedValue` 而非原始 `value`
- **delay 选择**：搜索 300ms、resize 200ms、表单验证 500ms、自动保存 1000ms
- **初始值注意**：首次渲染时 debounced 值等于初始值，如果初始值不为空会触发一次 effect

## 类型定义

```typescript
/**
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒），默认 300
 * @returns 防抖后的值
 */
function useDebounce<T>(value: T, delay?: number): T
```

## 实现代码

```typescript
import { useState, useEffect } from 'react'

/**
 * 防抖 Hook — 延迟返回更新后的值
 * @param value - 需要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
```

## 使用示例

### 搜索输入

```tsx
import { useDebounce } from '@/hooks'

function SearchInput() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    if (debouncedSearch) {
      fetchResults(debouncedSearch)
    }
  }, [debouncedSearch])

  return (
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="搜索..."
    />
  )
}
```

### 窗口尺寸监听

```tsx
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const debouncedSize = useDebounce(size, 200)

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return debouncedSize
}
```

### 表单验证

```tsx
function EmailInput() {
  const [email, setEmail] = useState('')
  const debouncedEmail = useDebounce(email, 500)
  const [error, setError] = useState('')

  useEffect(() => {
    if (debouncedEmail && !isValidEmail(debouncedEmail)) {
      setError('邮箱格式不正确')
    } else {
      setError('')
    }
  }, [debouncedEmail])

  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <span className="text-red-500">{error}</span>}
    </div>
  )
}
```

## 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| value | - | 需要防抖的值（任意类型） |
| delay | 300 | 延迟时间（毫秒） |

## 应用场景

1. **搜索输入** - 用户停止输入后再发起请求
2. **窗口 resize** - 窗口停止调整后再重新计算布局
3. **表单验证** - 用户停止输入后再验证
4. **自动保存** - 用户停止编辑后再保存

## 注意事项

1. 返回值在 delay 时间内保持不变
2. value 变化时会重置计时器
3. 组件卸载时会自动清理计时器
4. 泛型支持任意类型的值