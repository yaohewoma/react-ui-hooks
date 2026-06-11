---
name: "react-ui-hooks"
version: "1.1.0"
description: "React universal UI Hooks collection covering counter animations, keyboard shortcuts, viewport detection, debounce, and scroll control. Invoke when user needs performant UI interactions in any React application."
---

# react-ui-hooks — React 通用 UI Hooks 集合

> **执行前必做：** 使用任何 Hook 前，必须先阅读对应的 reference 文档理解实现细节和性能约束。
> **核心原则：** 性能优先——useRef 直接操作 DOM 避免重渲染，模块级共享 IntersectionObserver 避免重复实例化。

## 0. 流水线位置

```
[独立模块] react-ui-hooks → 为 React 前端应用提供通用 UI 交互能力
              ↑ 本 Skill
```

- **上游依赖**：无（独立模块，仅依赖 React ≥ 16.8）
- **下游 Skill**：无（为 React 应用提供可复用 Hooks，被 Dashboard 等页面直接消费）
- **覆盖场景**：数字动画、键盘快捷键、视口检测、输入防抖、滚动控制
- **产出物**：5 个 TypeScript Hook 源文件，零外部依赖，可直接复制到项目中使用
- **总索引**：[SKILLS-INDEX.md](../SKILLS-INDEX.md)

## 1. 何时使用本 Skill

### 1.1 触发条件

以下场景应使用本 skill：
- Dashboard / 统计页面需要数字滚动动画效果（如统计数据从 0 滚动到目标值）
- 需要全局键盘快捷键绑定（Ctrl+K 搜索、Escape 关闭弹窗等）
- 列表/图表/重组件需要懒加载（元素进入视口时才渲染）
- 搜索框需要输入防抖（避免每次按键都触发 API 请求）
- 长页面需要"回到顶部"按钮和滚动位置监听
- 多个同类 Hook 实例频繁创建导致性能问题，需要共享 Observer
- 用户提到"快捷键"、"数字动画"、"懒加载"、"防抖"、"回到顶部"、"滚动监听"、"卡顿"、"FPS"、"IntersectionObserver"、"useRef" 等关键词

以下场景不应使用本 skill：
- 需要复杂的状态管理 —— 用 Redux / Zustand
- 需要路由功能 —— 用 React Router
- 需要数据请求与缓存 —— 用 React Query / SWR
- 需要表单管理与验证 —— 用 React Hook Form
- 需要图表绘制 —— 用 ECharts / Recharts
- 需要拖拽功能 —— 用 dnd-kit / react-beautiful-dnd
- 需要虚拟滚动（万级列表）—— 用 react-window / react-virtuoso

### 1.2 前置约束

1. **React 版本 ≥ 16.8**：Hooks API 最低要求
2. **TypeScript 推荐**：所有 Hook 已包含完整类型定义，`ref` 泛型需显式指定 `useRef<HTMLDivElement>`
3. **使用前必读 reference**：每个 Hook 的 reference 文档含完整实现代码和边界说明，不可跳过
4. **性能第一原则**：`useCountUp` 使用 `useRef` 直接操作 DOM（而非 `useState`），动画期间零重渲染
5. **共享优于创建**：`useCountUp` 内部使用模块级共享 `IntersectionObserver`，所有实例共享同一个 IO
6. **视口检测触发策略**：懒加载场景务必设置 `triggerOnce: true`，避免滚动时反复触发渲染
7. **防抖延迟选择**：搜索场景用 300ms，窗口 resize 用 200ms，表单验证用 500ms
8. **滚动容器约定**：`useScrollToTop` 默认监听 `<main>` 元素的滚动事件，需确保滚动容器是 `<main>` 或有 `overflow: auto/scroll`
9. **键盘快捷键忽略输入框**：单键快捷键（如 Escape）在 `<input>`、`<textarea>`、`contentEditable` 中自动忽略
10. **清理机制**：所有 Hook 均包含 `useEffect` 清理函数，组件卸载时自动取消事件监听、定时器和动画帧

## 2. 模块与命令导航

先根据用户需求判断属于哪个 Hook 场景，再进入对应子模块阅读 reference。

### 2.1 模块地图

