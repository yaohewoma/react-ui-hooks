# 故障排查 — react-ui-hooks

> **快速定位**：如果不知道问题属于哪一类，按 Ctrl+F 搜索症状关键词。

---

## 一、运行错误

### 1. `Invalid hook call`

**症状**：
```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
```

**原因**：
- 在类组件中调用 Hook
- 在普通 JavaScript 函数中调用 Hook
- React 版本 < 16.8

**排查步骤**：
1. 检查调用 Hook 的函数是否是 React 函数组件（首字母大写，返回 JSX）
2. 检查 `package.json` 中 react 版本是否 ≥ 16.8
3. 检查是否有多个 React 副本（`npm ls react` 看是否有重复）

**解决方案**：
```tsx
// ❌ 类组件
class MyComponent extends React.Component {
  render() {
    const { display } = useCountUp({ end: 100 })  // 错误！
  }
}

// ✅ 函数组件
function MyComponent() {
  const { display } = useCountUp({ end: 100 })  // 正确
  return <div>{display}</div>
}
```

### 2. `Cannot read property 'addEventListener' of null`（useCountUp / useInView）

**症状**：页面加载后控制台报 null reference 错误。

**原因**：ref 绑定的 DOM 元素还未挂载时 Hook 已执行。

**排查步骤**：
1. 确认 ref 绑定到了实际渲染的 DOM 元素
2. 确认组件没有被条件渲染提前移除

**解决方案**：Hook 内部已对 `ref.current` 做空值检查，此错误通常意味着 ref 绑定到了条件渲染的元素上。确保包含 ref 的元素始终被渲染：

```tsx
// ❌
{show && <div ref={ref}>{display}</div>}  // show 为 false 时 ref.current 为 null

// ✅
<div ref={ref}>{show ? display : ''}</div>  // div 始终存在
```

### 3. `IntersectionObserver is not defined`

**症状**：Safari < 12.1、IE 等旧浏览器中 useCountUp / useInView 不工作。

**原因**：旧浏览器不支持 IntersectionObserver API。

**解决方案**：
```bash
npm install intersection-observer
```

```tsx
// 在入口文件顶部添加
import 'intersection-observer'
```

### 4. useCountUp 数字始终显示 "0"

**症状**：动画不播放，始终显示初始值。

**原因**（按可能性排序）：
1. 忘记将 ref 绑定到 DOM 元素
2. 元素一直在视口外
3. 元素被 `display: none` 隐藏
4. 动画在 React Strict Mode 下被双重触发后取消

**排查步骤**：
1. 检查 JSX：`<div ref={ref}>{display}</div>` — ref 和 display 都必须有
2. 在浏览器 DevTools > Elements 中检查元素位置
3. 确认元素没有 `display: none` 或 `visibility: hidden`
4. 关闭 Strict Mode 测试（生产环境不受影响）

**解决方案**：
```tsx
// ❌ 忘记绑定 ref
const { display, ref } = useCountUp({ end: 3400 })
return <div>{display}</div>

// ❌ 忘记显示 display
const { display, ref } = useCountUp({ end: 3400 })
return <div ref={ref}></div>

// ✅ 正确
const { display, ref } = useCountUp({ end: 3400 })
return <div ref={ref}>{display}</div>
```

---

## 二、使用问题

### 5. useKeyboardShortcuts 在输入框中仍然触发

**症状**：在 `<input>` 中按下 Escape 键，弹窗被关闭了。

**原因**：这是**设计行为**——只有单键快捷键（如 `['Escape']`）在输入框中会被忽略，组合键（`['ctrl', 'Escape']`）仍然生效。如果你注册了单键 Escape 且弹窗关闭了，说明你的 `keys` 配置不是 `['Escape']` 而是携带了修饰键。

**解决方案**：检查你的 shortcuts 配置，确认 Escape 的 keys 确实是 `['Escape']`（单键）。

### 6. useKeyboardShortcuts 完全不生效

**症状**：按下快捷键没有任何反应。

**原因**（按可能性排序）：
1. shortcuts 数组是内联的，每次渲染都重新创建
2. 目标元素被其他事件监听器拦截
3. 快捷键组合已被浏览器占用（如 Ctrl+T 打开新标签页）

**排查步骤**：
1. 用 `useMemo` 包裹 shortcuts 数组
2. 在浏览器 DevTools > Console 中加 `console.log` 确认 handler 被调用
3. 检查是否有其他全局 keydown 监听器调用了 `e.stopPropagation()`

