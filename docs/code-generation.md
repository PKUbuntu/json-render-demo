# 代码生成层设计

代码生成层负责将 JSON Schema 转换为可用的 React 源代码。

## 当前问题

当前 demo 的代码生成器较简单，存在以下问题：

1. **代码质量不高**: 缺少格式化、优化
2. **文件组织**: 只生成单个文件，无法处理复杂项目
3. **Import 解析**: Import 语句不够智能
4. **类型定义**: 缺少 TypeScript 类型生成

## 改进方案

### AST-based 代码生成

使用 Babel AST 生成高质量代码：

```typescript
import * as t from '@babel/types';
import generate from '@babel/generator';
import prettier from 'prettier';

interface CodeGenOptions {
  format: boolean;  // 是否使用 prettier 格式化
  typescript: boolean;
  filePath?: string;
}

class CodeGenerator {
  private options: CodeGenOptions;

  constructor(options: CodeGenOptions) {
    this.options = options;
  }

  // 生成组件 AST
  private generateComponentAST(node: JsonNode): t JSXElement {
    const { type, props, children = [] } = node;

    // 组件名称
    const componentName = this.getComponentName(type);

    // Props AST
    const propsAST = this.generatePropsAST(props);

    // Children AST
    const childrenAST = children.map(c => this.generateComponentAST(c));

    // 创建 JSX 元素
    return t.jsxElement(
      t.jsxOpeningElement(
        t.jsxIdentifier(componentName),
        propsAST,
        childrenAST.length > 0
      ),
      childrenAST.length > 0
        ? t.jsxClosingElement(t.jsxIdentifier(componentName))
        : null,
      childrenAST,
      false
    );
  }

  // 生成 Props AST
  private generatePropsAST(props: Record<string, any>): t JSXAttribute[] {
    return Object.entries(props).map(([key, value]) => {
      if (typeof value === 'string') {
        return t.jsxAttribute(
          t.jsxIdentifier(key),
          t.stringLiteral(value)
        );
      }

      if (typeof value === 'boolean') {
        return t.jsxAttribute(
          t.jsxIdentifier(key),
          null  // boolean prop
        );
      }

      if (typeof value === 'number') {
        return t.jsxAttribute(
          t.jsxIdentifier(key),
          t.jsxExpressionContainer(t.numericLiteral(value))
        );
      }

      if (Array.isArray(value) || typeof value === 'object') {
        return t.jsxAttribute(
          t.jsxIdentifier(key),
          t.jsxExpressionContainer(
            t.valueToNode(value)
          )
        );
      }

      return t.jsxAttribute(
        t.jsxIdentifier(key),
        t.jsxExpressionContainer(t.valueToNode(value))
      );
    });
  }

  // 生成完整文件
  generateFile(schema: JsonSchema): string {
    // 收集使用的组件
    const usedComponents = this.collectComponents(schema.component);

    // 生成 Import 语句
    const imports = this.generateImports(usedComponents);

    // 生成组件 AST
    const componentAST = this.generateComponentAST(schema.component);

    // 生成函数组件
    const functionDeclaration = t.functionDeclaration(
      t.identifier('GeneratedComponent'),
      [],
      t.blockStatement([
        t.returnStatement(componentAST)
      ])
    );

    // 生成 AST
    const ast = t.program([
      ...imports,
      functionDeclaration,
      t.exportDefaultDeclaration(functionDeclaration)
    ]);

    // 生成代码
    const { code } = generate(ast);

    // 格式化
    if (this.options.format) {
      return prettier.format(code, {
        parser: this.options.typescript ? 'typescript' : 'babel',
        semi: true,
        singleQuote: true,
        tabWidth: 2
      });
    }

    return code;
  }
}
```

### 文件组织

生成完整的项目结构：

```typescript
interface FileTree {
  [path: string]: string | FileTree;
}

interface ProjectOptions {
  name: string;
  framework: 'react' | 'vue' | 'solid';
  language: 'typescript' | 'javascript';
  styling: 'css' | 'scss' | 'styled-components';
  stateManagement: 'zustand' | 'redux' | 'jotai' | 'none';
}

class ProjectGenerator {
  generate(schema: JsonSchema, options: ProjectOptions): FileTree {
    return {
      [`${options.name}/`]: {
        'src/': {
          'components/': this.generateComponents(schema),
          'hooks/': this.generateHooks(schema),
          'types/': this.generateTypes(schema),
          'utils/': this.generateUtils(schema),
          'App.tsx': this.generateApp(schema),
          'main.tsx': this.generateMain(options),
          'index.css': this.generateStyles(),
        },
        'package.json': this.generatePackageJson(options),
        'tsconfig.json': this.generateTSConfig(),
        'vite.config.ts': this.generateViteConfig(options),
      }
    };
  }

  private generateComponents(schema: JsonSchema): FileTree {
    const components: FileTree = {};

    // 提取子组件
    const subComponents = this.extractComponents(schema.component);

    subComponents.forEach(comp => {
      const fileName = `${kebabCase(comp.name)}.tsx`;
      components[fileName] = new CodeGenerator({
        format: true,
        typescript: true
      }).generateFile(comp.schema);
    });

    return components;
  }

  private generateHooks(schema: JsonSchema): FileTree {
    const hooks: FileTree = {};

    if (schema.state) {
      hooks['useGeneratedState.ts'] = this.generateStateHook(schema.state);
    }

    if (schema.actions) {
      hooks['useGeneratedActions.ts'] = this.generateActionsHook(schema.actions);
    }

    return hooks;
  }

  private generateTypes(schema: JsonSchema): FileTree {
    return {
      'generated.ts': this.generateTypeDefinitions(schema)
    };
  }
}
```