| 大模块 | 解决什么问题 | 性能亮点 | 参考文件 |
|------|------------|---------|---------|
| useCountUp | 数字滚动动画（统计数字展示） | 直接操作 DOM 绕过 React 渲染管线 | [`references/count-up.md`](references/count-up.md) |
| useKeyboardShortcuts | 全局键盘快捷键绑定 | 智能忽略输入框，Mac Cmd 键兼容 | [`references/keyboard-shortcuts.md`](references/keyboard-shortcuts.md) |
| useInView | 元素视口检测（懒加载/滚动动画） | 支持 triggerOnce + 自定义阈值 | [`references/in-view.md`](references/in-view.md) |
| useDebounce | 输入值防抖（搜索/表单验证） | 泛型支持，自动清理计时器 | [`references/debounce.md`](references/debounce.md) |
| useScrollToTop | 滚动监听与回到顶部 | 监听 main 元素，passive 滚动优化 | [`references/scroll-to-top.md`](references/scroll-to-top.md) |
| 性能架构 | 共享 IO 原理与直接 DOM 操作设计 | 模块级单例 + requestAnimationFrame | [`references/performance-architecture.md`](references/performance-architecture.md) |
| 故障排查 | 常见错误、性能问题、兼容性问题的解决方案 | — | [`references/troubleshooting.md`](references/troubleshooting.md) |

- `references/` - 参考文档与运行脚本
- `examples/` - 使用示例，演示完整数据管线
- `tests/` - 测试固件（JSON格式）

### 2.2 useCountUp — 数字滚动动画

**必读 reference**：[`references/count-up.md`](references/count-up.md)

**解决什么问题**：Dashboard 统计卡片中，数字从 0 动画滚动到目标值（如 3400+、95.5%、1.25M）。

| 参数 | 类型 | 默认值 | 说明 | 何时调参 |
|------|------|--------|------|---------|
| end | `number` | 必填 | 目标数值 | — |
| duration | `number` | 1500 | 动画时长（ms） | 统计数字用 2000ms，快速数字用 1000ms |
| delay | `number` | 0 | 延迟触发（ms） | 多个动画错开时用，避免同时启动 |
| prefix | `string` | `''` | 前缀 | 货币场景用 `'$'`，百分号无需（用 formatter） |
| suffix | `string` | `''` | 后缀 | 计数场景用 `'+'`，单位场景用 `' 个'` |
| formatter | `(val: number) => string` | — | 自定义格式化 | 百分比/货币等复杂格式时使用 |

**返回值**：`{ display: string, ref: RefObject<HTMLDivElement> }`

**路由提醒**：
- 必须将 `ref` 绑定到目标 DOM 元素，否则动画不会触发
- 元素进入视口后自动开始动画（内部使用共享 IO），无需手动控制
- `display` 用于初始渲染值（动画前的占位文本），实际动画通过直接操作 DOM 更新
- 多个实例同时使用时共享同一个 IntersectionObserver，不会重复创建

### 2.3 useKeyboardShortcuts — 全局键盘快捷键

**必读 reference**：[`references/keyboard-shortcuts.md`](references/keyboard-shortcuts.md)

**解决什么问题**：为 Dashboard / 管理后台添加全局快捷键（Ctrl+K 搜索、Escape 关闭弹窗、Ctrl+S 保存）。

| 参数 | 类型 | 说明 |
|------|------|------|
| shortcuts | `Shortcut[]` | 快捷键配置数组 |

**Shortcut 接口**：
```typescript
interface Shortcut {
  keys: string[]       // 按键组合，如 ['ctrl', 'k'] 或 ['Escape']
  handler: () => void  // 触发的回调函数
  description: string  // 快捷键描述（用于帮助文档/设置面板）
}
```

**路由提醒**：
- `shortcuts` 数组引用变化时会重新绑定事件，建议用 `useMemo` 稳定引用
- 单键快捷键（如 `Escape`）在 `<input>` / `<textarea>` / `contentEditable` 中自动忽略
- 组合键快捷键（如 `Ctrl+K`）在输入框中仍然生效
- `Ctrl` 键在 Mac 上自动映射为 `Cmd` 键
- 支持的修饰键：`ctrl`、`shift`、`alt`

### 2.4 useInView — 视口检测

**必读 reference**：[`references/in-view.md`](references/in-view.md)

**解决什么问题**：检测元素是否进入视口，支持懒加载、滚动动画触发、曝光统计。

| 参数 | 类型 | 默认值 | 说明 | 何时调参 |
|------|------|--------|------|---------|
| threshold | `number` | 0.1 | 触发阈值（0-1） | 滚动动画场景用 0.3，确保元素大部分可见 |
| rootMargin | `string` | `'200px'` | 视口边距 | 懒加载提前 200px 触发，减少用户等待 |
| triggerOnce | `boolean` | true | 是否只触发一次 | 懒加载用 true，持续监听（如导航高亮）用 false |

**返回值**：`{ ref: RefObject<HTMLDivElement>, inView: boolean, shouldRender: boolean }`

**路由提醒**：
- `shouldRender` 考虑 `triggerOnce` 逻辑：首次进入后始终为 true，避免组件卸载
- `inView` 是实时可见性状态，`triggerOnce: false` 时可用于滚动导航高亮
- ref 必须绑定到 DOM 元素才生效
- 每个实例创建独立的 IO（与 useCountUp 不同），因为阈值和 rootMargin 各实例可能不同

