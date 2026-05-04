# 新 DSL 格式说明

本文档描述 JR-AUI DSL 的新格式特性，这是对原有格式的增强，提供更精确的类型安全和更灵活的绑定机制。

## 格式对比

### 旧格式（Legacy）

```typescript
{
  "version": "1.0.0",
  "component": {
    "type": "Button",
    "props": {
      "type": "primary",
      "children": "Click me"
    }
  },
  "actions": {
    "submitForm": {
      "type": "api.request",
      "url": "/api/submit"
    }
  }
}
```

**特点**：
- 隐式绑定（通过字符串解析）
- 全局 Actions 定义
- 简单直观

### 新格式（Enhanced DSL）

```typescript
{
  "schemaVersion": "1.0.0",
  "catalogVersion": "1.0.0",
  "root": {
    "type": "Button",
    "props": {
      "type": { "type": "const", "value": "primary" },
      "children": { "type": "const", "value": "Click me" }
    },
    "actions": [{ "type": "submitForm", "payload": { "action": "create" } }],
    "meta": { "key": "submit-btn" }
  },
  "state": {
    formData: {}
  }
}
```

**特点**：
- 显式绑定（类型安全）
- 节点级 Actions
- 支持 meta 元数据
- 版本控制更精确

## 核心特性

### 1. 显式绑定表达式

```typescript
// 状态绑定
{ "type": "state", "path": "user.name" }

// 常量
{ "type": "const", "value": "Hello World" }

// Props 绑定（绑定到父组件）
{ "type": "prop", "path": "parent.value" }
```

**优势**：
- 类型安全（TypeScript discriminated union）
- 无需解析字符串
- IDE 自动补全
- 编译时错误检查

### 2. 节点级 Actions

```typescript
{
  "type": "Button",
  "props": { "children": "提交" },
  "actions": [
    { "type": "submitForm", "payload": { "action": "create" } }
  ]
}
```

**对比旧格式**：

```typescript
// 旧格式：Actions 是全局定义的
"actions": {
  "submitForm": { ... }
}

// 引用时使用字符串
"props": { "onClick": "submitForm" }
```

**优势**：
- Actions 与 UI 节点紧密耦合
- 不需要全局 Action 定义
- 支持动态 payload

### 3. 条件渲染

```typescript
{
  "type": "Button",
  "props": { "children": "管理员面板" },
  "meta": {
    "visible": { "type": "state", "path": "user.isAdmin" }
  }
}
```

当 `visible` 为 `false` 时，节点不会渲染。

### 4. 独立 Bindings 声明

```typescript
{
  "type": "Input",
  "props": { "placeholder": "用户名" },
  "bindings": {
    "value": { "type": "state", "path": "form.username" },
    "onChange": { "type": "const", "value": "updateUsername" }
  }
}
```

适用于复杂的绑定场景。

### 5. 版本控制

```typescript
{
  "schemaVersion": "1.0.0",   // DSL 版本
  "catalogVersion": "1.0.0"   // Catalog 版本
}
```

**优势**：
- 明确的版本依赖
- 防止不兼容
- 支持版本迁移

## 类型定义

### 完整类型

```typescript
// 基础类型
type JSONValue =
  | string | number | boolean | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// 绑定表达式
type BindingExpr =
  | { type: "state"; path: string }
  | { type: "prop"; path: string }
  | { type: "const"; value: JSONValue };

// Action 意图
interface ActionIntent {
  type: string;
  payload?: Record<string, JSONValue>;
}

// 节点元数据
interface NodeMeta {
  key?: string;
  visible?: boolean;
  debug?: boolean;
  [key: string]: any;
}

// JSON 节点
interface JsonNode {
  id?: string;
  type: string;
  props?: Record<string, JSONValue | BindingExpr>;
  children?: JsonNode[];
  actions?: ActionIntent[];
  bindings?: Record<string, BindingExpr>;
  meta?: NodeMeta;
}

// JSON Schema
interface JsonSchema {
  schemaVersion: string;
  catalogVersion: string;
  root: JsonNode;
  state?: Record<string, JSONValue>;
  meta?: {
    generatedBy?: string;
    timestamp?: number;
    traceId?: string;
  };
}
```

