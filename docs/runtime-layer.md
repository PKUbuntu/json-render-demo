# 运行时层设计

运行时层负责将 JSON Schema 渲染为真实的 UI 组件，并管理状态和交互。

## 当前问题

当前 demo 的渲染器缺少以下关键能力：

1. **响应式状态**: 状态变化不会自动触发重新渲染
2. **数据绑定**: 无法将组件与状态数据绑定
3. **完整的 Action 系统**: Action 处理器不够完善
4. **生命周期管理**: 缺少组件生命周期钩子

## 改进方案

### 响应式状态系统

```typescript
// 状态定义
interface StateDefinition {
  initialValues: Record<string, any>;
  computed?: Record<string, (state: any) => any>;
  watchers?: Record<string, (newVal: any, oldVal: any) => void>;
}

// 响应式状态管理
class ReactiveState {
  private state: Reactive<any>;
  private watchers: Map<string, Set<Function>>;

  constructor(initial: Record<string, any>) {
    this.state = reactive(initial);
    this.watchers = new Map();
  }

  get(path: string): any {
    return get(this.state, path);
  }

  set(path: string, value: any): void {
    const oldVal = this.get(path);
    set(this.state, path, value);

    // 触发 watchers
    this.watchers.get(path)?.forEach(fn => fn(value, oldVal));
  }

  watch(path: string, fn: Function): () => void {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, new Set());
    }
    this.watchers.get(path)!.add(fn);

    return () => this.watchers.get(path)?.delete(fn);
  }
}
```

### 数据绑定

```typescript
// 绑定表达式
interface BindingExpression {
  type: 'state' | 'computed' | 'literal';
  path?: string;        // 如 'state.user.name'
  expression?: string;  // 如 '{{state.count * 2}}'
  value?: any;          // 字面量
}

// 解析绑定
function parseBinding(value: any): BindingExpression {
  if (typeof value === 'string' && value.startsWith('{{')) {
    const expr = value.slice(2, -2).trim();
    return {
      type: 'computed',
      expression: expr
    };
  }

  if (typeof value === 'string' && value.startsWith('state.')) {
    return {
      type: 'state',
      path: value.slice(6)
    };
  }

  return {
    type: 'literal',
    value
  };
}

// 求值
function evaluateBinding(
  binding: BindingExpression,
  state: ReactiveState
): any {
  switch (binding.type) {
    case 'state':
      return state.get(binding.path!);
    case 'computed':
      // 安全执行表达式
      return safeEval(binding.expression!, { state });
    case 'literal':
      return binding.value;
  }
}
```

### 增强的 JsonRenderer

```typescript
interface EnhancedJsonSchema {
  version: string;
  component: JsonNode;
  state: StateDefinition;
  actions: Record<string, ActionDefinition>;
  lifecycle?: {
    onMount?: string;
    onUpdate?: string;
    onUnmount?: string;
  };
}

export const EnhancedJsonRenderer: React.FC<{
  schema: EnhancedJsonSchema;
  externalState?: Record<string, any>;
}> = ({ schema, externalState = {} }) => {
  // 创建响应式状态
  const state = useMemo(
    () => new ReactiveState({
      ...schema.state.initialValues,
      ...externalState
    }),
    [schema]
  );

  // 处理生命周期
  useEffect(() => {
    if (schema.lifecycle?.onMount) {
      executeAction(schema.lifecycle.onMount, { state });
    }
    return () => {
      if (schema.lifecycle?.onUnmount) {
        executeAction(schema.lifecycle.onUnmount, { state });
      }
    };
  }, []);

  // 渲染节点
  const renderNode = (node: JsonNode): ReactNode => {
    const { type, props = {}, children = [] } = node;

    // 解析绑定
    const resolvedProps = Object.entries(props).reduce((acc, [key, value]) => {
      const binding = parseBinding(value);
      acc[key] = evaluateBinding(binding, state);
      return acc;
    }, {} as any);

    // 解析事件处理器
    const eventHandlers = {
      onClick: props.onClick ? (e: Event) => {
        executeAction(props.onClick, { state, event: e });
      } : undefined,
      onChange: props.onChange ? (e: Event) => {
        const value = e?.target?.value ?? e;
        executeAction(props.onChange, { state, value });
      } : undefined,
    };

    return React.createElement(
      componentMap[type],
      { ...resolvedProps, ...eventHandlers },
      children.map(renderNode)
    );
  };

  return renderNode(schema.component);
};
```

