# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 **JSON Render** 演示项目，展示如何通过 Zod Schema 约束 AI 输出，并将 JSON 渲染为真实的 Ant Design 组件。

核心价值：AI 只能生成 Catalog 中定义的组件，输出完全可控。

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 核心架构

项目采用 **四层架构**：

```
┌─────────────────────────────────────────────────────────┐
│  Catalog Layer (分层 Catalog)                            │
│  ├─ primitives: 原子组件 (Button, Input, ...)            │
│  ├─ compound: 复合组件 (Card, Table, ...)               │
│  ├─ business: 业务组件 (UserCard, ...)                  │
│  ├─ templates: 布局模板 (DashboardLayout, ...)          │
│  └─ tokens: Design Tokens                                │
├─────────────────────────────────────────────────────────┤
│  Action Layer (Action 系统)                               │
│  ├─ ActionExecutor: 安全执行引擎                          │
│  ├─ 白名单机制                                            │
│  ├─ 参数清理 (防注入)                                     │
│  └─ Zod Schema 校验                                      │
├─────────────────────────────────────────────────────────┤
│  State Layer (响应式状态)                                 │
│  ├─ ReactiveState: 响应式状态系统                         │
│  ├─ StateManager: 状态管理器                              │
│  ├─ 绑定表达式: {{state.xxx}}                            │
│  └─ 监听器/计算属性                                       │
└─────────────────────────────────────────────────────────┘
                          ↓ 渲染
┌─────────────────────────────────────────────────────────┐
│  Render Layer (JsonRenderer.tsx)                         │
│  └─ renderNode(): 递归渲染 antd 组件                      │
└─────────────────────────────────────────────────────────┘
```

### 目录结构

```
src/
├── core/                    # 核心系统
│   ├── Catalog.ts          # 分层 Catalog (primitives/compound/business)
│   └── types/              # 类型定义
│       └── core.ts         # 核心类型 (JsonNode, JsonSchema, etc.)
├── actions/                 # Action 系统
│   └── ActionExecutor.ts   # Action 执行器 (白名单、校验、沙箱)
├── state/                   # 状态管理
│   └── ReactiveState.ts    # 响应式状态 (绑定、监听、计算)
├── utils/                   # 工具函数
│   ├── helpers.ts          # 辅助函数 (类型推导、处理)
│   ├── schemaValidator.ts  # 旧版校验器 (兼容)
│   └── enhancedSchemaValidator.ts  # 新版校验器 (分层 Catalog)
├── components/              # 渲染组件
│   └── JsonRenderer.tsx    # JSON → antd 渲染器
├── catalog/                 # 旧版 Catalog (兼容)
│   └── antd-catalog.ts     # 扁平组件目录
├── examples/                # 示例
│   ├── dashboard.json      # Dashboard JSON Schema
│   └── advanced-usage.ts   # 高级功能示例
├── App.tsx                  # 主应用
└── main.tsx                 # 入口
```

## 关键文件说明

### 核心系统

- **src/core/Catalog.ts**: 分层 Catalog 系统
  - 使用 `CatalogBuilder` 构建和扩展 Catalog
  - 支持继承和组合
  - 包含 Design Tokens

- **src/core/types/core.ts**: 核心类型定义
  - `JsonNode`, `JsonSchema`
  - `ComponentSchema`, `TemplateSchema`
  - `DesignTokens`
  - `TypedAction`, `ActionResult`

### Action 系统

- **src/actions/ActionExecutor.ts**: Action 执行引擎
  - `register()`: 注册 Action
  - `execute()`: 执行 Action（带校验和清理）
  - `createBuiltinActions()`: 创建内置 Actions
  - 安全特性：白名单、参数清理、超时控制

### 状态管理

- **src/state/ReactiveState.ts**: 响应式状态系统
  - `get()`: 路径访问 (state.user.name)
  - `set()`: 路径设置
  - `watch()`: 添加监听器
  - `computed()`: 添加计算属性
  - `parseBinding()`: 解析绑定表达式

### 工具函数

- **src/utils/helpers.ts**: 辅助函数
  - `toPascalCase()`, `toCamelCase()`, `toKebabCase()`
  - `deepMerge()`, `deepClone()`
  - `debounce()`, `throttle()`, `retry()`

- **src/utils/enhancedSchemaValidator.ts**: 增强的 Schema 校验器
  - 使用分层 Catalog 进行校验
  - `validateSchema()`: 校验 JSON Schema
  - `formatValidationResult()`: 格式化校验结果

## 使用新功能

### 1. 使用分层 Catalog

```typescript
import { defaultCatalog, CatalogBuilder } from './core/Catalog';

// 使用默认 Catalog
const components = {
  ...defaultCatalog.primitives,
  ...defaultCatalog.compound,
  ...defaultCatalog.business
};

// 扩展 Catalog
const customCatalog = new CatalogBuilder()
  .extend(defaultCatalog)
  .addBusiness('MyComponent', { /* ... */ })
  .build();
```

### 2. 使用 Action 执行器

```typescript
import { ActionExecutor, createBuiltinActions } from './actions/ActionExecutor';

const executor = new ActionExecutor({
  enableSanitization: true,
  enableLogging: true
});

executor.registerAll(createBuiltinActions());

// 执行 Action
const result = await executor.execute('navigate', {
  path: '/dashboard',
  query: { tab: 'overview' }
});
```

### 3. 使用响应式状态

```typescript
import { StateManager } from './state/ReactiveState';

const manager = new StateManager({
  user: { name: 'Alice' },
  count: 0
});

// 获取和设置
manager.set('user.name', 'Bob');
console.log(manager.get('user.name')); // 'Bob'

// 监听变化
manager.watch('count', (newValue, oldValue) => {
  console.log(`count: ${oldValue} → ${newValue}`);
});

// 计算属性
manager.getState().computed('doubledCount', (state) => {
  return state.get('count') * 2;
});
```

## JSON Schema 格式

```typescript
{
  "version": "1.0.0",
  "component": {
    "type": "Card",
    "props": { "title": "Dashboard" },
    "children": [
      {
        "type": "Button",
        "props": {
          "type": "primary",
          "children": "Submit",
          "onClick": "submitForm"  // 引用 Action
        }
      }
    ]
  },
  "state": {
    "initialValues": {
      "formData": {}
    }
  },
  "actions": {
    "submitForm": {
      "type": "api.request",
      "url": "/api/submit",
      "method": "POST"
    }
  }
}
```

## 添加新组件的步骤

### 方式 1: 使用分层 Catalog (推荐)

1. 在 `src/core/Catalog.ts` 中添加组件到对应层级：
   - 原子组件 → `primitiveComponents`
   - 复合组件 → `compoundComponents`
   - 业务组件 → `businessComponents`

2. 在 `src/components/JsonRenderer.tsx` 的 `componentMap` 中添加映射

### 方式 2: 兼容旧版

1. 在 `src/catalog/antd-catalog.ts` 的 `components` 中添加
2. 在 `src/components/JsonRenderer.tsx` 的 `componentMap` 中添加映射

## 技术栈

- React 19 + TypeScript
- Vite
- Ant Design 6
- Zod 4 (Schema 校验)

## 部署配置

- 部署到 GitHub Pages: `vite.config.ts` 中 `base: '/json-render-demo/'`
- 构建输出: `dist/` 目录