### 2.5 useDebounce — 输入防抖

**必读 reference**：[`references/debounce.md`](references/debounce.md)

**解决什么问题**：对任意类型的值做防抖处理，常用于搜索输入、窗口 resize、表单验证。

| 参数 | 类型 | 默认值 | 说明 | 何时调参 |
|------|------|--------|------|---------|
| value | `T` | 必填 | 需要防抖的值 | — |
| delay | `number` | 300 | 延迟时间（ms） | 搜索 300ms，resize 200ms，表单验证 500ms |

**返回值**：防抖后的值 `T`（泛型，保留原始类型）

**路由提醒**：
- 返回值在 delay 时间内保持不变，value 变化时会重置计时器
- 使用泛型，支持任意类型的值（string、number、object 等）
- 组件卸载时自动清理计时器
- 注意初始值问题：首次渲染时 debounced 值等于初始值，可能触发一次 effect

### 2.6 useScrollToTop — 回到顶部

**必读 reference**：[`references/scroll-to-top.md`](references/scroll-to-top.md)

**解决什么问题**：监听页面滚动位置，在超过阈值后显示"回到顶部"按钮。

| 参数 | 类型 | 默认值 | 说明 | 何时调参 |
|------|------|--------|------|---------|
| threshold | `number` | 400 | 显示按钮的滚动阈值（px） | 页面较短时减小（200），很长时增大（800） |

**返回值**：`{ visible: boolean, scrollToTop: () => void }`

**路由提醒**：
- 默认监听 `document.querySelector('main')` 的滚动事件，确保页面有 `<main>` 元素且设置了 `overflow: auto/scroll`
- 使用 `passive: true` 优化滚动性能
- `scrollToTop()` 使用 `behavior: 'smooth'` 实现平滑滚动
- 如果滚动容器不是 `<main>`，需要修改源码中的选择器

### 2.7 性能架构

**必读 reference**：[`references/performance-architecture.md`](references/performance-architecture.md)

**解决什么问题**：理解本 Skill 的两大核心性能优化策略——直接 DOM 操作和共享 IntersectionObserver——以及它们的适用场景与权衡。

**路由提醒**：在以下场景必须先阅读此文档：
- 用户反馈页面卡顿，需性能诊断
- 需要为大型列表添加数字动画
- 需要评估直接 DOM 操作是否适合当前场景
- 需要了解性能优化是否适用于非 React 框架

## 3. 使用 Hooks 的标准流程

1. **确认场景**：与用户确认需要哪些 Hook（数字动画 / 快捷键 / 懒加载 / 防抖 / 回到顶部）
2. **阅读文档**：阅读对应 reference 文档理解 API、参数、返回值、性能约束
3. **复制文件**：将 Hook 源文件从 GitHub 仓库复制到项目的 `hooks/` 目录
4. **导入使用**：`import { useCountUp } from '@/hooks'`（或相对路径）
5. **绑定 DOM**：确保 `ref={xxxRef}` 绑定到目标 DOM 元素（`useCountUp` 和 `useInView` 关键步骤）
6. **调参测试**：根据场景选择推荐参数（参考 §5 参数调优速查），在浏览器中验证效果
7. **性能验证**：使用 React DevTools Profiler 确认渲染次数，确保 `useCountUp` 不触发重渲染

## 4. 常见错误

| 错误 | 后果 | 正确做法 |
|------|------|---------|
| 忘记绑定 ref | Hook 不生效，display 永远是 "0" | 确保 `ref={xxx}` 绑定到 DOM 元素并同时渲染 `{display}` |
| useCountUp 内部使用 useState | 每帧触发重渲染，10 个卡片 = 600 次/秒 | 使用 useRef + textContent 直接操作 DOM |
| useCountUp 多个实例各自创建 IO | 10 个卡片 = 10 个 IntersectionObserver，内存浪费 | 使用模块级共享单例（已内置） |
| useInView 不设 triggerOnce | 滚动时反复触发渲染/卸载，抖动 | 懒加载场景设置 `triggerOnce: true` |
| useDebounce 使用原始值而非防抖值 | 每次按键都触发 API 请求 | 在 useEffect 中依赖 `debouncedValue` 而非原始 `value` |
| useDebounce delay 太短 | 防抖效果不明显，频繁请求 | 搜索 300ms，表单验证 500ms |
| useKeyboardShortcuts 内联数组 | 每次渲染都重新绑定事件 | 用 `useMemo` 稳定 shortcuts 引用 |
| useKeyboardShortcuts 忽略输入框逻辑不生效 | 输入框中按下 Escape 仍然关闭弹窗 | 确保 shortcut.keys 长度为 1 时才会被忽略（组合键不忽略） |
| useScrollToTop 监听错误元素 | 回到顶部不生效 | 确保滚动容器是 `<main>` 元素且设置了 `overflow: auto` |
| useScrollToTop 点击后无反应 | `scrollTo` 对错误元素调用 | 确认 `main` 元素存在且是实际滚动容器 |
| 在类组件中调用 Hook | React 报错 "Invalid hook call" | Hook 只能在函数组件或自定义 Hook 中调用 |
| 旧浏览器不支持 IntersectionObserver | useCountUp / useInView 不触发 | 安装 `intersection-observer` polyfill |