### Action 系统

```typescript
interface ActionContext {
  state: ReactiveState;
  event?: Event;
  value?: any;
  params?: Record<string, any>;
}

type ActionHandler = (context: ActionContext) => void | Promise<void>;

// 内置 Actions
const builtInActions: Record<string, ActionHandler> = {
  // 更新状态
  updateState: ({ state, params }) => {
    const { key, value } = params!;
    state.set(key, value);
  },

  // 导航
  navigate: ({ params }) => {
    const { path, query } = params!;
    // 路由导航逻辑
  },

  // HTTP 请求
  fetch: async ({ state, params }) => {
    const { url, method = 'GET', stateKey } = params!;
    const response = await fetch(url, { method });
    const data = await response.json();
    if (stateKey) {
      state.set(stateKey, data);
    }
  },

  // 显示消息
  message: ({ params }) => {
    const { type, content } = params!;
    message[type](content);
  },

  // 打开 Modal
  openModal: ({ state, params }) => {
    const { modalId, data } = params!;
    state.set(`modals.${modalId}.open`, true);
    state.set(`modals.${modalId}.data`, data);
  },

  // 条件渲染
  if: ({ state, params }) => {
    const { condition, then, else: else_ } = params!;
    return state.get(condition) ? then : else_;
  }
};

// 执行 Action
function executeAction(
  actionName: string,
  context: ActionContext
): void {
  const handler = builtInActions[actionName];
  if (handler) {
    handler(context);
  } else {
    console.warn(`Unknown action: ${actionName}`);
  }
}
```

### 表单增强

```typescript
interface FormSchema extends JsonNode {
  type: 'Form';
  props: {
    onSubmit: string;  // Action 名称
    validation?: Record<string, ZodSchema>;
  };
  children: JsonNode[];
}

// 表单渲染器
const FormRenderer: React.FC<{
  schema: FormSchema;
  state: ReactiveState;
}> = ({ schema, state }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    // 验证
    const validationErrors = validateForm(schema, state);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // 执行提交
    await executeAction(schema.props.onSubmit, { state });
  };

  return (
    <form onSubmit={handleSubmit}>
      {schema.children.map(child => renderNode(child, state, errors))}
    </form>
  );
};
```

### 列表渲染

```typescript
interface ListSchema extends JsonNode {
  type: 'List';
  props: {
    data: string;  // 绑定到状态中的数组
    itemKey: string;  // 唯一标识
  };
  renderItem: JsonNode;  // 模板
}

const ListRenderer: React.FC<{
  schema: ListSchema;
  state: ReactiveState;
}> = ({ schema, state }) => {
  const data = state.get(schema.props.data);

  return (
    <>
      {data.map((item: any, index: number) => (
        <React.Fragment key={item[schema.props.itemKey] ?? index}>
          {renderNode(schema.renderItem, state, { item, index })}
        </React.Fragment>
      ))}
    </>
  );
};
```

## 性能优化

1. **虚拟滚动**: 长列表使用虚拟滚动
2. **懒加载**: 组件按需加载
3. **Memo**: 自动 memo 化静态组件
4. **批量更新**: 状态更新批量处理

```typescript
// 批量更新
function batchUpdate(updates: Array<{ path: string; value: any }>) {
  startBatch();
  updates.forEach(({ path, value }) => state.set(path, value));
  endBatch();
}
```

## 相关文档

- [整体架构](./architecture.md)
- [Catalog 系统](./catalog-system.md)
- [代码生成层](./code-generation.md)