**解决方案**：
```tsx
// ❌ 每次渲染重新绑定
useKeyboardShortcuts([
  { keys: ['ctrl', 'k'], handler: openSearch, description: '搜索' }
])

// ✅ 稳定引用
const shortcuts = useMemo(() => [
  { keys: ['ctrl', 'k'], handler: openSearch, description: '搜索' }
], [])
useKeyboardShortcuts(shortcuts)
```

### 7. useInView 在元素首次渲染时（已在视口内）不触发

**症状**：元素从一开始就在视口内，但 `shouldRender` 仍然是 false。

**原因**：IntersectionObserver 只在元素**进入**视口时触发回调。如果元素挂载时已在视口内，不会触发 `isIntersecting` 状态变化。

**解决方案**：Hook 已处理此边界情况——`shouldRender` 计算逻辑为 `hasBeenInView || inView`，首次渲染时 `inView` 为 false（初始状态），但如果元素一开始就在视口内，IntersectionObserver 会在 `observe()` 调用后立即触发一次回调。

如果仍然不触发，检查：
- 元素是否被 `overflow: hidden` 的父元素裁剪
- 是否设置了 `rootMargin: '-100px'`（负值会缩小检测区域）

### 8. useDebounce 初始值触发了不必要的请求

**症状**：页面加载时立即发起了一次 API 请求。

**原因**：`useDebounce` 的初始返回值等于 `value` 的初始值。如果初始值不为空字符串，会触发 `useEffect`。

**解决方案**：
```tsx
// ✅ 跳过空值
const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300)

useEffect(() => {
  if (debouncedSearch) {  // 跳过空字符串
    fetchResults(debouncedSearch)
  }
}, [debouncedSearch])
```

### 9. useScrollToTop 不生效 / 点击无反应

**症状**：点击回到顶部按钮后页面没有滚动。

**原因**（按可能性排序）：
1. 滚动容器不是 `<main>` 元素
2. `<main>` 元素没有设置 `overflow: auto` 或 `overflow: scroll`
3. 页面滚动发生在 `window` 而非 `<main>` 上

**排查步骤**：
1. 打开 DevTools > Elements，搜索 `<main` 确认元素存在
2. 检查 `<main>` 的 computed styles，确认 `overflow` 不是 `visible`
3. 在 Console 中执行 `document.querySelector('main').scrollTop` 看返回值

**解决方案**：
```html
<!-- ✅ 确保 <main> 是滚动容器 -->
<main className="h-screen overflow-auto">
  <!-- 长内容 -->
</main>
```

如果滚动容器不是 `<main>`，需修改 Hook 源码中的选择器。

### 10. 多个 useCountUp 同时播放性能下降

**症状**：20+ 个统计数字同时滚动时出现轻微卡顿。

**原因**：虽然每个实例不触发 React 渲染，但每帧仍在执行 JavaScript 计算和 DOM 写入。

**解决方案**（按推荐顺序）：
```tsx
// 方案 1：错开启动时间（最推荐）
const stat1 = useCountUp({ end: 1000, delay: 0 })
const stat2 = useCountUp({ end: 2000, delay: 150 })
const stat3 = useCountUp({ end: 3000, delay: 300 })
// ...依次递增

// 方案 2：减少动画时长
const stat = useCountUp({ end: 1000, duration: 800 })

// 方案 3：使用 useInView 分组触发
// 不在同一屏的动画延迟到进入视口时才触发
```

### 11. 组件卸载后 useCountUp 报错

**症状**：
```
Warning: Can't perform a React state update on an unmounted component.
```

**原因**：动画过程中的 setTimeout 回调在组件已卸载后尝试 setState。

**解决方案**：Hook 内部使用 `cancelledRef` 防止此问题。如果仍出现此警告，检查是否在动画过程中有条件渲染移除了元素：
```tsx
// ❌ 动画期间移除元素
{showAnimation && <Counter />}

// ✅ 动画完成后再移除，或使用 CSS visibility 代替条件渲染
<Counter style={{ visibility: showAnimation ? 'visible' : 'hidden' }} />
```

---

## 三、性能问题

### 12. 页面整体卡顿 / React DevTools Profiler 火焰图满屏

**症状**：Dashboard 加载后页面响应缓慢，滚动不流畅。

**排查步骤**：
1. 打开 React DevTools → Profiler → 录制 → 检查是否有高频渲染
2. 检查是否错误地在 useCountUp 外层使用了 useState
3. 检查是否有其他组件在 useCountUp 动画期间触发大量渲染