## 5. 参数调优速查

| 场景 | Hook | 推荐参数 | 何时调参 |
|------|------|---------|---------|
| 搜索防抖 | `useDebounce` | `delay: 300` | 用户输入较慢时减小到 200ms；需要更省请求时增大到 500ms |
| 窗口 resize | `useDebounce` | `delay: 200` | 布局计算较重时增大到 300ms |
| 懒加载 | `useInView` | `triggerOnce: true, rootMargin: '200px'` | 组件非常重时增大 rootMargin 到 '400px' |
| 滚动动画 | `useInView` | `triggerOnce: true, threshold: 0.3` | 需要元素完全可见时增大到 0.5 |
| 持续监听（导航高亮） | `useInView` | `triggerOnce: false, threshold: 0.5` | 按需调整 threshold |
| 统计数字（重要指标） | `useCountUp` | `duration: 2000` | 数字较大时增大到 2500ms |
| 快速数字（次要指标） | `useCountUp` | `duration: 1000` | 数字很小时减小到 800ms |
| 回到顶部 | `useScrollToTop` | `threshold: 400` | 页面短时减小到 200px；页面很长时增大到 800px |
| 多个动画错开 | `useCountUp` | `delay: 200（依次递增）` | 按实例数量调整间隔 |

## 6. Quick Start

```bash
# 1. 确保 React 版本 >= 16.8
npm list react

# 2. 从 GitHub 仓库复制 hooks/ 目录到你的项目中
#    git clone https://github.com/yaohewoma/react-ui-hooks
#    或直接下载 hooks/ 文件夹

# 3. 无需安装任何额外依赖（仅依赖 React 核心 API）
#    如果目标环境不支持 IntersectionObserver（如 IE），安装 polyfill：
#    npm install intersection-observer
```

```tsx
// 4. 按需导入使用
import { 
  useCountUp, 
  useKeyboardShortcuts, 
  useInView, 
  useDebounce, 
  useScrollToTop 
} from '@/hooks'

function Dashboard() {
  // ① 数字动画：进入视口自动播放，2 秒从 0 滚到 3400
  const { ref: countRef, display } = useCountUp({ 
    end: 3400, duration: 2000, suffix: '+' 
  })

  // ② 键盘快捷键（建议用 useMemo 稳定引用）
  const shortcuts = useMemo(() => [
    { keys: ['ctrl', 'k'], handler: () => openSearch(), description: '打开搜索' },
    { keys: ['Escape'], handler: () => closeModal(), description: '关闭弹窗' },
  ], [])
  useKeyboardShortcuts(shortcuts)

  // ③ 懒加载：提前 200px 开始渲染
  const { ref: lazyRef, shouldRender } = useInView({ 
    rootMargin: '200px', triggerOnce: true 
  })

  // ④ 搜索防抖：停止输入 300ms 后触发
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  useEffect(() => {
    if (debouncedSearch) fetchResults(debouncedSearch)
  }, [debouncedSearch])

  // ⑤ 回到顶部
  const { visible, scrollToTop } = useScrollToTop(400)

  return (
    <main className="h-screen overflow-auto">
      <div ref={countRef}>{display}</div>
      <div ref={lazyRef}>{shouldRender && <HeavyChart />}</div>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      {visible && <button onClick={scrollToTop}>↑ 回到顶部</button>}
    </main>
  )
}
```

## 依赖

这些 Hooks 仅依赖 React 核心 API（`useState`、`useEffect`、`useRef`、`useCallback`、`useMemo`），无需额外安装 npm 包。

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| react | 16.8 | Hooks API 最低要求 |
| typescript（推荐） | 4.0+ | 完整类型定义 |
| intersection-observer（可选） | — | 旧浏览器 polyfill |

## 与其他 Skill 的协作

在竞品分析系统中，本 Skill 为前端 Dashboard 页面提供核心交互能力：

- **配合 rule-scoring-engine**：`useCountUp` 展示评分统计数据（S 级项目数、平均分等）
- **配合 data-audit-toolkit**：`useDebounce` 实现项目筛选搜索的防抖输入
- **配合 react-pdf-export**：两个前端 Skill 共享 React 环境，可同时使用不冲突
- **配合 admin-auth-system**：`useKeyboardShortcuts` 为管理后台提供快捷键操作体验