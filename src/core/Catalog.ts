/**
 * 分层 Catalog 系统
 * 实现 primitives / compound / business / templates 分层结构
 */

import { z } from 'zod';
import {
  DesignSystemCatalog,
  ComponentSchema,
  DesignTokens,
  TemplateSchema
} from '../types/core';

// ==================== Design Tokens ====================

/**
 * 默认 Design Tokens
 */
export const defaultDesignTokens: DesignTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },

  colors: {
    primary: {
      default: '#1890ff',
      light: '#40a9ff',
      dark: '#096dd9'
    },
    success: {
      default: '#52c41a',
      light: '#73d13d',
      dark: '#389e0d'
    },
    warning: {
      default: '#faad14',
      light: '#ffc53d',
      dark: '#d48806'
    },
    error: {
      default: '#ff4d4f',
      light: '#ff7875',
      dark: '#cf1322'
    },
    info: {
      default: '#1890ff',
      light: '#40a9ff',
      dark: '#096dd9'
    },
    text: {
      default: 'rgba(0, 0, 0, 0.85)',
      secondary: 'rgba(0, 0, 0, 0.65)',
      disabled: 'rgba(0, 0, 0, 0.25)'
    },
    border: {
      default: '#d9d9d9',
      secondary: '#f0f0f0'
    },
    background: {
      default: '#ffffff',
      secondary: '#fafafa',
      tertiary: '#f5f5f5'
    }
  },

  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      '3xl': 30,
      '4xl': 36
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    fontFamily: {
      sans: [
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif'
      ],
      mono: [
        'SFMono-Regular',
        'Consolas',
        'Liberation Mono',
        'Menlo',
        'Courier',
        'monospace'
      ]
    }
  },

  borderRadius: {
    sm: 4,
    base: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  }
};

// ==================== Primitives Catalog ====================

/**
 * 原子组件 Catalog
 */
export const primitiveComponents: Record<string, ComponentSchema> = {
  Button: {
    category: 'primitive',
    description: 'Button component with various styles',
    props: z.object({
      type: z.enum(['primary', 'default', 'dashed', 'text', 'link']).optional(),
      size: z.enum(['large', 'middle', 'small']).optional(),
      danger: z.boolean().optional(),
      loading: z.boolean().optional(),
      disabled: z.boolean().optional(),
      block: z.boolean().optional(),
      children: z.string(),
      onClick: z.string().optional()
    }),
    constraints: {
      requiredProps: ['children']
    }
  },

  Input: {
    category: 'primitive',
    description: 'Text input field',
    props: z.object({
      placeholder: z.string().optional(),
      value: z.string().optional(),
      defaultValue: z.string().optional(),
      disabled: z.boolean().optional(),
      allowClear: z.boolean().optional(),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      onChange: z.string().optional(),
      type: z.enum(['text', 'password', 'email', 'number']).optional()
    })
  },

  Typography: {
    category: 'primitive',
    description: 'Typography component for text display',
    props: z.object({
      type: z.enum(['Title', 'Text', 'Paragraph']),
      level: z.number().min(1).max(5).optional(),
      children: z.string(),
      style: z.record(z.any()).optional()
    })
  },

  Space: {
    category: 'primitive',
    description: 'Space for layout spacing',
    props: z.object({
      direction: z.enum(['horizontal', 'vertical']).optional(),
      size: z.union([z.enum(['small', 'middle', 'large']), z.number()]).optional(),
      wrap: z.boolean().optional(),
      align: z.enum(['start', 'end', 'center', 'baseline']).optional()
    }),
    slots: ['children']
  },

  Divider: {
    category: 'primitive',
    description: 'Divider line for separating content',
    props: z.object({
      type: z.enum(['horizontal', 'vertical']).optional(),
      orientation: z.enum(['left', 'center', 'right']).optional(),
      dashed: z.boolean().optional(),
      children: z.string().optional()
    })
  }
};

// ==================== Compound Catalog ====================

/**
 * 复合组件 Catalog
 */
