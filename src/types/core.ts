/**
 * 核心类型定义
 * 定义整个 AI UI 体系的基础类型
 */

import { z } from 'zod';

// ==================== 基础类型 ====================

/**
 * JSON 值类型（递归定义）
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

/**
 * 数据绑定表达式（新 DSL 格式）
 */
export type BindingExpr =
  | { type: "state"; path: string }   // 绑定全局 state
  | { type: "prop"; path: string }    // 绑定父级 props
  | { type: "const"; value: JSONValue }; // 常量

/**
 * Action 意图（新 DSL 格式）
 */
export interface ActionIntent {
  type: string; // 必须来自 Catalog（如 "submit_form", "view_details"）
  payload?: Record<string, JSONValue>;
}

/**
 * 节点元数据
 */
export interface NodeMeta {
  key?: string;        // React key / 渲染稳定性
  visible?: boolean;   // 条件渲染
  debug?: boolean;     // 调试标记
  [key: string]: any;  // 其他元数据
}

/**
 * JSON 节点类型（增强版）
 */
export interface JsonNode {
  id?: string; // 唯一标识（用于 diff / 事件 / trace）
  type: string; // 组件类型（必须存在于 Catalog）
  props?: Record<string, JSONValue | BindingExpr>; // 支持原始值或绑定表达式
  children?: JsonNode[];
  actions?: ActionIntent[]; // 节点级 Actions（新 DSL）
  bindings?: Record<string, BindingExpr>; // 独立声明绑定（新 DSL）
  meta?: NodeMeta; // 元数据（新 DSL）
}

/**
 * JSON Schema 类型（增强版）
 */
export interface JsonSchema {
  schemaVersion: string;   // DSL 版本（用于解析）
  catalogVersion: string;  // Catalog 版本（关键！防止不兼容）
  root: JsonNode; // UI 树根节点（新 DSL 使用 root）
  state?: Record<string, JSONValue>; // 初始状态（只读输入）
  meta?: {
    generatedBy?: string;  // 生成来源（模型/agent）
    timestamp?: number;    // 生成时间
    traceId?: string;      // 调试追踪
  };
}

// 兼容旧格式
export interface LegacyJsonSchema {
  version: string;
  component: JsonNode;
  state?: StateDefinition;
  actions?: Record<string, ActionDefinition>;
  lifecycle?: LifecycleHooks;
}

/**
 * 状态定义（旧格式，保留兼容）
 */
export interface StateDefinition {
  initialValues: Record<string, any>;
  computed?: Record<string, string>; // 计算属性表达式
  watchers?: Record<string, string>; // 监听器表达式
}

/**
 * 生命周期钩子
 */
export interface LifecycleHooks {
  onMount?: string;
  onUpdate?: string;
  onUnmount?: string;
}

/**
 * Action 定义
 */
export interface ActionDefinition {
  type: string;
  description?: string;
  [key: string]: any;
}

/**
 * Action 执行上下文
 */
export interface ActionContext {
  state: any;
  event?: Event;
  value?: any;
  params?: Record<string, any>;
}

// ==================== Catalog 类型 ====================

/**
 * 组件 Schema
 */
export interface ComponentSchema {
  category: 'primitive' | 'compound' | 'business';
  description: string;
  props: z.ZodTypeAny;
  slots?: string[];
  constraints?: ComponentConstraints;
  examples?: JsonNode[];
}

/**
 * 组件约束
 */
export interface ComponentConstraints {
  maxChildren?: number;
  allowedParentTypes?: string[];
  requiredProps?: string[];
}

/**
 * 模板 Schema
 */
export interface TemplateSchema {
  name: string;
  description: string;
  structure: JsonNode;
  parameters: Record<string, ParameterDefinition>;
  examples?: TemplateExample[];
}

/**
 * 参数定义
 */
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
  description: string;
  default?: any;
  options?: any[];
  required?: boolean;
}

/**
 * 模板示例
 */
export interface TemplateExample {
  params: Record<string, any>;
  result: JsonNode;
}

/**
 * Design Token
 */
export interface DesignTokens {
  spacing: SpacingTokens;
  colors: ColorTokens;
  typography: TypographyTokens;
  borderRadius: RadiusTokens;
  shadows?: ShadowTokens;
}

/**
 * 间距 Token
 */
export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

/**
 * 颜色 Token
 */
export interface ColorTokens {
  primary: ColorPalette;
  success: ColorPalette;
  warning: ColorPalette;
  error: ColorPalette;
  info: ColorPalette;
  text: ColorSet;
  border: ColorSet;
  background: ColorSet;
}

/**
 * 颜色调色板
 */
export interface ColorPalette {
  default: string;
  light?: string;
  dark?: string;
  [key: string]: string | undefined;
}

/**
 * 颜色集合
 */
export interface ColorSet {
  default: string;
  secondary?: string;
  tertiary?: string;
  disabled?: string;
}

/**
 * 排版 Token
 */
export interface TypographyTokens {
  fontSize: FontSizes;
  lineHeight: LineHeights;
  fontWeight: FontWeights;
  fontFamily: FontFamilies;
}

/**
 * 字号
 */
export interface FontSizes {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  xxl: number;
  '3xl'?: number;
  '4xl'?: number;
}

/**
 * 行高
 */
export interface LineHeights {
  tight: number;
  normal: number;
  relaxed: number;
}

/**
 * 字重
 */
export interface FontWeights {
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
}

/**
 * 字体
 */
export interface FontFamilies {
  sans: string[];
  mono?: string[];
}

/**
 * 圆角 Token
 */
