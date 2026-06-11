# useKeyboardShortcuts — 全局键盘快捷键

> **路由提醒**：本 Hook 用于全局键盘快捷键场景。如果是组件内部键盘事件处理（如表单 Enter 提交），直接用 `onKeyDown` 属性即可。

## 功能概述

全局键盘快捷键 Hook，支持组合键绑定，自动忽略输入框内的触发。

## 路由提醒

- **何时使用**：Dashboard 全局快捷键、编辑器快捷键、命令面板
- **何时不用**：表单内部 Enter 提交、组件级键盘事件（用 `onKeyDown`）
- **关键约束**：`shortcuts` 数组引用变化会重新绑定事件，务必用 `useMemo` 稳定引用
- **输入框处理**：单键快捷键（如 Escape）在输入框内自动忽略，组合键（如 Ctrl+K）仍生效
- **Mac 兼容**：`Ctrl` 键在 Mac 上自动映射为 `Cmd` 键

## 类型定义

```typescript
interface Shortcut {
  keys: string[]      // 按键组合，如 ['ctrl', 'k'] 或 ['Escape']
  handler: () => void // 触发的回调函数
  description: string // 快捷键描述（用于帮助文档）
}
```

## 实现代码

```typescript
import { useEffect } from 'react'

/**
 * 全局键盘快捷键 Hook
 * @param shortcuts - 快捷键配置数组
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable

      for (const shortcut of shortcuts) {
        const modifiers: Record<string, boolean> = { 
          ctrl: e.ctrlKey || e.metaKey,  // 支持 Mac 的 Cmd 键
          shift: e.shiftKey, 
          alt: e.altKey 
        }
        const keyParts = shortcut.keys.map(k => k.toLowerCase())
        const pressedKey = e.key.toLowerCase()

        const requiredMods = keyParts.filter(k => k in modifiers)
        const requiredKey = keyParts.find(k => !(k in modifiers))

        const modsMatch = requiredMods.every(k => modifiers[k])
        const keyMatch = requiredKey ? pressedKey === requiredKey : true

        if (modsMatch && keyMatch) {
          // 输入框中只忽略单键快捷键，组合键仍然生效
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
```

## 使用示例

```tsx
import { useKeyboardShortcuts } from '@/hooks'

function App() {
  const openSearch = () => setSearchOpen(true)
  const closeModal = () => setModalOpen(false)
  const saveData = () => save()

  useKeyboardShortcuts([
    { keys: ['ctrl', 'k'], handler: openSearch, description: '打开搜索' },
    { keys: ['Escape'], handler: closeModal, description: '关闭弹窗' },
    { keys: ['ctrl', 's'], handler: saveData, description: '保存数据' },
    { keys: ['ctrl', 'shift', 'p'], handler: openPalette, description: '命令面板' }
  ])

  return <div>...</div>
}
```

## 支持的修饰键

| 修饰键 | 说明 |
|--------|------|
| ctrl | Ctrl 键（Mac 上映射为 Cmd） |
| shift | Shift 键 |
| alt | Alt 键（Mac 上为 Option） |

## 注意事项

1. 单键快捷键在输入框中会被忽略
2. 组合键快捷键在输入框中仍然生效
3. 支持 Mac 的 Cmd 键（映射为 ctrl）
4. shortcuts 数组变化时会自动重新绑定