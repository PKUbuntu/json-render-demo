/**
 * 核心类型定义
 * 定义整个 AI UI 体系的基础类型
 */

import { z } from 'zod';

// ==================== 基础类型 ====================

/**
 * JSON 节点类型
 */
export interface JsonNode {
  type: string;
  props?: Record<string, any>;
  children?: JsonNode[];
}

/**
 * JSON Schema 类型
 */
export interface JsonSchema {
  version: string;
  component: JsonNode;
  state?: StateDefinition;
  actions?: Record<string, ActionDefinition>;
  lifecycle?: LifecycleHooks;
}

/**
 * 状态定义
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
  onAction?: (actionName: string, payload: any) => void | Promise<void>;
  key?: string | number;
}

/**
 * 绑定表达式
 */
export interface BindingExpression {
  type: 'state' | 'computed' | 'literal';
  path?: string;
  expression?: string;
  value?: any;
}
