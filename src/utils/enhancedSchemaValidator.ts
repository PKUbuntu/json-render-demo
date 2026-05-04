/**
 * 增强的 Schema 校验器
 * 使用新的分层 Catalog 系统进行校验
 */

import { z } from 'zod';
import { JsonNode, JsonSchema } from '../types/core';
import { DesignSystemCatalog, getComponentSchema, hasComponent } from '../core/Catalog';

// ==================== 校验结果 ====================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: ErrorCode;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: WarningCode;
}

export enum ErrorCode {
  MISSING_VERSION = 'MISSING_VERSION',
  INVALID_VERSION = 'INVALID_VERSION',
  MISSING_COMPONENT = 'MISSING_COMPONENT',
  UNKNOWN_COMPONENT = 'UNKNOWN_COMPONENT',
  INVALID_PROPS = 'INVALID_PROPS',
  PROTOTYPE_POLLUTION = 'PROTOTYPE_POLLUTION',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE'
}

export enum WarningCode {
  UNUSED_ACTION = 'UNUSED_ACTION',
  MISSING_ACTION_REF = 'MISSING_ACTION_REF',
  DEPRECATED_COMPONENT = 'DEPRECATED_COMPONENT'
}

// ==================== Schema 校验器 ====================

export class EnhancedSchemaValidator {
  constructor(private catalog: DesignSystemCatalog) {}

  /**
   * 验证 JSON Schema
   */
  validate(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. 版本校验
    this.validateVersion(schema, errors);

    // 2. 组件校验
    if (schema.component) {
      this.validateNode(schema.component, 'component', errors, warnings, new Set());
    } else {
      errors.push({
        path: 'component',
        message: 'Missing required field: component',
        code: ErrorCode.MISSING_COMPONENT
      });
    }

    // 3. Actions 校验
    if (schema.actions) {
      this.validateActions(schema.actions, schema.component, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证版本
   */
  private validateVersion(schema: any, errors: ValidationError[]): void {
    if (!schema.version) {
      errors.push({
        path: 'version',
        message: 'Missing required field: version',
        code: ErrorCode.MISSING_VERSION
      });
      return;
    }

    if (!/^\d+\.\d+\.\d+$/.test(schema.version)) {
      errors.push({
        path: 'version',
        message: 'Version must be in semantic version format (x.y.z)',
        code: ErrorCode.INVALID_VERSION
      });
    }

    // 检查 Catalog 版本兼容性
    if (schema.version !== this.catalog.version) {
      warnings.push({
        path: 'version',
        message: `Schema version ${schema.version} may not be compatible with Catalog version ${this.catalog.version}`,
        code: WarningCode.DEPRECATED_COMPONENT
      });
    }
  }

  /**
   * 验证节点
   */
  private validateNode(
    node: JsonNode,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    visited: Set<string>
  ): void {
    // 检查循环引用
    const nodeKey = `${path}:${node.type}`;
    if (visited.has(nodeKey)) {
      errors.push({
        path,
        message: 'Circular reference detected',
        code: ErrorCode.CIRCULAR_REFERENCE
      });
      return;
    }
    visited.add(nodeKey);

    // 检查组件类型
    if (!node.type) {
      errors.push({
        path,
        message: 'Missing component type',
        code: ErrorCode.MISSING_COMPONENT
      });
      return;
    }

    // 检查组件是否在 Catalog 中
    if (!hasComponent(this.catalog, node.type)) {
      errors.push({
        path,
        message: `Unknown component type "${node.type}"`,
        code: ErrorCode.UNKNOWN_COMPONENT
      });
    }

    // 验证 Props
    if (node.props) {
      this.validateNodeProps(node, path, errors);
    }

    // 递归验证子节点
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child, index) => {
        this.validateNode(
          child,
          `${path}.children[${index}]`,
          errors,
          warnings,
          new Set(visited)
        );
      });
    }
  }