export const compoundComponents: Record<string, ComponentSchema> = {
  Card: {
    category: 'compound',
    description: 'Card container for content grouping',
    props: z.object({
      title: z.string().optional(),
      bordered: z.boolean().optional(),
      loading: z.boolean().optional(),
      hoverable: z.boolean().optional(),
      size: z.enum(['default', 'small']).optional()
    }),
    slots: ['children']
  },

  Form: {
    category: 'compound',
    description: 'Form with validation support',
    props: z.object({
      layout: z.enum(['horizontal', 'vertical', 'inline']).optional(),
      labelAlign: z.enum(['left', 'right']).optional(),
      onFinish: z.string().optional()
    }),
    slots: ['children']
  },

  Table: {
    category: 'compound',
    description: 'Table component for displaying data',
    props: z.object({
      columns: z.array(z.object({
        title: z.string(),
        dataIndex: z.string(),
        key: z.string(),
        width: z.number().optional()
      })),
      dataSource: z.array(z.record(z.any())),
      loading: z.boolean().optional(),
      pagination: z.union([
        z.boolean(),
        z.object({
          current: z.number().optional(),
          pageSize: z.number().optional(),
          total: z.number().optional()
        })
      ]).optional(),
      rowKey: z.string().optional(),
      size: z.enum(['large', 'middle', 'small']).optional(),
      bordered: z.boolean().optional()
    })
  },

  Modal: {
    category: 'compound',
    description: 'Modal dialog component',
    props: z.object({
      title: z.string().optional(),
      open: z.boolean(),
      width: z.number().optional(),
      centered: z.boolean().optional(),
      onOk: z.string().optional(),
      onCancel: z.string().optional()
    }),
    slots: ['children']
  }
};

// ==================== Business Catalog ====================

/**
 * 业务组件 Catalog
 */
export const businessComponents: Record<string, ComponentSchema> = {
  UserCard: {
    category: 'business',
    description: 'User information card',
    props: z.object({
      username: z.string(),
      email: z.string().email(),
      avatar: z.string().optional(),
      role: z.string().optional(),
      showActions: z.boolean().optional()
    })
  },

  StatisticCard: {
    category: 'business',
    description: 'Statistic display card',
    props: z.object({
      title: z.string(),
      value: z.union([z.number(), z.string()]),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      precision: z.number().optional(),
      trend: z.enum(['up', 'down', 'flat']).optional()
    })
  }
};

// ==================== Templates Catalog ====================

/**
 * 布局模板 Catalog
 */
export const layoutTemplates: Record<string, TemplateSchema> = {
  DashboardLayout: {
    name: 'DashboardLayout',
    description: 'Standard dashboard layout with header and content',
    structure: {
      type: 'Space',
      props: {
        direction: 'vertical',
        size: 0,
        style: { minHeight: '100vh' }
      },
      children: [
        {
          type: 'Card',
          props: {
            bordered: false,
            bodyStyle: { padding: '24px' }
          },
          children: [
            {
              type: 'Typography',
              props: {
                type: 'Title',
                level: 2,
                children: '{{params.title}}'
              }
            }
          ]
        },
        {
          type: 'div',
          props: {
            style: { padding: '24px', background: '#f0f2f5', minHeight: 'calc(100vh - 100px)' }
          },
          children: [
            {
              type: 'div',
              props: {
                style: { padding: 24, background: '#fff', borderRadius: 8 }
              },
              children: '{{params.content}}'
            }
          ]
        }
      ]
    },
    parameters: {
      title: {
        type: 'string',
        description: 'Dashboard title',
        default: 'Dashboard'
      },
      content: {
        type: 'string',
        description: 'Content placeholder (will be replaced)',
        default: 'Content Area'
      }
    }
  },

  FormLayout: {
    name: 'FormLayout',
    description: 'Form layout with submit button',
    structure: {
      type: 'Card',
      props: {
        title: '{{params.title}}',
        bordered: false
      },
      children: [
        {
          type: 'Form',
          props: {
            layout: 'vertical'
          },
          children: '{{params.fields}}'
        }
      ]
    },
    parameters: {
      title: {
        type: 'string',
        description: 'Form title',
        default: 'Form'
      },
      fields: {
        type: 'array',
        description: 'Form fields (will be replaced)',
        default: []
      }
    }
  }
};

