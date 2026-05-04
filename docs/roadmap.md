# 开发路线图

本文档描述基于 json-render 构建 AI UI 体系的开发计划和里程碑。

## 整体规划

```
Phase 1 (MVP)        Phase 2            Phase 3            Phase 4
▼                    ▼                  ▼                  ▼
基础框架 ──────────► AI 集成 ─────────► 状态管理 ─────────► 双向同步
Catalog 增强        Prompt Engineering  Action Runtime     Figma Plugin
代码生成优化        Few-Shot           数据绑定           三方 Diff
```

## Phase 1: MVP (最小可行产品)

**目标**: 构建基础框架，验证核心概念

**时间**: 4-6 周

### 1.1 Catalog 系统增强
- [x] 基础 Catalog 定义 (Zod Schema)
- [ ] 分层 Catalog (primitive/compound/business)
- [ ] Design Token 支持
- [ ] Catalog 继承机制
- [ ] Catalog 版本管理

**交付物**:
```typescript
// 分层 Catalog
const catalog = {
  primitives: { Button, Input, ... },
  compound: { Form, Table, ... },
  business: { UserCard, ... },
  tokens: { colors, spacing, ... }
};
```

### 1.2 代码生成优化
- [ ] AST-based 代码生成 (Babel)
- [ ] 文件组织 (多文件输出)
- [ ] Import 解析优化
- [ ] TypeScript 类型生成
- [ ] Prettier 格式化

**交付物**:
```bash
# CLI 工具
json-render codegen schema.json --output ./src
```

### 1.3 文档与示例
- [ ] API 文档
- [ ] 使用示例
- [ ] 最佳实践指南

## Phase 2: AI 集成

**目标**: 接入 LLM，实现自然语言 → UI

**时间**: 6-8 周

### 2.1 Prompt Engineering
- [ ] System Prompt 模板
- [ ] Few-Shot Examples
- [ ] Prompt 优化 A/B 测试

**交付物**:
```typescript
const promptTemplate = `
你是 UI 生成助手。只能使用以下组件：
${Object.keys(catalog.components).join(', ')}

示例：
${examples.map(ex => `输入: ${ex.input}\n输出: ${JSON.stringify(ex.output)}`).join('\n\n')}
`;
```

### 2.2 Function Calling
- [ ] Claude/GPT Function Calling
- [ ] 输出校验与重试
- [ ] 增量编辑支持

**交付物**:
```typescript
const result = await generateUI({
  prompt: '创建一个登录表单',
  catalog,
  mode: 'incremental' // 支持增量编辑
});
```

### 2.3 质量保障
- [ ] 自动评估指标
- [ ] 用户反馈收集
- [ ] Prompt 迭代优化

## Phase 3: 运行时增强

**目标**: 实现完整的响应式状态和交互系统

**时间**: 6-8 周

### 3.1 响应式状态
- [ ] Reactive State 系统
- [ ] 数据绑定语法 `{{state.xxx}}`
- [ ] 表达式计算

**交付物**:
```typescript
const state = reactive({
  count: 0,
  doubled: computed(() => state.count * 2)
});
```

### 3.2 Action 系统
- [ ] 内置 Actions (fetch, navigate, message)
- [ ] 自定义 Action 注册
- [ ] Action 链式调用

**交付物**:
```typescript
const actions = {
  submit: async () => {
    const data = state.get('formData');
    await fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) });
    message.success('提交成功');
  }
};
```

### 3.3 表单增强
- [ ] 表单验证 (Zod)
- [ ] 错误提示
- [ ] 动态表单

**交付物**:
```typescript
const formSchema = {
  type: 'Form',
  props: {
    onSubmit: 'submit',
    validation: {
      username: z.string().min(3),
      email: z.string().email()
    }
  },
  children: [/* ... */]
};
```

### 3.4 列表渲染
- [ ] 虚拟滚动
- [ ] 数据分页
- [ ] 无限加载

## Phase 4: 双向同步

**目标**: 实现 Figma ↔ Code 双向同步

**时间**: 8-12 周

### 4.1 Figma Plugin (MVP)
- [ ] 基础节点解析
- [ ] 组件识别
- [ ] Props 提取
- [ ] JSON Schema 导出

**交付物**:
```typescript
// Figma Plugin
figma.currentPage.selection.forEach(node => {
  const schema = parser.parseNode(node);
  console.log(JSON.stringify(schema, null, 2));
});
```

### 4.2 Code → JSON
- [ ] AST 解析
- [ ] 状态/Action 提取
- [ ] 格式规范化

**交付物**:
```bash
# 解析现有代码
json-render parse ./src/components/Login.tsx
```

### 4.3 JSON → Figma
- [ ] 反向更新 API
- [ ] 组件实例化
- [ ] 属性同步

### 4.4 三方 Diff
- [ ] 差异计算
- [ ] 冲突检测
- [ ] 合并策略

**交付物**:
```typescript
const diff = calculateThreeWayDiff({
  figma: figmaNode,
  json: jsonSchema,
  code: codeAST
});

if (diff.hasConflict) {
  // 提示用户解决冲突
}
```

## Phase 5: 生产化

**目标**: 生产级稳定性、性能、可扩展性

**时间**: 持续

### 5.1 性能优化
- [ ] 渲染性能优化 (虚拟化、懒加载)
- [ ] 代码分割
- [ ] 缓存策略

### 5.2 可扩展性
- [ ] 插件系统
- [ ] 自定义组件注册
- [ ] 主题定制

### 5.3 工具链
- [ ] VS Code 插件
- [ ] Chrome DevTools 集成
- [ ] CLI 完善

### 5.4 企业特性
- [ ] 权限控制
- [ ] 审计日志
- [ ] 多租户支持

## 技术债务管理

### 当前已知问题
1. Catalog 扁平结构 → 需要分层
2. 代码生成简单 → 需要 AST
3. 缺少状态管理 → 需要响应式系统
4. 无 AI 集成 → 需要接入 LLM
5. 无 Figma 集成 → 需要开发 Plugin

### 优先级
| 问题 | 优先级 | Phase |
|------|--------|-------|
| Catalog 增强 | P0 | Phase 1 |
| 代码生成优化 | P0 | Phase 1 |
| AI 集成 | P0 | Phase 2 |
| 状态管理 | P1 | Phase 3 |
| Figma Plugin | P1 | Phase 4 |

## 成功指标

### Phase 1 完成标准
- [ ] 支持至少 30 个常用组件
- [ ] 代码生成可用率 > 90%
- [ ] 有完整的文档和示例

### Phase 2 完成标准
- [ ] 自然语言生成 UI 成功率 > 80%
- [ ] 生成结果符合 Catalog 约束 100%
- [ ] 平均生成时间 < 5s

### Phase 3 完成标准
- [ ] 支持完整的响应式状态
- [ ] 支持至少 10 种内置 Action
- [ ] 表单验证通过率 100%

### Phase 4 完成标准
- [ ] Figma → JSON 准确率 > 85%
- [ ] Code → JSON 准确率 > 90%
- [ ] 冲突解决可用率 > 80%

## 相关文档

- [整体架构](./architecture.md)
- [AI 生成层](./ai-layer.md)
- [Catalog 系统](./catalog-system.md)
- [运行时层](./runtime-layer.md)
- [代码生成层](./code-generation.md)
- [双向同步](./bidirectional-sync.md)
