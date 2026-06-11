/**
 * react-ui-hooks 自包含演示文件
 *
 * 使用方法：将此文件直接复制到任何 React 项目中即可运行
 *   npm create vite@latest my-demo -- --template react-ts
 *   复制此文件替换 src/App.tsx
 *   npm run dev
 *
 * 所有 Hook 实现内联在此文件中，无需外部依赖。
 * 演示 5 个 Hook 的全部功能 + 边缘场景 + 组合使用。
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// ==================== Hook 实现（自包含，可直接复制到项目中使用） ====================

// --- useDebounce ---
function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// --- useScrollToTop ---
function useScrollToTop(threshold = 400) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const container = document.querySelector('main')
    if (!container) return
    const handleScroll = () => setVisible(container.scrollTop > threshold)
    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [threshold])
  const scrollToTop = useCallback(() => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  return { visible, scrollToTop }
}

// --- useKeyboardShortcuts ---
type Shortcut = { keys: string[]; handler: () => void; description: string }

function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      for (const shortcut of shortcuts) {
        const mods: Record<string, boolean> = { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey }
        const keyParts = shortcut.keys.map(k => k.toLowerCase())
        const pressedKey = e.key.toLowerCase()
        const requiredMods = keyParts.filter(k => k in mods)
        const requiredKey = keyParts.find(k => !(k in mods)) ?? ''
        if (requiredMods.every(k => mods[k]) && pressedKey === requiredKey) {
          if (isInput && shortcut.keys.length === 1) continue
          e.preventDefault()
          shortcut.handler()
          return
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}

// --- 共享 IntersectionObserver（useCountUp 和 useInView 使用不同策略） ---
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
            if (cb) { cb(); observerCallbacks.delete(entry.target); sharedObserver?.unobserve(entry.target) }
          }
        }
      },
      { threshold: 0.3 }
    )
  }
  return sharedObserver
}

// --- useCountUp ---
type CountUpOptions = {
  end: number; duration?: number; delay?: number
  prefix?: string; suffix?: string; formatter?: (v: number) => string
}

function useCountUp({ end, duration = 1500, delay = 0, prefix = '', suffix = '', formatter }: CountUpOptions) {
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cancelledRef = useRef(false)
  const rafRef = useRef(0)

  useEffect(() => {
    cancelledRef.current = false
    return () => { cancelledRef.current = true; if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = getSharedObserver()
    observerCallbacks.set(el, () => setStarted(true))
    obs.observe(el)
    return () => { observerCallbacks.delete(el); obs.unobserve(el) }
  }, [])

  const updateDom = useCallback((value: number) => {
    const el = ref.current
    if (!el) return
    const text = formatter ? formatter(value) : `${prefix}${value.toLocaleString()}${suffix}`
    if (el.textContent !== text) el.textContent = text
  }, [formatter, prefix, suffix])

  useEffect(() => {
    if (!started || !ref.current) return
    const timeout = setTimeout(() => {
      if (cancelledRef.current) return
      const startTime = performance.now()
      const animate = (now: number) => {
        if (cancelledRef.current) return
        const progress = Math.min((now - startTime) / duration, 1)
        updateDom(Math.round((1 - Math.pow(1 - progress, 3)) * end))
        if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
    }, delay)
    return () => clearTimeout(timeout)
  }, [started, end, duration, delay, updateDom])

  const [display] = useState(() => formatter ? formatter(0) : `${prefix}0${suffix}`)
  return { display, ref }
}

// --- useInView ---
type InViewOptions = { threshold?: number; rootMargin?: string; triggerOnce?: boolean }

function useInView({ threshold = 0.1, rootMargin = '200px', triggerOnce = true }: InViewOptions = {}) {
  const [inView, setInView] = useState(false)
  const [hasBeenInView, setHasBeenInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const cleanup = useCallback(() => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null }
  }, [])

  useEffect(() => {
    cleanup()
    if (!ref.current) return
    if (triggerOnce && hasBeenInView) return
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); if (triggerOnce) { setHasBeenInView(true); cleanup() } }
        else { setInView(false) }
      },
      { threshold, rootMargin }
    )
    observerRef.current.observe(ref.current)
    return cleanup
  }, [threshold, rootMargin, triggerOnce, hasBeenInView, cleanup])

  return { ref, inView, shouldRender: triggerOnce ? hasBeenInView || inView : inView }
}


// ==================== 演示组件 ====================

/** 通用区块包装 */
function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section style={{
      margin: '20px 0', border: '1px solid #e2e8f0', borderRadius: 12,
      background: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)'
    }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
        {desc && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{desc}</p>}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </section>
  )
}

