# AI 生成层设计

AI 生成层负责将用户的自然语言描述转换为符合 Catalog 约束的 JSON Schema。

## 核心组件

### 1. Prompt Engineering

```typescript
interface PromptConfig {
  systemPrompt: string;
  fewShotExamples: Example[];
  outputFormat: 'json' | 'function_call';
}

const createUIMessage = (
  userPrompt: string,
  catalog: Catalog,
  config: PromptConfig
) => ({
  role: 'system',
  content: `你是 UI 生成助手。只能使用以下组件：
${Object.keys(catalog.components).join(', ')}

每个组件的 Props 必须符合以下 Schema：
${JSON.stringify(catalog.components, null, 2)}

输出格式：
{
  "version": "1.0.0",
  "component": { ... },
  "actions": { ... }
}`
}, {
  role: 'user',
  content: userPrompt
});
```

### 2. Function Calling

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const generateUI = async (prompt: string) => {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    tools: [{
      name: 'generate_ui',
      description: 'Generate UI from natural language',
      input_schema: {
        type: 'object',
        properties: {
          schema: {
            type: 'object',
            description: 'JSON Schema for the UI'
          }
        },
        required: ['schema']
      }
    }],
    messages: [{ role: 'user', content: prompt }]
  });

  return message.content.find(b => b.type === 'tool_use')
    ?.input?.schema;
};
```

### 3. Few-Shot Examples

```typescript
const examples = [
  {
    input: '创建一个登录表单',
    output: {
      version: '1.0.0',
      component: {
        type: 'Card',
        props: { title: '登录' },
        children: [
          {
            type: 'Input',
            props: { placeholder: '用户名' }
          },
          {
            type: 'Input.Password',
            props: { placeholder: '密码' }
          },
          {
            type: 'Button',
            props: { type: 'primary', children: '登录' }
          }
        ]
      }
    }
  },
  // ... 更多示例
];
```

### 4. 输出验证

```typescript
import { validateJsonSchema } from './schemaValidator';

const generateAndValidate = async (prompt: string) => {
  // 1. 调用 AI 生成
  const schema = await generateUI(prompt);

  // 2. Zod 校验
  const result = validateJsonSchema(schema);

  if (!result.valid) {
    // 3. 校验失败，重试
    return generateUI(
      `${prompt}\n\n上一次生成校验失败：\n${result.errors.join('\n')}`
    );
  }

  return schema;
};
```

## 增量编辑

支持对已有 UI 进行增量修改，而非全量重新生成：

```typescript
interface EditRequest {
  type: 'add' | 'remove' | 'modify' | 'reorder';
  target: string; // 组件路径，如 'component.children.1'
  payload: any;
}

const incrementalEdit = async (
  currentSchema: JsonSchema,
  edit: EditRequest
) => {
  const prompt = `
当前 UI：
${JSON.stringify(currentSchema, null, 2)}

请执行操作：${edit.type}
目标位置：${edit.target}
修改内容：${JSON.stringify(edit.payload)}

只输出修改后的完整 JSON Schema。
`;

  return generateUI(prompt);
};
```

## 质量优化

### 1. 多轮对话

```typescript
const conversationalGeneration = async (conversation: Message[]) => {
  // 保留对话历史，支持上下文理解
  const messages = [
    createSystemPrompt(catalog),
    ...conversation
  ];

  return anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages,
    tools: [generateUITool]
  });
};
```

### 2. 反馈学习

```typescript
interface GenerationFeedback {
  schema: JsonSchema;
  userRating: number; // 1-5
  issues: string[];
  acceptedChanges: string[];
}

const learnFromFeedback = (feedback: GenerationFeedback) => {
  // 存储反馈用于优化 Prompt
  feedbackStore.save(feedback);
};
```

## 性能优化

1. **Prompt 缓存**: 使用 Claude 的 Prompt Caching 减少 Token 消耗
2. **流式输出**: 实时展示生成过程
3. **并行验证**: 生成与验证并行进行

```typescript
const streamGenerate = async (prompt: string) => {
  const stream = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: prompt }],
    stream: true
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      // 实时输出
      onChunk(chunk.delta.text);
    }
  }
};
```