  /**
   * 验证节点 Props
   */
  private validateNodeProps(
    node: JsonNode,
    path: string,
    errors: ValidationError[]
  ): void {
    const componentSchema = getComponentSchema(this.catalog, node.type);

    if (!componentSchema) {
      return;
    }

    // 检查必需的 Props
    if (componentSchema.constraints?.requiredProps) {
      for (const requiredProp of componentSchema.constraints.requiredProps) {
        if (!(requiredProp in node.props!)) {
          errors.push({
            path: `${path}.props`,
            message: `Missing required prop "${requiredProp}" for component "${node.type}"`,
            code: ErrorCode.INVALID_PROPS
          });
        }
      }
    }

    // 使用 Zod 校验 Props
    try {
      componentSchema.props.parse(node.props);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          const propPath = issue.path.join('.');
          errors.push({
            path: `${path}.props.${propPath}`,
            message: issue.message,
            code: ErrorCode.INVALID_PROPS
          });
        }
      }
    }

    // 检查原型污染
    for (const key of Object.keys(node.props)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        errors.push({
          path: `${path}.props.${key}`,
          message: `Prototype pollution attempt detected: "${key}"`,
          code: ErrorCode.PROTOTYPE_POLLUTION
        });
      }
    }
  }

  /**
   * 验证 Actions
   */
  private validateActions(
    actions: Record<string, any>,
    component: JsonNode,
    warnings: ValidationWarning[]
  ): void {
    const definedActions = new Set(Object.keys(actions));
    const referencedActions = new Set<string>();

    // 收集所有被引用的 Actions
    function collectActions(node: JsonNode) {
      if (node.props) {
        if (node.props.onClick && typeof node.props.onClick === 'string') {
          referencedActions.add(node.props.onClick);
        }
        if (node.props.onChange && typeof node.props.onChange === 'string') {
          referencedActions.add(node.props.onChange);
        }
        if (node.props.onOk && typeof node.props.onOk === 'string') {
          referencedActions.add(node.props.onOk);
        }
        if (node.props.onCancel && typeof node.props.onCancel === 'string') {
          referencedActions.add(node.props.onCancel);
        }
      }

      if (node.children) {
        node.children.forEach(collectActions);
      }
    }

    collectActions(component);

    // 检查未定义的 Action 引用
    for (const actionRef of referencedActions) {
      if (!definedActions.has(actionRef)) {
        warnings.push({
          path: `actions.${actionRef}`,
          message: `Action "${actionRef}" is referenced but not defined`,
          code: WarningCode.MISSING_ACTION_REF
        });
      }
    }

    // 检查未使用的 Action 定义
    for (const definedAction of definedActions) {
      if (!referencedActions.has(definedAction)) {
        warnings.push({
          path: `actions.${definedAction}`,
          message: `Action "${definedAction}" is defined but never referenced`,
          code: WarningCode.UNUSED_ACTION
        });
      }
    }
  }
}

// ==================== 快捷函数 ====================

/**
 * 验证 JSON Schema（快捷函数）
 */
export function validateSchema(
  schema: any,
  catalog: DesignSystemCatalog
): ValidationResult {
  const validator = new EnhancedSchemaValidator(catalog);
  return validator.validate(schema);
}

/**
 * 格式化验证结果
 */
export function formatValidationResult(result: ValidationResult): string {
  const parts: string[] = [];

  if (result.valid) {
    parts.push('✅ Schema validation passed');
  } else {
    parts.push('❌ Schema validation failed');
  }

  if (result.errors.length > 0) {
    parts.push('\n📋 Errors:');
    result.errors.forEach(error => {
      parts.push(`  • [${error.path}] ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    parts.push('\n⚠️ Warnings:');
    result.warnings.forEach(warning => {
      parts.push(`  • [${warning.path}] ${warning.message}`);
    });
  }

  return parts.join('\n');
}

/**
 * 验证或抛出异常
 */
export function validateOrThrow(
  schema: any,
  catalog: DesignSystemCatalog
): asserts schema is JsonSchema {
  const result = validateSchema(schema, catalog);

  if (!result.valid) {
    const error = new Error(formatValidationResult(result));
    (error as any).validationResult = result;
    throw error;
  }
}