// ==================== 演示 1：数字滚动动画 ====================
function CountUpDemo() {
  return (
    <Section title="useCountUp — 数字滚动动画" desc="直接操作 DOM，绕过 React 渲染管线，多个实例共享 1 个 IntersectionObserver">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="已分析项目" end={3400} suffix="+" color="#3b82f6" duration={2000} />
        <StatCard label="审计通过率" end={95.5} suffix="%" formatter={(v) => v.toFixed(1) + '%'} color="#22c55e" duration={1800} />
        <StatCard label="数据总量" end={1250000} prefix="$" formatter={(v) => '$' + (v / 1000000).toFixed(1) + 'M'} color="#f59e0b" duration={2200} />
        <StatCard label="接入技能" end={800} suffix="+" color="#8b5cf6" duration={1600} />
      </div>
    </Section>
  )
}

function StatCard({ label, end, suffix, prefix, formatter, color, duration }: {
  label: string; end: number; suffix?: string; prefix?: string
  formatter?: (v: number) => string; color: string; duration: number
}) {
  const { display, ref } = useCountUp({ end, suffix, prefix, formatter, duration })
  return (
    <div style={{ textAlign: 'center', padding: '24px 16px', borderRadius: 12,
      background: `${color}10`, border: `1px solid ${color}30` }}>
      <div ref={ref} style={{ fontSize: 36, fontWeight: 'bold', color, fontVariantNumeric: 'tabular-nums' }}>
        {display}
      </div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{label}</div>
    </div>
  )
}

// ==================== 演示 2：键盘快捷键 ====================
function KeyboardShortcutsDemo() {
  const [lastKey, setLastKey] = useState('—')
  const [modalOpen, setModalOpen] = useState(false)

  const handleSearch = useCallback(() => setLastKey('Ctrl+K → 打开搜索'), [])
  const handleClose = useCallback(() => { setLastKey('Escape → 关闭弹窗'); setModalOpen(false) }, [])
  const handleSave = useCallback(() => setLastKey('Ctrl+S → 保存'), [])
  const handleHelp = useCallback(() => setLastKey('? → 显示帮助'), [])

  const shortcuts = useMemo(() => [
    { keys: ['ctrl', 'k'], handler: handleSearch, description: '打开搜索' },
    { keys: ['Escape'], handler: handleClose, description: '关闭弹窗' },
    { keys: ['ctrl', 's'], handler: handleSave, description: '保存' },
    { keys: ['?'], handler: handleHelp, description: '显示帮助' },
  ], [handleSearch, handleClose, handleSave, handleHelp])

  useKeyboardShortcuts(shortcuts)

  return (
    <Section title="useKeyboardShortcuts — 全局键盘快捷键" desc="支持组合键，输入框中自动忽略单键快捷键，Mac 自动映射 Cmd 键">
      <div style={{ display: 'flex', gap: 48 }}>
        <div>
          <h4 style={{ margin: '0 0 8px' }}>试试按下这些快捷键：</h4>
          <kbd style={kbdStyle}>Ctrl + K</kbd> 打开搜索<br />
          <kbd style={kbdStyle}>Escape</kbd> 关闭弹窗<br />
          <kbd style={kbdStyle}>Ctrl + S</kbd> 保存<br />
          <kbd style={kbdStyle}>?</kbd> 帮助<br />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>最后触发的快捷键：</p>
          <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 18, fontWeight: 600 }}>
            {lastKey}
          </div>
          <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
            在下方输入框中按 <kbd style={kbdStyle}>Escape</kbd> 不会被拦截（自动忽略输入框内的单键快捷键）
          </p>
          <input placeholder="在这里输入文字，按 Escape 不会被拦截..." style={inputStyle} />
        </div>
      </div>
    </Section>
  )
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '2px 8px', fontSize: 12, fontWeight: 600, lineHeight: '20px',
  color: '#1e293b', background: '#f1f5f9', border: '1px solid #cbd5e1',
  borderRadius: 4, minWidth: 24, marginRight: 4
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 16px', fontSize: 14, borderRadius: 8,
  border: '1px solid #cbd5e1', marginTop: 12, boxSizing: 'border-box'
}

