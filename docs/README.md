# AI UI 体系文档

本文档集描述基于 json-render 构建完整 AI UI 体系的设计和实现。

## 文档导航

### 核心文档

| 文档 | 描述 |
|------|------|
| [架构设计](./architecture.md) | 整体架构和设计原则 |
| [开发路线图](./roadmap.md) | 开发计划和里程碑 |
| [Action 系统](./action-system.md) | Action 系统核心设计 |
| [Action 安全性](./action-security.md) | 安全设计与防护 |
| [Action 类型安全](./action-type-safety.md) | 类型安全最佳实践 |

### 分层设计

| 层级 | 文档 | 描述 |
|------|------|------|
| AI Layer | [AI 生成层](./ai-layer.md) | Prompt Engineering、Function Calling |
| Schema Layer | [Catalog 系统](./catalog-system.md) | 组件白名单、设计 Token |
| Runtime Layer | [运行时层](./runtime-layer.md) | 渲染引擎、状态管理 |
| Code Gen Layer | [代码生成层](./code-generation.md) | AST 生成、文件组织 |
| Sync Layer | [双向同步](./bidirectional-sync.md) | Figma ↔ Code 同步 |

## 快速开始

### 理解架构

建议按以下顺序阅读：

1. [架构设计](./architecture.md) - 了解整体架构
2. [Catalog 系统](./catalog-system.md) - 理解核心概念
3. [开发路线图](./roadmap.md) - 了解实现计划

### 参与开发

参考 [开发路线图](./roadmap.md) 中的 Phase 规划：

- **Phase 1**: Catalog + 代码生成 (MVP)
- **Phase 2**: AI 集成
- **Phase 3**: 运行时增强
- **Phase 4**: 双向同步

## 核心概念

### Schema-First

所有 UI 定义必须符合预先定义的 Schema：

```typescript
// Catalog 定义 (白名单)
const catalog = {
  Button: {
    props: z.object({
      type: z.enum(['primary', 'default']),
      children: z.string()
    })
  }
};

// AI 只能生成符合 Catalog 的 JSON
{
  "type": "Button",
  "props": {
    "type": "primary",  // ✓ 必须是 enum 中的值
    "children": "Submit"
  }
}
```

### 三层架构

```
Prompt (自然语言)
    ↓
AI + Catalog (约束生成)
    ↓
JSON Schema (标准格式)
    ↓
Runtime (渲染)
    ↓
UI (最终界面)
```

### 双向同步

```
Figma ─────► JSON ─────► Code
  ◲                           │
  └───────────┬───────────────┘
              │
           用户编辑
```

## 技术栈

| 层级 | 技术 |
|------|------|
| AI | Claude 3.5 Sonnet |
| Schema | Zod 4.x |
| Runtime | React 19 + Zustand |
| Code Gen | Babel AST |
| Design | Ant Design 6 |

## 贡献指南

### 添加文档

```bash
# 在 docs/ 目录下创建新文档
docs/new-topic.md

# 更新 README.md 索引
docs/README.md
```

### 文档规范

- 使用 Markdown 格式
- 代码使用 TypeScript
- 包含可运行的示例
- 保持与现有文档风格一致

## 相关资源

- [json-render 原项目](https://github.com/vercel-labs/json-render)
- [Zod 文档](https://zod.dev/)
- [Claude API](https://docs.anthropic.com/)

## 更新日志

- 2026-05-04: Phase 1 MVP 完成，详见 [Phase 1 总结](./phase1-summary.md)
- 2026-05-04: 初始文档创建