export interface RadiusTokens {
  sm: number;
  base: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

/**
 * 阴影 Token
 */
export interface ShadowTokens {
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
}

/**
 * 分层 Catalog
 */
export interface DesignSystemCatalog {
  version: string;
  primitives: Record<string, ComponentSchema>;
  compound: Record<string, ComponentSchema>;
  business: Record<string, ComponentSchema>;
  templates: Record<string, TemplateSchema>;
  tokens: DesignTokens;
}

// ==================== Action 类型 ====================

/**
 * Action 执行结果
 */
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: ActionError;
}

/**
 * Action 错误
 */
export interface ActionError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
}

/**
 * 带类型的 Action
 */
export interface TypedAction<TParams = any, TResult = any> {
  name: string;
  description: string;
  category: string;
  params: z.ZodType<TParams>;
  result: z.ZodType<TResult>;
  handler: (params: TParams, context: ActionContext) => Promise<TResult>;
  config?: ActionConfig;
  permission?: ActionPermission;
}

/**
 * Action 配置
 */
export interface ActionConfig {
  cacheable?: boolean;
  ttl?: number;
  retryable?: boolean;
  debounce?: number;
  throttle?: number;
  timeout?: number;
}

/**
 * Action 权限
 */
export interface ActionPermission {
  allowedRoles?: string[];
  requiresAuth?: boolean;
  requiresMFA?: boolean;
  resourceCheck?: (resource: string, user: any) => Promise<boolean>;
  rateLimit?: RateLimitConfig;
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  maxRequests: number;
  window: number; // 毫秒
  burst?: number;
}

// ==================== 运行时类型 ====================

/**
 * 渲染器上下文
 */
export interface RenderContext {
  state: any;
  props?: any; // 父组件 props
  onAction?: (actionName: string, payload: any) => void | Promise<void>;
  key?: string | number;
}

// ==================== DSL 格式转换 ====================

/**
 * 检测是否为新 DSL 格式
 */
export function isNewDSLFormat(schema: any): schema is JsonSchema {
  return schema?.schemaVersion && schema?.catalogVersion && schema?.root;
}

/**
 * 检测是否为旧格式（兼容）
 */
export function isLegacyFormat(schema: any): schema is LegacyJsonSchema {
  return schema?.version && schema?.component;
}

/**
 * 将旧格式转换为新格式
 */
export function legacyToNew(legacy: LegacyJsonSchema): JsonSchema {
  return {
    schemaVersion: "1.0.0",
    catalogVersion: legacy.version || "1.0.0",
    root: legacy.component,
    state: legacy.state?.initialValues,
    meta: {
      generatedBy: "legacy-converter",
      timestamp: Date.now()
    }
  };
}

/**
 * 将新格式转换为旧格式（用于兼容）
 */
export function newToLegacy(schema: JsonSchema): LegacyJsonSchema {
  return {
    version: schema.catalogVersion,
    component: schema.root,
    state: schema.state ? {
      initialValues: schema.state
    } : undefined,
    // 将节点级 Actions 转换为全局 Actions
    actions: extractActionsFromTree(schema.root)
  };
}

/**
 * 从节点树中提取所有 Actions
 */
function extractActionsFromTree(node: JsonNode): Record<string, ActionDefinition> {
  const actions: Record<string, ActionDefinition> = {};

  function traverse(n: JsonNode, path: string = "root") {
    if (n.actions) {
      n.actions.forEach((action, index) => {
        const actionName = `${path}_action_${index}`;
        actions[actionName] = {
          type: action.type,
          description: `Action from ${path}`,
          ...action.payload
        };
      });
    }

    if (n.children) {
      n.children.forEach((child, index) => {
        traverse(child, `${path}.children[${index}]`);
      });
    }
  }

  traverse(node);
  return actions;
}

/**
 * 解析绑定表达式（兼容新旧格式）
 */
export function parseBinding(value: any): BindingExpr | BindingExpression {
  // 新格式：已经是 BindingExpr
  if (value && typeof value === "object" && "type" in value) {
    if (["state", "prop", "const"].includes(value.type)) {
      return value as BindingExpr;
    }
  }

  // 旧格式：字符串解析
  if (typeof value === "string") {
    // 模板表达式: {{state.xxx}} 或 {{xxx}}
    if (value.startsWith("{{") && value.endsWith("}}")) {
      const expr = value.slice(2, -2).trim();
      if (expr.startsWith("state.")) {
        return { type: "state", path: expr.slice(6) };
      }
      return { type: "const", value: expr };
    }

    // 简单状态引用: state.xxx
    if (value.startsWith("state.")) {
      return { type: "state", path: value.slice(6) };
    }
  }

  // 默认作为常量
  return { type: "const", value };
}

/**
 * 求值绑定表达式（兼容新旧格式）
 */
export function evaluateBinding(
  binding: BindingExpr | BindingExpression,
  context: {
    state: any;
    props?: any;
  }
): any {
  // 新格式 BindingExpr
  if ("type" in binding) {
    switch (binding.type) {
      case "state":
        return getNestedValue(context.state, binding.path!);
      case "prop":
        return getNestedValue(context.props || {}, binding.path!);
      case "const":
        return binding.value;
    }
  }

  // 旧格式 BindingExpression
  switch (binding.type) {
    case "state":
      return getNestedValue(context.state, binding.path!);
    case "computed":
      // TODO: 实现计算属性求值
      return undefined;
    case "literal":
      return binding.value;
  }
}

/**
 * 获取嵌套属性值
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split(".");
  let value = obj;

  for (const key of keys) {
    if (value == null) return undefined;
    value = value[key];
  }

  return value;
}

// 保留旧的 BindingExpression 类型别名（向后兼容）
export interface BindingExpression {
  type: 'state' | 'computed' | 'literal';
  path?: string;
  expression?: string;
  value?: any;
}