// ==================== 演示 3：视口检测 ====================
function InViewDemo() {
  const { ref: lazyRef1, shouldRender: show1 } = useInView({ rootMargin: '200px', triggerOnce: true })
  const { ref: lazyRef2, shouldRender: show2 } = useInView({ rootMargin: '100px', triggerOnce: true })
  const { ref: animRef, inView } = useInView({ threshold: 0.3, triggerOnce: true })

  return (
    <Section title="useInView — 视口检测" desc="懒加载 + 滚动动画触发。元素进入视口前 200px 开始渲染，triggerOnce 只触发一次">
      {/* 懒加载区块 */}
      <div ref={lazyRef1} style={{ minHeight: 120, marginBottom: 16 }}>
        {show1 ? (
          <div style={{ padding: 16, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
            ✅ 懒加载区块 1 — 已渲染（距视口 200px 时提前触发）
          </div>
        ) : (
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#94a3b8', textAlign: 'center' }}>
            区块 1 等待进入视口...
          </div>
        )}
      </div>

      <div ref={lazyRef2} style={{ minHeight: 120, marginBottom: 16 }}>
        {show2 ? (
          <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            ✅ 懒加载区块 2 — 已渲染（距视口 100px 时触发）
          </div>
        ) : (
          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, color: '#94a3b8', textAlign: 'center' }}>
            区块 2 等待进入视口...
          </div>
        )}
      </div>

      {/* 滚动动画区块 */}
      <div ref={animRef} style={{
        padding: 20, background: inView ? '#fef3c7' : '#f8fafc',
        borderRadius: 8, border: `1px solid ${inView ? '#fcd34d' : '#e2e8f0'}`,
        transition: 'all 0.6s ease', transform: inView ? 'translateY(0)' : 'translateY(20px)',
        opacity: inView ? 1 : 0.4
      }}>
        {inView ? '🎯 滚动动画已触发 — 元素进入视口 30% 时播放' : '滚动动画等待触发...'}
      </div>
    </Section>
  )
}

// ==================== 演示 4：搜索防抖 ====================
function DebounceDemo() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [result, setResult] = useState('')

  useEffect(() => {
    if (debouncedQuery) {
      // 模拟 API 调用
      setResult(`搜索 "${debouncedQuery}" 的结果将在此显示（已防抖，停止输入 300ms 后触发）`)
    } else {
      setResult('')
    }
  }, [debouncedQuery])

  return (
    <Section title="useDebounce — 输入防抖" desc="延迟 300ms 返回稳定值，避免每次按键都触发 API 请求">
      <input
        placeholder="输入关键词搜索（停止输入 300ms 后触发）..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={inputStyle}
      />
      <div style={{ marginTop: 12, display: 'flex', gap: 24, fontSize: 13, color: '#64748b' }}>
        <span>原始值：<code style={codeStyle}>{query || '(空)'}</code></span>
        <span>防抖值：<code style={codeStyle}>{debouncedQuery || '(空)'}</code></span>
        {query !== debouncedQuery && <span style={{ color: '#f59e0b' }}>⏳ 等待中...</span>}
      </div>
      {result && (
        <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 14 }}>
          {result}
        </div>
      )}
    </Section>
  )
}

const codeStyle: React.CSSProperties = {
  padding: '1px 6px', fontSize: 13, background: '#f1f5f9', borderRadius: 4,
  fontFamily: 'monospace', color: '#334155'
}

// ==================== 演示 5：回到顶部 ====================
function ScrollToTopDemo() {
  const { visible, scrollToTop } = useScrollToTop(400)

  return (
    <Section title="useScrollToTop — 回到顶部" desc={`监听 main 元素滚动，超过 400px 显示按钮（当前：${visible ? '✅ 可见' : '⏳ 不可见'}）`}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div style={{ flex: 1, fontSize: 14, color: '#475569' }}>
          <p>向下滚动页面以触发"回到顶部"按钮 →</p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>
            默认监听 <code>&lt;main&gt;</code> 元素的滚动事件，<br />
            threshold 默认 400px，使用 passive 滚动监听优化性能
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 64, height: 64, borderRadius: '50%',
          background: visible ? '#3b82f6' : '#e2e8f0',
          color: visible ? '#fff' : '#94a3b8',
          transition: 'all 0.3s ease',
          cursor: visible ? 'pointer' : 'default',
          fontSize: 28, fontWeight: 'bold',
          boxShadow: visible ? '0 4px 12px rgba(59,130,246,.4)' : 'none'
        }} onClick={visible ? scrollToTop : undefined} aria-label="回到顶部">
          ↑
        </div>
      </div>
    </Section>
  )
}


// ==================== 综合演示页面 ====================
export default function App() {
  return (
    <main style={{ height: '100vh', overflow: 'auto', background: '#f1f5f9' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
          React UI Hooks — 完整演示
        </h1>
        <p style={{ textAlign: 'center', margin: '0 0 32px', color: '#64748b', fontSize: 14 }}>
          5 个高性能 Hook · 零外部依赖 · TypeScript 就绪 · 直接复制到项目即可使用
        </p>

        <CountUpDemo />
        <KeyboardShortcutsDemo />
        <InViewDemo />
        <DebounceDemo />
        <ScrollToTopDemo />

        {/* 用于触发 useScrollToTop 的占位内容 */}
        <div style={{ height: 120 }} />
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 16 }}>
          ↑ 已到达页面底部。所有 Hook 实现内联在此文件中，可直接复制使用。
        </p>
      </div>
    </main>
  )
}