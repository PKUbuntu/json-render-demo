/**
 * 工具函数
 * 类型推导、Schema 验证、代码生成等辅助函数
 */

import { z } from 'zod';
import { JsonNode, JsonSchema } from '../types/core';

// ==================== 类型推导 ====================

/**
 * 从 Zod Schema 推导 TypeScript 类型
 */
export type InferZodSchema<T> = T extends z.ZodTypeAny
  ? z.infer<T>
  : never;

/**
 * 深度 Required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: DeepRequired<T[P]>;
};

/**
 * 深度 Partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * 深度 Readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

// ==================== Schema 验证 ====================

/**
 * 验证 JSON Schema 是否有效
 */
export function validateJsonSchema(
  schema: any,
  catalog?: any
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 基础结构校验
  if (!schema.version) {
    errors.push('Missing required field: version');
  }

  if (!schema.component) {
    errors.push('Missing required field: component');
  }

  if (schema.version && !/^\d+\.\d+\.\d+$/.test(schema.version)) {
    errors.push('Version must be in semantic version format (x.y.z)');
  }

  // 2. 组件树校验
  if (schema.component) {
    const componentErrors = validateNode(schema.component, 'component', catalog);
    errors.push(...componentErrors);
  }

  // 3. Actions 引用检查
  if (schema.actions && schema.component) {
    const actionNames = Object.keys(schema.actions);
    const referencedActions = new Set<string>();

    function collectActions(node: JsonNode) {
      if (node.props?.onClick && typeof node.props.onClick === 'string') {
        referencedActions.add(node.props.onClick);
      }
      if (node.props?.onChange && typeof node.props.onChange === 'string') {
        referencedActions.add(node.props.onChange);
      }
      if (node.children) {
        node.children.forEach(collectActions);
      }
    }

    collectActions(schema.component);

    referencedActions.forEach(actionName => {
      if (!actionNames.includes(actionName)) {
        warnings.push(
          `Action "${actionName}" is referenced but not defined in schema.actions`
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证单个节点
 */
function validateNode(
  node: JsonNode,
  path: string,
  catalog?: any
): string[] {
  const errors: string[] = [];

  if (!node.type) {
    errors.push(`${path}: Missing component type`);
    return errors;
  }

  // 如果有 Catalog，检查组件是否存在
  if (catalog) {
    const allComponents = {
      ...catalog.primitives,
      ...catalog.compound,
      ...catalog.business
    };

    if (!allComponents[node.type]) {
      errors.push(`${path}: Unknown component type "${node.type}"`);
    }
  }

  // 递归验证子节点
  if (node.children) {
    node.children.forEach((child, index) => {
      const childErrors = validateNode(child, `${path}.children[${index}]`, catalog);
      errors.push(...childErrors);
    });
  }

  return errors;
}

/**
 * 格式化验证结果
 */
export function formatValidationResult(result: {
  valid: boolean;
  errors: string[];
  warnings: string[];
}): string {
  const parts: string[] = [];

  if (result.valid) {
    parts.push('✅ Schema validation passed');
  } else {
    parts.push('❌ Schema validation failed');
  }

  if (result.errors.length > 0) {
    parts.push('\n📋 Errors:');
    result.errors.forEach(error => {
      parts.push(`  • ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    parts.push('\n⚠️ Warnings:');
    result.warnings.forEach(warning => {
      parts.push(`  • ${warning}`);
    });
  }

  return parts.join('\n');
}

// ==================== 代码生成辅助 ====================

/**
 * 将字符串转换为 PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toUpperCase());
}

/**
 * 将字符串转换为 camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toLowerCase());
}

/**
 * 将字符串转换为 kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/^-/, '')
    .toLowerCase();
}

/**
 * 将字符串转换为 snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/^-/, '')
    .toLowerCase();
}

/**
 * 生成组件导入语句
 */
export function generateImports(
  usedComponents: Set<string>,
  catalog?: any
): string {
  // 如果有 Catalog，根据分类组织 import
  if (catalog) {
    const imports: string[] = [];

    // Antd 组件
    const antdComponents = Array.from(usedComponents).filter(c => {
      const all = { ...catalog.primitives, ...catalog.compound };
      return all[c];
    });

    if (antdComponents.length > 0) {
      imports.push(
        `import { ${antdComponents.sort().join(', ')} } from 'antd';`
      );
    }

    // 自定义组件
    const customComponents = Array.from(usedComponents).filter(c => {
      const all = { ...catalog.primitives, ...catalog.compound };
      return !all[c];
    });

    if (customComponents.length > 0) {
      imports.push(
        `import { ${customComponents.sort().join(', ')} } from './components';`
      );
    }

    return imports.join('\n');
  }

  // 默认：简单 import
  return `import { ${Array.from(usedComponents).sort().join(', ')} } from 'antd';`;
}

/**
 * 转义 JSX 字符串
 */
export function escapeJSXString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * 将值转换为 JSX 属性字符串
 */
export function valueToJSX(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? '{true}' : '{false}';
  }

  if (typeof value === 'number') {
    return `{${value}}`;
  }

  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '&quot;')}"`;
  }

  if (Array.isArray(value)) {
    return `{${JSON.stringify(value)}}`;
  }

  if (typeof value === 'object') {
    return `{${JSON.stringify(value)}}`;
  }

  return String(value);
}

// ==================== 数据处理 ====================

/**
 * 深度合并对象
 */
export function deepMerge<T extends object>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * 检查是否是对象
 */
function isObject(item: any): item is object {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 深度克隆
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }

  if (typeof obj === 'object') {
    const copy = {} as any;
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }

  return obj;
}

/**
 * 获取嵌套属性值
 */
export function get(obj: any, path: string, defaultValue?: any): any {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result == null) {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
}

/**
 * 设置嵌套属性值
 */
export function set(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let target = obj;

  for (const key of keys) {
    if (!(key in target)) {
      target[key] = {};
    }
    target = target[key];
  }

  target[lastKey] = value;
}

// ==================== 其他工具 ====================

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: any;

  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: retryDelay = 1000,
    backoff = 2
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await delay(retryDelay * Math.pow(backoff, attempt - 1));
      }
    }
  }

  throw lastError!;
}
