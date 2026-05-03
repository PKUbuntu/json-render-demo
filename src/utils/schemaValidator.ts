/**
 * Schema 校验器
 *
 * 使用 Zod 校验 JSON Schema 是否符合 Catalog 定义
 * 保证 AI 输出的 JSON 完全可控
 */

import { z } from 'zod';
import { antdCatalogSchema } from '../catalog/antd-catalog';
import { JsonNode, JsonSchema } from '../components/JsonRenderer';

// ==================== Schema 定义 ====================

// JsonNode 的 Schema（动态构建）
const createJsonNodeSchema = (): z.ZodType<JsonNode> => {
  const allowedTypes = Object.keys(antdCatalogSchema.components);
  const allowedTypesEnum = z.enum(allowedTypes as [string, ...string[]]);

  const htmlElements = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li'] as const;
  const htmlElementEnum = z.enum(htmlElements);

  return z.lazy(() =>
    z.object({
      type: z.union([allowedTypesEnum, htmlElementEnum]),
      props: z.record(z.any()).optional(),
      children: z.array(z.lazy(() => createJsonNodeSchema())).optional(),
    })
  );
};

export const jsonSchemaSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic version (x.y.z)'),
  component: createJsonNodeSchema(),
  state: z.record(z.any()).optional(),
  actions: z.record(z.any()).optional(),
});

// ==================== 校验函数 ====================

export function validateNodeAgainstCatalog(
  node: JsonNode,
  path: string = 'component'
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const htmlElements = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li'];
  if (htmlElements.includes(node.type)) {
    if (node.children) {
      node.children.forEach((child, index) => {
        const childResult = validateNodeAgainstCatalog(child, `${path}.children[${index}]`);
        errors.push(...childResult.errors);
      });
    }
    return { valid: errors.length === 0, errors };
  }

  const componentSchema = antdCatalogSchema.components[node.type as keyof typeof antdCatalogSchema.components];
  if (!componentSchema) {
    errors.push(`${path}: Unknown component type "${node.type}"`);
    return { valid: false, errors };
  }

  if (componentSchema.props && node.props) {
    const propsResult = componentSchema.props.safeParse(node.props);
    if (!propsResult.success) {
      const formattedErrors = propsResult.error.issues.map(issue =>
        `${path}.props: ${issue.path.join('.')} - ${issue.message}`
      );
      errors.push(...formattedErrors);
    }
  }

  if (node.children) {
    node.children.forEach((child, index) => {
      const childResult = validateNodeAgainstCatalog(child, `${path}.children[${index}]`);
      errors.push(...childResult.errors);
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateJsonSchema(schema: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 基础结构校验
  const basicResult = jsonSchemaSchema.safeParse(schema);
  if (!basicResult.success) {
    const formattedErrors = basicResult.error.issues.map(issue =>
      `schema.${issue.path.join('.')}: ${issue.message}`
    );
    errors.push(...formattedErrors);
    return { valid: false, errors, warnings };
  }

  // 2. Catalog 约束校验
  const catalogResult = validateNodeAgainstCatalog(schema.component);
  errors.push(...catalogResult.errors);

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
        warnings.push(`Action "${actionName}" is referenced but not defined in schema.actions`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatValidationResult(result: {
  valid: boolean;
  errors: string[];
  warnings: string[];
}): string {
  const parts: string[] = [];

  if (result.valid) {
    parts.push('✅ Schema 校验通过');
  } else {
    parts.push('❌ Schema 校验失败');
  }

  if (result.errors.length > 0) {
    parts.push('\n📋 错误:');
    result.errors.forEach(error => {
      parts.push(`  • ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    parts.push('\n⚠️ 警告:');
    result.warnings.forEach(warning => {
      parts.push(`  • ${warning}`);
    });
  }

  return parts.join('\n');
}

export function validateOrThrow(schema: any): asserts schema is JsonSchema {
  const result = validateJsonSchema(schema);
  if (!result.valid) {
    const errorMessage = formatValidationResult(result);
    throw new Error(errorMessage);
  }
}
