# Catalog 系统设计

Catalog 系统是 AI UI 体系的核心，定义了允许使用的组件白名单及其约束。

## 当前问题

当前 demo 的 Catalog 是单层结构，不够灵活：

```typescript
// 当前: 扁平结构
export const antdCatalogSchema = {
  components: {
    Button: { props: z.object({ ... }) },
    Card: { props: z.object({ ... }) },
    // ... 所有组件混在一起
  }
};
```

## 改进方案

### 分层 Catalog

```typescript
interface DesignSystemCatalog {
  version: string;

  // 基础组件（原子组件）
  primitives: {
    Button: ComponentSchema;
    Input: ComponentSchema;
    Typography: ComponentSchema;
    // ...
  };

  // 复合组件（由基础组件组合）
  compound: {
    Form: ComponentSchema;
    Table: ComponentSchema;
    Modal: ComponentSchema;
    // ...
  };

  // 业务组件（领域特定）
  business: {
    UserCard: ComponentSchema;
    OrderTable: ComponentSchema;
    // ...
  };

  // 布局模板
  templates: {
    DashboardLayout: TemplateSchema;
    FormLayout: TemplateSchema;
    EmptyState: TemplateSchema;
    // ...
  };

  // 设计 Token
  tokens: {
    spacing: SpacingTokens;
    colors: ColorTokens;
    typography: TypographyTokens;
    borderRadius: RadiusTokens;
  };
}
```

### 组件 Schema 定义

```typescript
interface ComponentSchema {
  category: 'primitive' | 'compound' | 'business';
  description: string;

  // Props 定义
  props: z.ZodTypeAny;

  // 插槽定义（可包含子组件的属性）
  slots?: string[];

  // 约束条件
  constraints?: {
    maxChildren?: number;
    allowedParentTypes?: string[];
    requiredProps?: string[];
  };

  // 示例（用于 Few-Shot Learning）
  examples?: JsonNode[];

  // 文档
  documentation?: {
    usage: string;
    do: string[];
    dont: string[];
  };
}
```

### 模板 Schema

```typescript
interface TemplateSchema {
  name: string;
  description: string;

  // 模板结构
  structure: JsonNode;

  // 可配置参数
  parameters: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'enum';
      description: string;
      default?: any;
      options?: any[]; // for enum
    };
  };

  // 使用示例
  examples?: {
    params: Record<string, any>;
    result: JsonNode;
  }[];
}
```

## Catalog 继承

支持 Catalog 之间的继承和组合：

```typescript
// 基础 Catalog（Ant Design）
const baseCatalog: DesignSystemCatalog = {
  primitives: { Button, Input, ... },
  // ...
};

// 扩展 Catalog（企业组件库）
const enterpriseCatalog = extendCatalog(baseCatalog, {
  business: {
    EnterpriseTable: { /* ... */ },
    EnterpriseForm: { /* ... */ }
  }
});

// 项目 Catalog（项目特定）
const projectCatalog = extendCatalog(enterpriseCatalog, {
  business: {
    UserCard: { /* ... */ },
    // ...
  }
});
```

## 设计 Token

```typescript
interface DesignTokens {
  // 间距系统
  spacing: {
    xs: 4;
    sm: 8;
    md: 16;
    lg: 24;
    xl: 32;
    xxl: 48;
  };

  // 颜色系统
  colors: {
    primary: {
      default: '#1890ff';
      light: '#40a9ff';
      dark: '#096dd9';
    };
    success: '#52c41a';
    warning: '#faad14';
    error: '#ff4d4f';
    // ...
  };

  // 排版
  typography: {
    fontSize: {
      xs: 12;
      sm: 14;
      base: 16;
      lg: 18;
      xl: 20;
      xxl: 24;
    };
    lineHeight: {
      tight: 1.25;
      normal: 1.5;
      relaxed: 1.75;
    };
    fontWeight: {
      normal: 400;
      medium: 500;
      semibold: 600;
      bold: 700;
    };
  };

  // 圆角
  borderRadius: {
    sm: 4;
    base: 6;
    md: 8;
    lg: 12;
    xl: 16;
  };
}
```

## Catalog 版本管理

```typescript
interface CatalogVersion {
  version: string;
  catalog: DesignSystemCatalog;
  changelog: string[];
  migrations: {
    from: string;
    to: string;
    transform: (schema: JsonSchema) => JsonSchema;
  }[];
}

// 示例: 2.0.0 → 3.0.0 迁移
const migrations = [
  {
    from: '2.0.0',
    to: '3.0.0',
    transform: (schema: JsonSchema) => {
      // 自动迁移旧 Schema
      return migrateSchema(schema);
    }
  }
];
```

## Catalog CLI

提供 CLI 工具自动生成和管理 Catalog：

```bash
# 初始化 Catalog
npx catalog-cli init

# 添加组件
npx catalog-cli add Button --from antd

# 生成 TypeScript 类型
npx catalog-cli types

# 验证 Catalog
npx catalog-cli validate

# 发布 Catalog
npx catalog-cli publish
```

## 最佳实践

1. **原子化原则**: 基础组件应该是原子的、可组合的
2. **文档先行**: 每个组件必须包含描述和示例
3. **渐进增强**: 从基础组件开始，逐步构建业务组件
4. **版本兼容**: 保证 Schema 向后兼容，提供迁移工具
5. **类型推导**: 使用 Zod 自动推导 TypeScript 类型

## 相关文档

- [整体架构](./architecture.md)
- [AI 生成层](./ai-layer.md)
- [运行时层](./runtime-layer.md)
