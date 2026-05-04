# AI UI 体系架构设计

本文档描述基于 json-render 构建完整 AI UI 体系的整体架构设计。

## 整体架构分层

```
┌─────────────────────────────────────────────────────────────┐
│  AI Layer (Prompt → JSON)                                    │
│  ├─ LLM + Function Calling                                  │
│  ├─ Prompt Engineering with Catalog Context                 │
│  └─ Output Parser (Zod Validation)                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Schema Layer (Catalog System)                               │
│  ├─ Component Catalog (白名单)                               │
│  ├─ Props Schema (Zod)                                      │
│  ├─ Layout Patterns (Grid/Form/List 等)                     │
│  └─ Design Tokens (主题/间距/颜色)                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Runtime Layer (渲染引擎)                                     │
│  ├─ JsonRenderer (递归渲染)                                  │
│  ├─ State Management (响应式状态)                            │
│  ├─ Action Handlers (事件处理)                               │
│  └─ Data Binding (数据绑定)                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Code Gen Layer (JSON → Code)                                │
│  ├─ AST Generator                                            │
│  ├─ File Organizer                                           │
│  └─ Import Resolver                                          │
└─────────────────────────────────────────────────────────────┘
```

## 数据流向

```
User Prompt
    ↓
AI Layer (LLM + Catalog Context)
    ↓
JSON Schema (Zod Validated)
    ↓
Runtime Layer (Render)
    ↓
UI Component Tree
    ↓
User Interaction
    ↓
Action Handler
    ↓
State Update / Side Effect
```

## 核心设计原则

1. **Schema-First**: 所有 UI 定义必须符合预先定义的 Schema
2. **可预测性**: AI 输出完全受 Catalog 约束，结果可预测
3. **可逆性**: JSON ↔ Code 可双向转换
4. **可组合性**: Catalog 支持组件组合和继承
5. **类型安全**: 全程使用 Zod + TypeScript 保证类型安全

## 技术选型

| 层级 | 推荐技术 | 说明 |
|------|----------|------|
| AI Layer | Claude 3.5 Sonnet | 支持 Function Calling |
| Schema | Zod 4.x | 运行时校验 + TS 类型推导 |
| Runtime | React 19 + Zustand | 组件库 + 状态管理 |
| Code Gen | Babel AST | 高质量代码生成 |
| Design Tokens | CSS-in-JS | 主题系统 |

## 相关文档

- [AI 生成层设计](./ai-layer.md)
- [Catalog 系统设计](./catalog-system.md)
- [运行时层设计](./runtime-layer.md)
- [代码生成层设计](./code-generation.md)
- [双向同步设计](./bidirectional-sync.md)
- [开发路线图](./roadmap.md)
