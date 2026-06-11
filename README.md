# react-ui-hooks

> **一句话**：5 个高性能 Hook，数字动画零卡顿

React 通用 Hooks 集合，包含键盘快捷键、数字滚动动画、视口检测、防抖和回到顶部。每个 Hook 都针对性能做了优化（直接操作 DOM、共享 IntersectionObserver）。

## 快速开始

```bash
# 查看综合演示
cat examples/basic-usage.tsx

# 在项目中使用
import { useCountUp } from './hooks/useCountUp';
import { useInView } from './hooks/useInView';
```

## 模块地图

| 目录/文件 | 说明 |
|-----------|------|
| `SKILL.md` | Skill 主文档 |
| `examples/` | 5 个 Hook 的综合演示页面 |
| `references/` | 每个 Hook 的详细设计文档 |
| `tests/` | 测试用例 |
| `CHANGELOG.md` | 变更日志 |

## Hooks 清单

| Hook | 说明 | 性能优化 |
|------|------|---------|
| `useKeyboardShortcuts` | 全局键盘快捷键 | 忽略 input/textarea/select |
| `useCountUp` | 数字滚动动画 | 直接操作 DOM（useRef + rAF） |
| `useInView` | 元素视口检测 | 共享 IntersectionObserver |
| `useDebounce` | 防抖值 | 标准防抖实现 |
| `useScrollToTop` | 回到顶部按钮 | 监听 main 元素滚动 |

## 适用场景

- React 管理后台通用 UI 交互
- 数据看板数字动画
- 长列表懒加载
- 搜索框防抖

## GitHub

https://github.com/yaohewoma/react-ui-hooks