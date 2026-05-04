# 双向同步设计

双向同步是 AI UI 体系的高级特性，实现 Figma 设计 ↔ JSON Schema ↔ React 代码之间的无缝同步。

## 整体架构

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Figma     │────▶│  JSON Schema    │────▶│  React Code │
│  (设计源)   │     │  (中间格式)     │     │  (生产代码) │
└─────────────┘     └─────────────────┘     └─────────────┘
      ▲                      │                      │
      │                      ▼                      │
      │              ┌─────────────────┐            │
      └──────────────│   AI 生成/映射   │◀───────────┘
                     └─────────────────┘
```

## 1. Figma → JSON

### Figma Plugin

开发 Figma Plugin 解析设计文件：

```typescript
// Figma Plugin 代码
class DesignParser {
  // 解析 Figma 节点
  parseNode(node: SceneNode): JsonNode {
    // 识别组件类型
    const componentType = this.recognizeComponent(node);

    // 提取 Props
    const props = this.extractProps(node);

    // 递归解析子节点
    const children = node.children
      ?.map(child => this.parseNode(child))
      .filter(Boolean);

    return {
      type: componentType,
      props,
      children
    };
  }

  // 识别组件类型
  private recognizeComponent(node: SceneNode): string {
    // 通过命名约定识别
    if (node.name.startsWith('Button/')) {
      return 'Button';
    }
    if (node.name.startsWith('Input/')) {
      return 'Input';
    }
    if (node.name.startsWith('Card/')) {
      return 'Card';
    }

    // 通过组件集识别
    if (node.type === 'COMPONENT_SET') {
      return this.mapComponentSet(node);
    }

    // 通过属性识别
    if (this.hasTextProperty(node)) {
      return 'Typography';
    }

    return 'div';  // 默认
  }

  // 提取 Props
  private extractProps(node: SceneNode): Record<string, any> {
    const props: Record<string, any> = {};

    // 提取尺寸
    if ('width' in node) {
      props.width = node.width;
    }
    if ('height' in node) {
      props.height = node.height;
    }

    // 提取颜色
    if (node.type === 'TEXT' && node.fills) {
      const fill = this.getSolidFill(node.fills);
      if (fill) {
        props.style = { color: this.rgbToHex(fill.color) };
      }
    }

    // 提取文字内容
    if (node.type === 'TEXT') {
      props.children = node.characters;
    }

    // 提取变体属性
    if (node.type === 'INSTANCE') {
      const componentProps = this.getComponentProperties(node);
      Object.assign(props, componentProps);
    }

    return props;
  }

  // 映射组件集
  private mapComponentSet(node: ComponentSetNode): string {
    const variants = node.children;
    // 根据变体映射到具体组件
    // 例如: Button/Primary/Large → Button { type: 'primary', size: 'large' }
  }
}

// Plugin 主入口
figma.showUI(__html__, { width: 400, height: 600 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'parse') {
    const parser = new DesignParser();
    const selection = figma.currentPage.selection;
    const jsonNodes = selection.map(node => parser.parseNode(node));

    // 生成完整的 JSON Schema
    const schema: JsonSchema = {
      version: '1.0.0',
      component: {
        type: 'Space',
        props: { direction: 'vertical' },
        children: jsonNodes
      }
    };

    figma.ui.postMessage({
      type: 'result',
      schema
    });
  }
};
```

### 设计 Token 提取

```typescript
class TokenExtractor {
  extractTokens(figma: DocumentNode): DesignTokens {
    // 查找 Token 文件（通常在单独的页面）
    const tokenPages = figma.pages.find(p =>
      p.name.includes('Token') || p.name.includes('Design System')
    );

    if (!tokenPages) {
      return this.getDefaultTokens();
    }

    return {
      colors: this.extractColorTokens(tokenPages),
      spacing: this.extractSpacingTokens(tokenPages),
      typography: this.extractTypographyTokens(tokenPages),
      borderRadius: this.extractRadiusTokens(tokenPages)
    };
  }

  private extractColorTokens(page: PageNode): ColorTokens {
    const colors: ColorTokens = {};
    const colorFrames = page.children.filter(node =>
      node.name.toLowerCase().includes('color')
    );

    colorFrames.forEach(frame => {
      frame.children.forEach(child => {
        if (child.type === 'RECTANGLE' && child.fills) {
          const fill = this.getSolidFill(child.fills);
          if (fill) {
            const colorName = this.toCamelCase(child.name);
            colors[colorName] = this.rgbToHex(fill.color);
          }
        }
      });
    });

    return colors;
  }
}
```

## 2. JSON → Figma

### 反向同步

```typescript
class FigmaSync {
  private figmaClient: FigmaApiClient;

  constructor(apiKey: string) {
    this.figmaClient = new FigmaApiClient(apiKey);
  }

  // 将 JSON Schema 同步到 Figma
  async syncToFigma(
    schema: JsonSchema,
    fileKey: string,
    nodeId: string
  ): Promise<void> {
    // 1. 获取当前 Figma 文件
    const file = await this.figmaClient.getFile(fileKey);
    const node = this.findNode(file, nodeId);

    // 2. 计算差异
    const diff = this.calculateDiff(node, schema);

    // 3. 应用变更
    await this.applyChanges(fileKey, nodeId, diff);
  }

  // 计算差异
  private calculateDiff(
    figmaNode: any,
    jsonSchema: JsonSchema
  ): DiffResult {
    return {
      added: [],
      removed: [],
      modified: [],
      unchanged: []
    };
  }