## 使用示例

### 示例 1: 基础数据绑定

```typescript
const schema: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Card",
    props: { title: { type: "const", value: "用户信息" } },
    children: [
      {
        type: "TypographyText",
        props: {
          children: { type: "state", path: "user.name" }
        }
      }
    ]
  },
  state: {
    user: { name: "Alice" }
  }
};
```

### 示例 2: 节点级 Actions

```typescript
const schema: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Space",
    props: { direction: { type: "const", value: "horizontal" } },
    children: [
      {
        type: "Button",
        props: { children: { type: "const", value: "提交" } },
        actions: [{ type: "submitForm" }]
      },
      {
        type: "Button",
        props: { children: { type: "const", value: "取消" } },
        actions: [{ type: "cancelForm" }]
      }
    ]
  }
};
```

### 示例 3: 条件渲染

```typescript
const schema: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Card",
    children: [
      {
        type: "Button",
        props: { children: { type: "const", value: "管理员入口" } },
        meta: {
          visible: { type: "state", path: "user.isAdmin" }
        },
        actions: [{ type: "openAdminPanel" }]
      }
    ]
  },
  state: {
    user: { isAdmin: true }
  }
};
```

## 兼容性

### 自动格式检测

```typescript
import { isNewDSLFormat, isLegacyFormat } from './types/core';

if (isNewDSLFormat(schema)) {
  // 使用新格式解析器
  renderNewFormat(schema);
} else if (isLegacyFormat(schema)) {
  // 转换为新格式
  const newSchema = legacyToNew(schema);
  renderNewFormat(newSchema);
}
```

### 格式转换

```typescript
import { legacyToNew, newToLegacy } from './types/core';

// 旧 → 新
const newSchema = legacyToNew(legacySchema);

// 新 → 旧
const legacySchema = newToLegacy(newSchema);
```

## 迁移指南

### 从旧格式迁移

1. **更新顶层结构**：
   - `version` → `schemaVersion`
   - `component` → `root`
   - 添加 `catalogVersion`

2. **更新绑定表达式**：
   - `"{{state.xxx}}"` → `{ type: "state", path: "xxx" }`
   - `"literal"` → `{ type: "const", value: "literal" }`

3. **更新 Actions**：
   - 全局定义 → 节点级定义
   - 字符串引用 → 直接对象

4. **添加 meta 元数据**（可选）：
   - 添加 `key` 用于稳定渲染
   - 添加 `visible` 用于条件渲染

## 最佳实践

### 1. 使用显式绑定

```typescript
// ✅ 推荐：显式绑定
props: {
  value: { type: "state", path: "formData.username" }
}

// ❌ 不推荐：隐式绑定（需要解析）
props: {
  value: "{{formData.username}}"
}
```

### 2. 使用节点级 Actions

```typescript
// ✅ 推荐：节点级 Actions
actions: [{ type: "submit", payload: { id: 123 } }]

// ❌ 不推荐：全局 Actions + 字符串引用
props: { onClick: "submit" }
```

### 3. 添加版本信息

```typescript
// ✅ 推荐：明确版本
{
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0"
}

// ❌ 不推荐：缺少版本
{
  version: "1.0.0"  // 不清楚是 DSL 版本还是 Catalog 版本
}
```

## 工具支持

### 校验工具

```typescript
import { validateDSL } from './utils/dslValidator';
import { defaultCatalog } from './core/Catalog';

const result = validateDSL(schema, defaultCatalog);
if (!result.valid) {
  console.error('Validation failed:', result.errors);
}
```

### 转换工具

```typescript
import { legacyToNew, newToLegacy } from './types/core';

// 旧格式 → 新格式
const enhanced = legacyToNew(legacySchema);

// 新格式 → 旧格式
const legacy = newToLegacy(enhancedSchema);
```

## 相关文档

- [核心类型定义](../src/types/core.ts)
- [DSL 校验器](../src/utils/dslValidator.ts)
- [增强的渲染器](../src/components/EnhancedJsonRenderer.tsx)
- [新 DSL 示例](../src/examples/new-dsl-examples.ts)