**诊断**：
```tsx
// ❌ 反模式：在 useCountUp 外层包 useState 手动控制
function BadCounter() {
  const [count, setCount] = useState(0)  // 手动 state
  const { ref } = useCountUp({ end: 1000 })
  // count 变化 → 重渲染 → useCountUp 重新执行 → 更多重渲染
}

// ✅ useCountUp 已经内部管理动画和渲染
function GoodCounter() {
  const { display, ref } = useCountUp({ end: 1000 })
  return <div ref={ref}>{display}</div>
}
```

### 13. 应用启动慢 / 首屏加载阻塞

**症状**：首次打开页面时出现明显白屏。

**原因**：所有 Hook 文件被同步 import 到入口文件。

**解决方案**：如果确认是 Hooks 文件导致的，使用动态导入（但通常不需要，因为 Hooks 文件不含重型依赖）：
```tsx
// 仅在需要懒加载的组件中使用
const LazyDashboard = React.lazy(() => import('./Dashboard'))
```

---

## 四、兼容性问题

### 14. TypeScript 类型错误

**症状**：
```
Type 'RefObject<HTMLDivElement>' is not assignable to type 'LegacyRef<HTMLDivElement>'
```

**原因**：React 18+ 的类型定义变化。

**解决方案**：
```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["react/next"]  // 或 "@types/react": "^18.0.0"
  }
}
```

### 15. React 18 Strict Mode 下动画触发两次

**症状**：开发环境下 useCountUp 动画每次播放两遍。

**原因**：React 18 Strict Mode 会双重调用 useEffect 以检测副作用问题。

**说明**：这是开发模式特有行为，**生产构建不受影响**。Hook 内部已处理清理逻辑，双重调用不会造成内存泄漏，但动画在开发模式会播放两次是正常现象。

### 16. Next.js SSR 报错

**症状**：
```
ReferenceError: document is not defined
```

**原因**：`useScrollToTop` 在服务端渲染时尝试 `document.querySelector('main')`。

**解决方案**：Hook 内部已通过 useEffect 延迟到客户端执行，如果有自定义包装，确保 DOM 操作在 useEffect 中：
```tsx
// ✅ 所有 DOM 操作在 useEffect 内
useEffect(() => {
  const el = document.querySelector('main')  // 客户端才执行
}, [])
```

### 17. 低端 Android 设备动画掉帧

**症状**：Chrome for Android 上 useCountUp 动画不流畅。

**解决方案**：
```tsx
// 1. 缩短动画时长
const { ref } = useCountUp({ end: 1000, duration: 800 })

// 2. 减少同时播放的动画数
// 3. 检测设备性能，动态降级
const isMobile = /Android|iPhone/.test(navigator.userAgent)
const duration = isMobile ? 800 : 2000
```

---

## 五、集成问题

### 18. 与其他状态管理库（Redux/Zustand）的冲突

**症状**：使用 Redux 后 useCountUp 动画不流畅。

**原因**：Redux 的状态更新触发了包含 useCountUp 元素的祖先组件重渲染，导致 DOM 节点被替换（textContent 被覆盖）。

**解决方案**：将 useCountUp 所在组件用 `React.memo` 包裹，避免无关状态变化导致的重渲染：
```tsx
const StatCard = React.memo(function StatCard({ end, suffix }) {
  const { display, ref } = useCountUp({ end, suffix })
  return <div ref={ref}>{display}</div>
})
```

### 19. 与 React Router 的快捷键冲突

**症状**：定义了 Ctrl+K 快捷键，但浏览器地址栏先获取焦点。

**解决方案**：`useKeyboardShortcuts` 在 handler 中调用了 `e.preventDefault()`，按优先级应拦截浏览器默认行为。如果仍被浏览器拦截，说明有更早注册的监听器——检查浏览器扩展或路由库的全局快捷键。

### 20. 使用 TailwindCSS 时动画数字样式被覆盖

**症状**：useCountUp 的数字不显示或样式异常。

**原因**：Tailwind 的 `@layer base` 或全局样式重置了元素的初始内容。

**解决方案**：确保包含 ref 的元素在 JSX 中有明确的初始内容：
```tsx
<div ref={ref} className="text-4xl font-bold tabular-nums">
  {display}  {/* display 是 "0" 等初始值 */}
</div>
```
`tabular-nums` 类确保数字宽度一致，避免动画过程中的布局抖动。