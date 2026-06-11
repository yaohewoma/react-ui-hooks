# 最佳实践 — react-ui-hooks

> **路由提醒**：本文档涵盖 Hooks 的组合使用、性能优化、测试策略、无障碍（a11y）和接入指南。建议在项目接入前完整阅读。

---

## 一、组合使用模式

### 模式 1：Dashboard 全功能页面

将 5 个 Hook 组合用于一个典型的 Dashboard 页面：

```tsx
function Dashboard() {
  // ① 统计卡片动画
  const analyzed = useCountUp({ end: 3400, suffix: '+', duration: 2000 })
  const passRate = useCountUp({ end: 95.5, duration: 1800,
    formatter: v => v.toFixed(1) + '%' })
  const dataSize = useCountUp({ end: 1250000, duration: 2200,
    formatter: v => (v / 1000000).toFixed(1) + 'M' })

  // ② 键盘快捷键
  const shortcuts = useMemo(() => [
    { keys: ['ctrl', 'k'], handler: () => setSearchOpen(true), description: '搜索' },
    { keys: ['ctrl', 's'], handler: () => exportPdf(), description: '导出 PDF' },
    { keys: ['Escape'], handler: () => closeAllModals(), description: '关闭' },
  ], [])
  useKeyboardShortcuts(shortcuts)

  // ③ 图表懒加载
  const { ref: chartRef, shouldRender } = useInView({ rootMargin: '300px' })

  // ④ 搜索防抖
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  // ⑤ 回到顶部
  const { visible: showTopBtn, scrollToTop } = useScrollToTop(500)

  return (
    <main className="h-screen overflow-auto">
      <StatsBar refs={[analyzed.ref, passRate.ref, dataSize.ref]}
                values={[analyzed.display, passRate.display, dataSize.display]} />
      <SearchBar value={query} onChange={setQuery} />
      <div ref={chartRef}>{shouldRender && <Charts query={debouncedQuery} />}</div>
      {showTopBtn && <BackToTopButton onClick={scrollToTop} />}
    </main>
  )
}
```

### 模式 2：条件性的懒加载列表

将 useInView 与 useDebounce 结合，实现带搜索过滤的懒加载列表：

```tsx
function SearchableList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const { ref: sentinelRef, inView } = useInView({ triggerOnce: false })

  const filtered = useMemo(
    () => items.filter(i => i.name.includes(debouncedQuery)),
    [items, debouncedQuery]
  )

  // 每次 sentinel 进入视口，加载更多
  const [page, setPage] = useState(1)
  useEffect(() => {
    if (inView) setPage(p => p + 1)
  }, [inView])

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {filtered.slice(0, page * 20).map(item => <ListItem key={item.id} {...item} />)}
      <div ref={sentinelRef} /> {/* 滚动哨兵 */}
    </div>
  )
}
```

### 模式 3：键盘快捷键 + 弹窗管理

```tsx
function AppWithModals() {
  const [activeModal, setActiveModal] = useState(null)

  const shortcuts = useMemo(() => [
    { keys: ['ctrl', 'h'], handler: () => setActiveModal('help'), description: '帮助' },
    { keys: ['ctrl', 'p'], handler: () => setActiveModal('profile'), description: '个人设置' },
    { keys: ['Escape'], handler: () => setActiveModal(null), description: '关闭弹窗' },
  ], [])
  useKeyboardShortcuts(shortcuts)

  return (
    <>
      <Dashboard />
      {activeModal === 'help' && <HelpModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'profile' && <ProfileModal onClose={() => setActiveModal(null)} />}
    </>
  )
}
```

---

## 二、性能优化清单

### 1. useCountUp 动画期间不包裹状态

```tsx
// ❌ 额外状态会触发重渲染
function BadCard({ end }) {
  const [selected, setSelected] = useState(false)
  const { display, ref } = useCountUp({ end })
  return (
    <div ref={ref} onClick={() => setSelected(!selected)}>
      {display}
    </div>
  )
}

// ✅ 分离动画和交互状态
function GoodCard({ end }) {
  const { display, ref } = useCountUp({ end })
  const selectedRef = useRef(false)

  return (
    <div ref={ref} onClick={() => {
      selectedRef.current = !selectedRef.current
      // 只改 CSS class，不触发重渲染
      ref.current?.classList.toggle('selected')
    }}>
      {display}
    </div>
  )
}
```