### 类型定义生成

```typescript
class TypeGenerator {
  generateTypes(schema: JsonSchema): string {
    const types: string[] = [];

    // 从 Schema 生成类型
    types.push(this.generateComponentType(schema.component));
    types.push(this.generateStateType(schema.state));
    types.push(this.generateActionsType(schema.actions));

    return types.join('\n\n');
  }

  private generateComponentType(node: JsonNode): string {
    const propsInterface = this.generatePropsInterface(node);
    return `export interface ${pascalCase(node.type)}Props {
${propsInterface}
}`;
  }

  private generatePropsInterface(node: JsonNode): string {
    if (!node.props) return '  [key: string]: any;';

    const props = Object.entries(node.props).map(([key, value]) => {
      const tsType = this.inferType(value);
      return `  ${key}: ${tsType};`;
    });

    return props.join('\n');
  }

  private inferType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'any[]';
    if (typeof value === 'object') return 'Record<string, any>';
    return 'any';
  }
}
```

### 状态 Hook 生成

```typescript
function generateStateHook(stateDef: StateDefinition): string {
  return `
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface GeneratedState {
${Object.keys(stateDef.initialValues).map(key =>
  `  ${key}: ${typeof stateDef.initialValues[key]};`
).join('\n')}
}

interface GeneratedActions {
${Object.keys(stateDef.initialValues).map(key =>
  `  set${pascalCase(key)}: (value: ${typeof stateDef.initialValues[key]}) => void;`
).join('\n')}
}

export const useGeneratedStore = create<GeneratedState & GeneratedActions>()(
  devtools((set) => ({
    // Initial state
${Object.entries(stateDef.initialValues).map(([key, value]) =>
  `    ${key}: ${JSON.stringify(value)},`
).join('\n')}

    // Actions
${Object.keys(stateDef.initialValues).map(key =>
  `    set${pascalCase(key)}: (value) => set({ ${key}: value }),`
).join('\n')}
  }))
);
`;
}
```

### Action Hook 生成

```typescript
function generateActionsHook(actions: Record<string, ActionDefinition>): string {
  return `
import { useCallback } from 'react';
import { useGeneratedStore } from './useGeneratedState';

export function useGeneratedActions() {
  const setState = useGeneratedStore.setState);

${Object.entries(actions).map(([name, action]) => `
  const ${camelCase(name)} = useCallback(async (params?: any) => {
    // Action: ${action.description}
    // TODO: Implement action logic
    console.log('${name} called with:', params);
  }, []);`).join('\n')}

  return {
${Object.keys(actions).map(name =>
  `    ${camelCase(name)},`
).join('\n')}
  };
}
`;
}
```

### 代码优化

```typescript
class CodeOptimizer {
  optimize(ast: t.Program): t.Program {
    // 移除未使用的 imports
    this.removeUnusedImports(ast);

    // 内联简单组件
    this.inlineSimpleComponents(ast);

    // 合并相似样式
    this.mergeStyles(ast);

    // 提取常量
    this.extractConstants(ast);

    return ast;
  }

  private removeUnusedImports(ast: t.Program): void {
    const usedIdentifiers = new Set<string>();

    // 遍历 AST 收集使用的标识符
    traverse(ast, {
      Identifier(path) {
        usedIdentifiers.add(path.node.name);
      }
    });

    // 移除未使用的 import
    ast.body = ast.body.filter(node => {
      if (t.isImportDeclaration(node)) {
        return node.specifiers.some(spec =>
          usedIdentifiers.has(
            t.isImportDefaultSpecifier(spec)
              ? spec.local.name
              : spec.imported.name
          )
        );
      }
      return true;
    });
  }
}
```

### CLI 工具

```bash
# 生成代码
json-render codegen schema.json --output ./src

# 选择性生成
json-render codegen schema.json --components-only

# 格式化选项
json-render codegen schema.json --prettier --no-typescript

# 预览生成结果（不写入文件）
json-render codegen schema.json --dry-run
```

## 最佳实践

1. **类型优先**: 始终生成 TypeScript 类型定义
2. **可读性**: 使用 Prettier 格式化生成的代码
3. **可维护性**: 分离组件、状态、逻辑到不同文件
4. **可扩展性**: 使用 Config 支持自定义模板

## 相关文档

- [整体架构](./architecture.md)
- [运行时层](./runtime-layer.md)
- [双向同步](./bidirectional-sync.md)
