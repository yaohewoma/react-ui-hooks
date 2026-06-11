# Performance Architecture — 性能架构设计

> **路由提醒**：本文件解释 react-ui-hooks 的两大核心性能优化策略。在性能诊断、大规模应用、或评估是否适合当前场景时必读。

## 概述

react-ui-hooks 在性能方面做了两项关键设计决策，使其与市面上大多数 React Hooks 库有本质区别：

1. **直接 DOM 操作**：在动画场景中绕过 React 渲染管线
2. **共享 IntersectionObserver**：模块级单例，消除重复实例化

## 策略一：直接操作 DOM，跳过 React 渲染管线

### 问题

传统的数字动画实现使用 `useState` + `requestAnimationFrame`：

```typescript
// ❌ 性能反模式
const [current, setCurrent] = useState(0)

useEffect(() => {
  const animate = () => {
    setCurrent(prev => prev + 1)  // 每帧触发一次 React 状态更新
    if (current < end) requestAnimationFrame(animate)
  }
  animate()
}, [])
```

每帧 `setState` → `scheduleUpdate` → `beginWork` → `completeWork` → `commit`，走完 React 完整的 reconciliation 流程。10 个统计卡片 × 60 FPS = **每秒 600 次状态更新**。

### 原理

React 的核心职责是：**维护 UI 与状态的一致性**。但在数字滚动动画这个场景下，"改变显示的数字"是纯视觉效果，不影响任何组件状态、不依赖任何 props、不触发任何副作用——React 不需要知道 DOM 变了。

```typescript
// ✅ 绕过 React
const updateDom = useCallback((value: number) => {
  const el = ref.current
  if (!el) return
  el.textContent = formatValue(value)  // 直接修改 DOM
  // React 完全不知道这个变化
}, [])

// requestAnimationFrame 驱动动画
const animate = (now: number) => {
  const progress = Math.min((now - startTime) / duration, 1)
  const eased = 1 - Math.pow(1 - progress, 3)  // easeOutCubic
  updateDom(Math.round(eased * end))
  if (progress < 1) requestAnimationFrame(animate)
}
```

`useRef` 获取 DOM 节点引用 → `requestAnimationFrame` 驱动帧循环 → `textContent` 直接更新文本内容。React 的 reconciliation 完全被跳过。

### 适用条件（何时可以绕过 React）

| 条件 | 说明 |
|------|------|
| 目标元素是"叶子节点" | 不包含子组件，没有复杂的 DOM 结构 |
| 变化的是纯视觉效果 | 颜色、文字、透明度等不影响业务状态的属性 |
| 不依赖 React 状态 | 变化后的值不需要被其他组件读取 |
| 高频更新（≥ 30fps） | 低频更新时收益不明显，反而增加心智负担 |

### 何时不应该绕过 React

- 变化影响组件树结构（条件渲染、列表变动）
- 变化需要被其他组件感知（状态共享）
- 变化触发副作用（表单值变更、数据提交）
- 低频更新（每秒 < 10 次）：走 React 正常流程，可读性更好

### 性能对比

| 指标 | useState 方案 | useRef + DOM 方案 |
|------|-------------|-------------------|
| 每秒 React 渲染次数 | N × 60（N = 动画实例数） | **0** |
| React DevTools Profiler | 火焰图满屏黄色 | 无任何火焰图 |
| 动画帧率 | 30-40 FPS（明显掉帧） | **稳定 60 FPS** |
| 内存占用 | 每次 setState 创建新闭包 | 仅一个 ref 引用 |

## 策略二：共享 IntersectionObserver

### 问题

标准的 IntersectionObserver 用法是为每个观察目标创建一个 IO 实例：

```typescript
// ❌ 10 个元素 = 10 个 IO 实例
useEffect(() => {
  const observer = new IntersectionObserver(callback, options)
  observer.observe(ref.current)
  return () => observer.disconnect()
}, [])
```

10 个 `useCountUp` 实例 + 5 个 `useInView` 实例 = 15 个 IntersectionObserver 实例。每个 IO 都在独立的主线程上运行回调，浪费内存和 CPU。

### 原理

使用模块级（module-level）变量实现单例共享：

```typescript
// 模块级变量，整个模块生命周期内只创建一次
const observerCallbacks = new Map<Element, ObserverCallback>()
let sharedObserver: IntersectionObserver | null = null

function getSharedObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // 从 Map 中查找该元素对应的回调
          const cb = observerCallbacks.get(entry.target)
          if (cb) {
            cb()
            observerCallbacks.delete(entry.target)
            sharedObserver?.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.3 }
    )
  }
  return sharedObserver
}
```

关键设计：
- `getSharedObserver()` 是懒初始化单例：首次调用时创建，后续调用返回同一个实例
- `observerCallbacks` Map 管理每个元素与回调的映射关系
- 回调触发后自动清理（delete + unobserve），防止内存泄漏
- 模块级变量在 ES Module 中天然隔离，不会跨模块泄露

### 适用条件

| 条件 | 是否适合共享 IO |
|------|---------------|
| 阈值（threshold）相同 | ✅ 适合 |
| 阈值不同 | ❌ 需要独立 IO |
| rootMargin 相同 | ✅ 适合 |
| rootMargin 不同 | ❌ 需要独立 IO |
| 仅用于触发一次 | ✅ 适合（useCountUp 场景） |
| 需要持续监听 | ✅ 也适合，但回调不应自动清理 |

### 当前 Skill 的 IO 策略

| Hook | 是否共享 IO | 原因 |
|------|-----------|------|
| `useCountUp` | **是**（共享） | 固定 threshold: 0.3，仅触发一次 |
| `useInView` | 否（独立） | threshold / rootMargin / triggerOnce 各实例可配置 |

## 扩展：是否可以将共享 IO 思路应用到其他 Hook？

同样适用共享策略的场景：
- **ResizeObserver**：多个组件监听同一个容器尺寸变化
- **MutationObserver**：多个组件监听同一个 DOM 子树的变化
- **PerformanceObserver**：多个组件监听同一类性能指标

实现模式完全一致：模块级单例 + Map 回调管理。

## 权衡与代价

| 优点 | 代价 |
|------|------|
| 零重渲染，丝滑动画 | 直接 DOM 操作破坏了 React 的单向数据流假设 |
| 大幅减少 IO 实例数 | 共享 IO 的回调管理增加了代码复杂度 |
| 不需要额外依赖 | 如果 React 未来改变了 textContent 的治理方式，可能需要适配 |
| 即时生效，无需配置 | 开发者需要理解"何时可以绕过 React"的判断标准 |

## 故障排查

如果动画不流畅：
1. 确认使用了 `useCountUp`（直接 DOM 版本）而非自己写的 useState 版本
2. 在 React DevTools Profiler 中确认动画期间无渲染
3. 检查是否有其他组件在同一帧内触发大量渲染
4. 减少同时播放的动画数量（用 delay 错开启动）