### 2. React.memo 隔离动画组件

```tsx
// 父组件频繁更新 → 子组件不受影响
const AnimatedStat = React.memo(({ end, suffix }: { end: number; suffix: string }) => {
  const { display, ref } = useCountUp({ end, suffix })
  return <div ref={ref} className="stat-value">{display}</div>
})

function Parent() {
  const [tab, setTab] = useState('overview')  // 频繁切换 tab
  return (
    <div>
      <AnimatedStat end={3400} suffix="+" />
      <AnimatedStat end={95.5} suffix="%" />
    </div>
  )
}
```

### 3. useMemo + useCallback 稳定引用

```tsx
// ✅ shortcuts 引用稳定，不会每帧重新绑定 keyboard 事件
const handleSearch = useCallback(() => openSearch(), [])
const shortcuts = useMemo(() => [
  { keys: ['ctrl', 'k'], handler: handleSearch, description: '搜索' }
], [handleSearch])
useKeyboardShortcuts(shortcuts)

// ✅ useInView options 稳定引用
const inViewOptions = useMemo(() => ({
  rootMargin: '200px',
  threshold: 0.3,
  triggerOnce: true
}), [])
const { ref, shouldRender } = useInView(inViewOptions)
```

### 4. 性能预算参考

| 场景 | 推荐上限 | 超出建议 |
|------|---------|---------|
| 同时播放的 useCountUp | 20 个 | 用 delay 错开启动，或仅对可见卡片启用 |
| 同时监听的 useInView | 50 个 | 对列表场景用虚拟滚动 |
| 防抖 handler 内的计算量 | < 16ms/次 | 用 Web Worker 处理重计算 |
| useKeyboardShortcuts 注册数 | 15 组 | 合并到帮助面板，按需注册 |

---

## 三、测试策略

### 单元测试 useCountUp

```tsx
import { render, screen } from '@testing-library/react'
import { useCountUp } from '@/hooks'

// Mock IntersectionObserver
beforeAll(() => {
  global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    trigger: () => callback([{ isIntersecting: true, target: document.createElement('div') }])
  }))
})

test('renders initial display value', () => {
  function TestComp() {
    const { display, ref } = useCountUp({ end: 100, suffix: '+' })
    return <div ref={ref}>{display}</div>
  }
  render(<TestComp />)
  expect(screen.getByText('0+')).toBeInTheDocument()
})
```

### 单元测试 useDebounce

```tsx
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks'

jest.useFakeTimers()

test('returns debounced value after delay', () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 300),
    { initialProps: { value: 'a' } }
  )

  expect(result.current).toBe('a')  // 初始值立即返回

  rerender({ value: 'ab' })
  expect(result.current).toBe('a')  // delay 内不变

  act(() => { jest.advanceTimersByTime(300) })
  expect(result.current).toBe('ab')  // delay 后更新
})
```

### 单元测试 useKeyboardShortcuts

```tsx
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/hooks'

test('triggers handler on matching key combination', () => {
  const handler = jest.fn()
  renderHook(() => useKeyboardShortcuts([
    { keys: ['ctrl', 'k'], handler, description: 'search' }
  ]))

  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  expect(handler).toHaveBeenCalledTimes(1)
})

test('ignores single key shortcuts in input elements', () => {
  const handler = jest.fn()
  renderHook(() => useKeyboardShortcuts([
    { keys: ['Escape'], handler, description: 'close' }
  ]))

  const input = document.createElement('input')
  document.body.appendChild(input)
  input.focus()

  fireEvent.keyDown(window, { key: 'Escape' })
  expect(handler).not.toHaveBeenCalled()  // 在 input 中忽略
})
```

---

## 四、无障碍（a11y）

### 1. 键盘快捷键可见性

