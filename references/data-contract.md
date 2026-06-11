# react-ui-hooks 数据契约

> **路由提醒**：本文档定义所有 Hooks 的公共接口契约，供 TypeScript 类型检查、单元测试和跨 Skill 集成使用。

---

## 一、Hooks 接口定义

### useKeyboardShortcuts

```typescript
interface Shortcut {
  keys: string[]       // 按键组合，如 ['ctrl', 'k']、['Escape']
  handler: () => void  // 触发回调
  description: string  // 快捷键描述（用于帮助面板 / a11y）
}

function useKeyboardShortcuts(shortcuts: Shortcut[]): void
```

### useCountUp

```typescript
interface CountUpOptions {
  end: number                          // 目标数值（必填）
  duration?: number                    // 动画时长(ms)，默认 1500
  delay?: number                       // 延迟触发(ms)，默认 0
  prefix?: string                      // 前缀，如 '$'
  suffix?: string                      // 后缀，如 '+'
  formatter?: (value: number) => string  // 自定义格式化，返回值直接写入 textContent
}

interface CountUpResult {
  display: string                      // 初始显示文本（动画前的占位值）
  ref: React.RefObject<HTMLDivElement> // 绑定到目标 DOM 元素
}

function useCountUp(options: CountUpOptions): CountUpResult
```

### useInView

```typescript
interface InViewOptions {
  threshold?: number     // 触发阈值 (0–1)，默认 0.1
  rootMargin?: string    // 根元素边距，默认 '200px'
  triggerOnce?: boolean  // 是否只触发一次，默认 true
}

interface InViewResult {
  ref: React.RefObject<HTMLDivElement>  // 绑定到目标元素
  inView: boolean                       // 实时可见性状态
  shouldRender: boolean                 // 是否应渲染（triggerOnce 时首次为 true 后恒为 true）
}

function useInView(options?: InViewOptions): InViewResult
```

### useDebounce

```typescript
/**
 * @param value - 需要防抖的任意类型值
 * @param delay - 延迟时间(ms)，默认 300
 * @returns 防抖后的值（类型保持与 value 一致）
 */
function useDebounce<T>(value: T, delay?: number): T
```

### useScrollToTop

```typescript
interface ScrollToTopResult {
  visible: boolean           // 回到顶部按钮是否可见
  scrollToTop: () => void    // 平滑滚动到顶部（behavior: 'smooth'）
}

/**
 * @param threshold - 显示按钮的滚动阈值(px)，默认 400
 * @returns visible 和 scrollToTop
 */
function useScrollToTop(threshold?: number): ScrollToTopResult
```

---

## 二、运行时约束

| Hook | 最小 React 版本 | 依赖浏览器 API | 清理机制 |
|------|----------------|---------------|---------|
| useKeyboardShortcuts | 16.8 | `window.addEventListener('keydown')` | removeEventListener |
| useCountUp | 16.8 | IntersectionObserver, requestAnimationFrame | cancelAnimationFrame, unobserve |
| useInView | 16.8 | IntersectionObserver | disconnect |
| useDebounce | 16.8 | setTimeout | clearTimeout |
| useScrollToTop | 16.8 | element.addEventListener('scroll') | removeEventListener |

---

## 三、TypeScript 兼容性

### 支持的 TypeScript 版本

| TypeScript | React 类型版本 | 状态 |
|-----------|---------------|------|
| 4.0–4.9 | @types/react ^17 | ✅ 兼容 |
| 5.0+ | @types/react ^18 | ✅ 兼容 |
| 5.0+ | @types/react ^19 | ✅ 兼容（需 tsconfig strict 模式） |

### 推荐的 tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "esModuleInterop": true
  }
}
```

---

## 四、版本兼容矩阵

| Hook | React 16.8 | React 17 | React 18 | React 19 | Next.js 13+ | Remix |
|------|-----------|----------|----------|----------|-------------|-------|
| useKeyboardShortcuts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| useCountUp | ✅ | ✅ | ✅ * | ✅ | ✅ | ✅ |
| useInView | ✅ | ✅ | ✅ * | ✅ | ✅ | ✅ |
| useDebounce | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| useScrollToTop | ✅ | ✅ | ✅ | ✅ | ✅ ** | ✅ |

> \* React 18 Strict Mode 下开发环境动画会触发两次（正常现象，生产不受影响）
> \** Next.js 中 `document.querySelector('main')` 需确保 `<main>` 在客户端渲染

---

## 五、集成契约

### 与 react-pdf-export 共享环境

两个 Skill 都是纯前端模块，共享同一个 React 运行时：

```tsx
// react-pdf-export 的 ExportPage 和 react-ui-hooks 可在同一组件中共存
import { ExportPage } from '@/components/ExportPage'
import { useCountUp, useKeyboardShortcuts } from '@/hooks'

function ReportPage() {
  const { display, ref } = useCountUp({ end: 3400, suffix: '+' })
  useKeyboardShortcuts([
    { keys: ['ctrl', 'p'], handler: () => exportPdf(), description: '导出 PDF' }
  ])

  return (
    <ExportPage title="竞品分析报告" fileName="report.pdf">
      <div ref={ref}>{display}</div>
    </ExportPage>
  )
}
```

### 与 admin-auth-system 共享环境

管理后台页面可同时使用认证系统和 UI Hooks：

```tsx
import { useKeyboardShortcuts } from '@/hooks'
import { authMiddleware } from '@/middleware/auth'

function AdminPage() {
  useKeyboardShortcuts([
    { keys: ['ctrl', 's'], handler: saveConfig, description: '保存配置' },
    { keys: ['ctrl', 'l'], handler: logout, description: '退出登录' }
  ])
  // ...
}
```

---

## 六、类型测试（编译期验证）

```typescript
// 以下代码在 TypeScript strict 模式下应通过类型检查：

// useDebounce 泛型保持
const s: string = useDebounce('hello', 300)
const n: number = useDebounce(42, 500)
const arr: string[] = useDebounce(['a', 'b'], 200)

// useCountUp 使用自定义 formatter
const { display } = useCountUp({
  end: 100,
  formatter: (val: number) => `$${val.toFixed(2)}`  // 返回 string
})
// display: string ✅

// useInView ref 类型
const { ref } = useInView()
// ref: React.RefObject<HTMLDivElement> ✅

// useScrollToTop 返回值
const { visible, scrollToTop } = useScrollToTop(400)
// visible: boolean ✅
// scrollToTop: () => void ✅
// scrollToTop() 调用无参数 ✅
```