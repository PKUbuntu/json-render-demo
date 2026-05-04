# 核心的DSL数据定义



```typescript
// ==============================
// JR-AUI DSL (Production-ready)
// ==============================

// ---- 基础类型 ----

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// ---- 数据绑定表达式 ----

export type BindingExpr =
  | {
      type: "state"; // 绑定全局 state
      path: string;  // e.g. "order.total"
    }
  | {
      type: "prop";  // 绑定父级 props
      path: string;
    }
  | {
      type: "const"; // 常量
      value: JSONValue;
    };

// ---- Action（声明式行为）----

export interface ActionIntent {
  type: string; // 必须来自 Catalog（如 "submit_form", "view_details"）
  payload?: Record<string, JSONValue>;
}

// ---- UI 节点 ----

export interface JsonNode {
  id?: string; // 唯一标识（用于 diff / 事件 / trace）

  type: string; // 组件类型（必须存在于 Catalog）

  props?: Record<string, JSONValue | BindingExpr>;
  // props 支持：
  // - 原始值
  // - 绑定表达式（推荐）

  children?: JsonNode[];

  actions?: ActionIntent[];
  // 行为绑定在节点上（而不是全局）

  bindings?: Record<string, BindingExpr>;
  // 可选：独立声明绑定（复杂场景使用）

  meta?: {
    key?: string;        // React key / 渲染稳定性
    visible?: boolean;   // 条件渲染
    debug?: boolean;     // 调试标记
  };
}

// ---- 顶层 Schema ----

export interface JsonSchema {
  schemaVersion: string;   // DSL 版本（用于解析）
  catalogVersion: string;  // Catalog 版本（关键！防止不兼容）

  root: JsonNode; // UI 树根节点

  state?: Record<string, JSONValue>;
  // 初始状态（只读输入，禁止 AI 直接修改）

  meta?: {
    generatedBy?: string;  // 生成来源（模型/agent）
    timestamp?: number;    // 生成时间
    traceId?: string;      // 调试追踪
  };
}
```