  // 应用变更
  private async applyChanges(
    fileKey: string,
    nodeId: string,
    diff: DiffResult
  ): Promise<void> {
    // 使用 Figma API 应用变更
    // 注意: Figma API 有限制，某些操作需要通过 Plugin 完成
  }
}
```

## 3. Code → JSON

### AST 解析

```typescript
import * as t from '@babel/types';
import parser from '@babel/parser';
import traverse from '@babel/traverse';

class CodeParser {
  // 解析 React 代码为 JSON Schema
  parseToSchema(code: string): JsonSchema {
    // 1. 解析 AST
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    // 2. 提取组件
    let componentNode: JsonNode | null = null;

    traverse(ast, {
      JSXElement(path) {
        if (!componentNode) {
          componentNode = this.parseJSXElement(path.node);
        }
      }
    });

    // 3. 提取 State
    const state = this.extractState(ast);

    // 4. 提取 Actions
    const actions = this.extractActions(ast);

    return {
      version: '1.0.0',
      component: componentNode!,
      state,
      actions
    };
  }

  // 解析 JSX 元素
  private parseJSXElement(element: t.JSXElement): JsonNode {
    const opening = element.openingElement;
    const tagName = this.getTagName(openingElement.name);

    // 提取 Props
    const props: Record<string, any> = {};
    opening.attributes.forEach(attr => {
      if (t.isJSXAttribute(attr)) {
        const name = attr.name.name as string;
        const value = this.getJSXValue(attr.value);
        props[name] = value;
      }
    });

    // 提取 Children
    const children: JsonNode[] = [];
    element.children.forEach(child => {
      if (t.isJSXElement(child)) {
        children.push(this.parseJSXElement(child));
      } else if (t.isJSXText(child)) {
        // 文本节点
        const text = child.value.trim();
        if (text) {
          children.push({
            type: 'TypographyText',
            props: { children: text }
          });
        }
      }
    });

    return {
      type: tagName,
      props,
      children
    };
  }

  // 提取 State
  private extractState(ast: t.Program): StateDefinition {
    // 查找 useState 调用
    const state: Record<string, any> = {};

    traverse(ast, {
      CallExpression(path) {
        if (
          t.isIdentifier(path.node.callee, { name: 'useState' }) &&
          path.parent.type === 'VariableDeclarator'
        ) {
          const varName = path.parent.id.name;
          const initialValue = this.evaluateExpression(path.node.arguments[0]);
          state[varName] = initialValue;
        }
      }
    });

    return {
      initialValues: state
    };
  }
}
```

## 4. 三方 Diff

```typescript
class ThreeWayDiff {
  // 计算 Figma/JSON/Code 三方差异
  calculate(
    figmaNode: any,
    jsonSchema: JsonSchema,
    codeAST: t.Program
  ): DiffResult {
    // 1. 将三者转换为统一格式
    const normalizedFigma = this.normalizeFigma(figmaNode);
    const normalizedJSON = this.normalizeJSON(jsonSchema);
    const normalizedCode = this.normalizeCode(codeAST);

    // 2. 计算两两差异
    const figmaVsJSON = this.diff(normalizedFigma, normalizedJSON);
    const jsonVsCode = this.diff(normalizedJSON, normalizedCode);
    const figmaVsCode = this.diff(normalizedFigma, normalizedCode);

    // 3. 分析变更来源
    return this.analyzeChanges({
      figmaVsJSON,
      jsonVsCode,
      figmaVsCode
    });
  }

  // 分析变更来源
  private analyzeChanges(diffs: {
    figmaVsJSON: Diff;
    jsonVsCode: Diff;
    figmaVsCode: Diff;
  }): DiffResult {
    // 如果 Figma 和 JSON 一致，但与 Code 不同
    // 说明 Code 被手动修改了

    // 如果 JSON 和 Code 一致，但与 Figma 不同
    // 说明设计被修改了

    // 如果三者都不同
    // 需要用户手动解决冲突
  }
}
```

## 冲突解决

```typescript
interface ConflictResolution {
  strategy: 'prefer-figma' | 'prefer-code' | 'prefer-json' | 'manual';
  manualResolve?: (conflict: Conflict) => any;
}

class ConflictResolver {
  resolve(
    conflict: Conflict,
    strategy: ConflictResolution
  ): any {
    switch (strategy.strategy) {
      case 'prefer-figma':
        return conflict.figmaValue;
      case 'prefer-code':
        return conflict.codeValue;
      case 'prefer-json':
        return conflict.jsonValue;
      case 'manual':
        return strategy.manualResolve!(conflict);
    }
  }
}
```

## 实现路线

### Phase 1: 单向同步
- [ ] Figma Plugin → JSON (基础解析)
- [ ] JSON → Code (已有基础)

### Phase 2: 增强解析
- [ ] Figma 组件识别
- [ ] Design Token 提取
- [ ] Code → JSON (AST 解析)

### Phase 3: 双向同步
- [ ] JSON → Figma (反向更新)
- [ ] 冲突检测
- [ ] 冲突解决

### Phase 4: 三方同步
- [ ] 实时同步
- [ ] 变更来源追踪
- [ ] 自动合并

## 相关文档

- [整体架构](./architecture.md)
- [代码生成层](./code-generation.md)
- [开发路线图](./roadmap.md)