```tsx
function ShortcutHelp() {
  return (
    <dialog aria-label="键盘快捷键帮助">
      <kbd>Ctrl</kbd> + <kbd>K</kbd> <span>打开搜索</span>
      <kbd>Esc</kbd> <span>关闭弹窗</span>
    </dialog>
  )
}
```

### 2. 回到顶部按钮

```tsx
<button
  onClick={scrollToTop}
  aria-label="回到页面顶部"
  className="fixed bottom-8 right-8"
>
  ↑
</button>
```

### 3. 数字动画的屏幕阅读器支持

```tsx
<div
  ref={ref}
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {display}
</div>
```

`aria-live="polite"` 确保屏幕阅读器在动画完成后播报最终数值。

### 4. 减少动画偏好

```tsx
function AccessibleCountUp({ end, suffix }: { end: number; suffix: string }) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced) {
    return <div>{end.toLocaleString()}{suffix}</div>  // 跳过动画，直接显示最终值
  }

  const { display, ref } = useCountUp({ end, suffix })
  return <div ref={ref}>{display}</div>
}
```

---

## 五、接入指南

### 渐进式接入（不破坏现有代码）

```tsx
// Step 1：从最简单的 Hook 开始
// 先接入 useDebounce，替换现有的手动 setTimeout 防抖
import { useDebounce } from '@/hooks/useDebounce'

// Step 2：接入 useScrollToTop，替换现有的滚动监听逻辑
import { useScrollToTop } from '@/hooks/useScrollToTop'

// Step 3：接入 useInView，用于图表懒加载
import { useInView } from '@/hooks/useInView'

// Step 4：接入 useKeyboardShortcuts，统一管理全局快捷键
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

// Step 5：接入 useCountUp，替换手动动画逻辑（性能提升最大）
import { useCountUp } from '@/hooks/useCountUp'
```

### 从常见替代方案迁移

| 从 | 迁移到 | 收益 |
|----|--------|------|
| 手动 `setTimeout` + `clearTimeout` 防抖 | `useDebounce` | 一行代码，自动清理 |
| `window.addEventListener('scroll')` | `useScrollToTop` | 封装逻辑，passive 优化 |
| 每个懒加载元素各自 `new IntersectionObserver()` | `useInView` | 统一 API，triggerOnce 支持 |
| `useState` + `requestAnimationFrame` 数字动画 | `useCountUp` | 零重渲染，共享 IO |
| 手动 `keydown` 监听 + 条件判断 | `useKeyboardShortcuts` | 声明式配置，输入框自动忽略 |

### 项目结构建议

```
src/
├── hooks/                    ← 直接从 GitHub 仓库复制
│   ├── index.ts              ← barrel export
│   ├── useCountUp.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useInView.ts
│   ├── useDebounce.ts
│   └── useScrollToTop.ts
├── components/
│   ├── StatsCard.tsx         ← 使用 useCountUp
│   ├── SearchBar.tsx         ← 使用 useDebounce
│   ├── LazySection.tsx       ← 使用 useInView
│   └── Layout.tsx            ← 使用 useKeyboardShortcuts + useScrollToTop
```

---

## 六、常见反模式

| 反模式 | 问题 | 正确方式 |
|--------|------|---------|
| 在 useCountUp 外部用 useState 管理动画状态 | 每次动画帧都触发 React 重渲染 | useCountUp 内部已处理所有动画逻辑 |
| 条件渲染包含 ref 的元素 | ref.current 可能为 null | 元素始终渲染，用 CSS visibility 控制显隐 |
| 每个 useCountUp 实例分开延迟 1ms | 多个动画仍然几乎同时启动 | 递增值 ≥ 100ms 才能有效错开 |
| 在 useDebounce 的 useEffect 中依赖原始值 | 每次按键都触发请求 | 必须依赖 `debouncedValue` |
| 在 render 中内联创建 shortcuts 数组 | 每次渲染重新绑定键盘事件 | 用 `useMemo` 稳定引用 |
| 用 useInView 的 `inView` 做条件渲染 | 出视口时组件卸载，内部状态丢失 | 用 `shouldRender`，首次进入后始终为 true |