// ==================== Catalog Builder ====================

/**
 * Catalog 构建器
 */
export class CatalogBuilder {
  private catalog: Partial<DesignSystemCatalog> = {
    version: '1.0.0',
    primitives: {},
    compound: {},
    business: {},
    templates: {},
    tokens: defaultDesignTokens
  };

  /**
   * 添加原子组件
   */
  addPrimitive(name: string, schema: ComponentSchema): this {
    this.catalog.primitives![name] = schema;
    return this;
  }

  /**
   * 添加复合组件
   */
  addCompound(name: string, schema: ComponentSchema): this {
    this.catalog.compound![name] = schema;
    return this;
  }

  /**
   * 添加业务组件
   */
  addBusiness(name: string, schema: ComponentSchema): this {
    this.catalog.business![name] = schema;
    return this;
  }

  /**
   * 添加模板
   */
  addTemplate(name: string, schema: TemplateSchema): this {
    this.catalog.templates![name] = schema;
    return this;
  }

  /**
   * 设置 Design Tokens
   */
  setTokens(tokens: Partial<DesignTokens>): this {
    this.catalog.tokens = {
      ...this.catalog.tokens!,
      ...tokens
    };
    return this;
  }

  /**
   * 继承另一个 Catalog
   */
  extend(base: DesignSystemCatalog): this {
    this.catalog.primitives = {
      ...base.primitives,
      ...this.catalog.primitives
    };
    this.catalog.compound = {
      ...base.compound,
      ...this.catalog.compound
    };
    this.catalog.business = {
      ...base.business,
      ...this.catalog.business
    };
    this.catalog.templates = {
      ...base.templates,
      ...this.catalog.templates
    };
    return this;
  }

  /**
   * 构建 Catalog
   */
  build(): DesignSystemCatalog {
    return {
      version: this.catalog.version!,
      primitives: this.catalog.primitives!,
      compound: this.catalog.compound!,
      business: this.catalog.business!,
      templates: this.catalog.templates!,
      tokens: this.catalog.tokens!
    };
  }
}

// ==================== 默认 Catalog ====================

/**
 * 默认分层 Catalog
 */
export const defaultCatalog: DesignSystemCatalog = new CatalogBuilder()
  // 添加原子组件
  .addPrimitive('Button', primitiveComponents.Button)
  .addPrimitive('Input', primitiveComponents.Input)
  .addPrimitive('Typography', primitiveComponents.Typography)
  .addPrimitive('Space', primitiveComponents.Space)
  .addPrimitive('Divider', primitiveComponents.Divider)

  // 添加复合组件
  .addCompound('Card', compoundComponents.Card)
  .addCompound('Form', compoundComponents.Form)
  .addCompound('Table', compoundComponents.Table)
  .addCompound('Modal', compoundComponents.Modal)

  // 添加业务组件
  .addBusiness('UserCard', businessComponents.UserCard)
  .addBusiness('StatisticCard', businessComponents.StatisticCard)

  // 添加模板
  .addTemplate('DashboardLayout', layoutTemplates.DashboardLayout)
  .addTemplate('FormLayout', layoutTemplates.FormLayout)

  .build();

/**
 * 获取所有组件（扁平化）
 */
export function getAllComponents(catalog: DesignSystemCatalog): Record<string, ComponentSchema> {
  return {
    ...catalog.primitives,
    ...catalog.compound,
    ...catalog.business
  };
}

/**
 * 获取组件 Schema
 */
export function getComponentSchema(
  catalog: DesignSystemCatalog,
  componentName: string
): ComponentSchema | null {
  const all = getAllComponents(catalog);
  return all[componentName] || null;
}

/**
 * 检查组件是否在 Catalog 中
 */
export function hasComponent(catalog: DesignSystemCatalog, componentName: string): boolean {
  return getComponentSchema(catalog, componentName) !== null;
}
