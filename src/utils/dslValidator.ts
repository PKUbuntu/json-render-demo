/**
 * DSL 校验器
 * 支持新旧格式的 Schema 校验
 */

import { z } from 'zod';
import {
  JsonSchema,
  LegacyJsonSchema,
  JsonNode,
  BindingExpr,
  ActionIntent,
  isNewDSLFormat,
  isLegacyFormat
} from '../types/core';
import { DesignSystemCatalog } from '../core/Catalog';

// ==================== 新 DSL Schema 定义 ====================

/**
 * BindingExpr 的 Zod Schema
 */
const bindingExprSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("state"),
    path: z.string().min(1)
  }),
  z.object({
    type: z.literal("prop"),
    path: z.string().min(1)
  }),
  z.object({
    type: z.literal("const"),
    value: z.any()
  })
]);

/**
 * ActionIntent 的 Zod Schema
 */
const actionIntentSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.any()).optional()
});

/**
 * NodeMeta 的 Zod Schema
 */
const nodeMetaSchema = z.object({
  key: z.string().optional(),
  visible: z.union([z.boolean(), bindingExprSchema]).optional(),
  debug: z.boolean().optional()
}).passthrough(); // 允许额外的元数据

/**
 * JsonNode 的 Zod Schema（新格式）
 */
const jsonNodeSchema: z.ZodType<JsonNode> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    type: z.string().min(1),
    props: z.record(z.union([z.any(), bindingExprSchema])).optional(),
    children: z.array(z.any()).optional(),
    actions: z.array(actionIntentSchema).optional(),
    bindings: z.record(bindingExprSchema).optional(),
    meta: nodeMetaSchema.optional()
  })
);

/**
 * 新格式 JsonSchema 的 Zod Schema
 */
const newJsonSchemaSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "Schema version must be semantic version (x.y.z)"),
  catalogVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "Catalog version must be semantic version (x.y.z)"),
  root: jsonNodeSchema,
  state: z.record(z.any()).optional(),
  meta: z.object({
    generatedBy: z.string().optional(),
    timestamp: z.number().optional(),
    traceId: z.string().optional()
  }).optional().passthrough()
});

// ==================== 校验器类 ====================

export interface DSLValidationResult {
  valid: boolean;
  format: 'new' | 'legacy' | 'unknown';
  errors: string[];
  warnings: string[];
}

export class DSLValidator {
  constructor(private catalog?: DesignSystemCatalog) {}

  /**
   * 验证 Schema（自动检测格式）
   */
  validate(schema: any): DSLValidationResult {
    // 检测格式
    let format: 'new' | 'legacy' | 'unknown' = 'unknown';

    if (isNewDSLFormat(schema)) {
      format = 'new';
      return this.validateNewFormat(schema);
    } else if (isLegacyFormat(schema)) {
      format = 'legacy';
      return this.validateLegacyFormat(schema);
    }

    return {
      valid: false,
      format,
      errors: ['Unknown schema format'],
      warnings: []
    };
  }

  /**
   * 验证新格式
   */
  private validateNewFormat(schema: any): DSLValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Zod 校验
    const result = newJsonSchemaSchema.safeParse(schema);
    if (!result.success) {
      result.error.issues.forEach(issue => {
        const path = issue.path.join('.');
        errors.push(`${path}: ${issue.message}`);
      });
      return {
        valid: false,
        format: 'new',
        errors,
        warnings
      };
    }

    // Catalog 版本检查
    if (this.catalog && schema.catalogVersion !== this.catalog.version) {
      warnings.push(
        `Catalog version mismatch: schema uses ${schema.catalogVersion}, catalog is ${this.catalog.version}`
      );
    }

    // 组件树校验
    const treeErrors = this.validateNodeTree(schema.root, 'root', this.catalog);
    errors.push(...treeErrors);

    return {
      valid: errors.length === 0,
      format: 'new',
      errors,
      warnings
    };
  }

  /**
   * 验证旧格式
   */
  private validateLegacyFormat(schema: any): DSLValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础结构检查
    if (!schema.version) {
      errors.push('Missing required field: version');
    }

    if (!schema.component) {
      errors.push('Missing required field: component');
    }

    if (schema.version && !/^\d+\.\d+\.\d+$/.test(schema.version)) {
      errors.push('Version must be semantic version (x.y.z)');
    }

    // 组件树校验
    if (schema.component) {
      const treeErrors = this.validateNodeTree(schema.component, 'component', this.catalog);
      errors.push(...treeErrors);
    }

    return {
      valid: errors.length === 0,
      format: 'legacy',
      errors,
      warnings
    };
  }

  /**
   * 验证节点树
   */
  private validateNodeTree(
    node: any,
    path: string,
    catalog?: DesignSystemCatalog
  ): string[] {
    const errors: string[] = [];

    if (!node || typeof node !== 'object') {
      errors.push(`${path}: Invalid node`);
      return errors;
    }

    // 检查 type 字段
    if (!node.type) {
      errors.push(`${path}: Missing component type`);
      return errors;
    }

    // 检查组件是否在 Catalog 中
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

    // 检查绑定表达式
    if (node.props) {
      for (const [key, value] of Object.entries(node.props)) {
        if (value && typeof value === 'object' && 'type' in value) {
          const bindingResult = bindingExprSchema.safeParse(value);
          if (!bindingResult.success) {
            errors.push(`${path}.props.${key}: Invalid binding expression`);
          }
        }
      }
    }

    // 检查独立 bindings
    if (node.bindings) {
      for (const [key, value] of Object.entries(node.bindings)) {
        const bindingResult = bindingExprSchema.safeParse(value);
        if (!bindingResult.success) {
          errors.push(`${path}.bindings.${key}: Invalid binding expression`);
        }
      }
    }

    // 递归检查子节点
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        const childErrors = this.validateNodeTree(child, `${path}.children[${index}]`, catalog);
        errors.push(...childErrors);
      });
    }

    return errors;
  }

  /**
   * 格式化验证结果
   */
  format(result: DSLValidationResult): string {
    const parts: string[] = [];

    parts.push(`格式: ${result.format.toUpperCase()}`);

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

  /**
   * 验证或抛出异常
   */
  validateOrThrow(schema: any): asserts schema is JsonSchema | LegacyJsonSchema {
    const result = this.validate(schema);

    if (!result.valid) {
      const error = new Error(this.format(result));
      (error as any).validationResult = result;
      throw error;
    }
  }
}

// ==================== 快捷函数 ====================

/**
 * 验证 Schema（快捷函数）
 */
export function validateDSL(
  schema: any,
  catalog?: DesignSystemCatalog
): DSLValidationResult {
  const validator = new DSLValidator(catalog);
  return validator.validate(schema);
}

/**
 * 格式化验证结果（快捷函数）
 */
export function formatDSLValidation(result: DSLValidationResult): string {
  const validator = new DSLValidator();
  return validator.format(result);
}
