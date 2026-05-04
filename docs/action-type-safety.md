# Action 系统类型安全设计

类型安全是 Action 系统可靠性的基石，通过编译时和运行时双重保障确保数据的正确性。

## 类型安全层次

```
┌─────────────────────────────────────────────────────────┐
│  编译时类型安全 (TypeScript)                             │
│  ├─ 类型推导                                             │
│  ├─ 类型检查                                             │
│  └─ IDE 智能提示                                         │
└─────────────────────────────────────────────────────────┘
                          ↓ 一致性
┌─────────────────────────────────────────────────────────┐
│  运行时类型安全 (Zod)                                     │
│  ├─ Schema 校验                                          │
│  ├─ 错误提示                                             │
│  └─ 数据转换                                             │
└─────────────────────────────────────────────────────────┘
```

## 核心：TypeScript ↔ Zod 同步

### 问题

手动维护 TypeScript 类型和 Zod Schema 容易出现不一致：

```typescript
// ❌ 类型定义
interface UpdateUserParams {
  username: string;
  email: string;
  age: number;
}

// ❌ Zod Schema
const updateUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  // ❌ age 字段在 Schema 中漏掉了！
  // 类型定义和 Schema 不一致
});
```

### 解决方案：自动推导类型

```typescript
// ✅ 从 Zod Schema 推导 TypeScript 类型
const updateUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  age: z.number().min(18).max(120)
});

// 自动推导类型
type UpdateUserParams = z.infer<typeof updateUserSchema>;
// 等价于:
// type UpdateUserParams = {
//   username: string;
//   email: string;
//   age: number;
// }

// 现在类型和 Schema 永远一致
async function updateUser(params: UpdateUserParams) {
  // 运行时校验
  const validated = updateUserSchema.parse(params);

  // validated 的类型是 inferred 类型，编译器和运行时都保证正确
  return await api.updateUser(validated);
}
```

## 完整的类型安全 Action 定义

### 基础类型定义

```typescript
import { z } from 'zod';

// Action 基础类型
interface TypedAction<TParams, TResult, TContext = ActionContext> {
  // 元数据
  name: string;
  description: string;
  category: ActionCategory;

  // 类型定义
  params: z.ZodType<TParams>;
  result: z.ZodType<TResult>;

  // 执行函数
  handler: (params: TParams, context: TContext) => Promise<TResult>;

  // 配置
  config?: ActionConfig;
}

// 从 TypedAction 推导类型
type InferActionParams<T extends TypedAction<any, any>> =
  T extends TypedAction<infer P, any> ? P : never;

type InferActionResult<T extends TypedAction<any, any>> =
  T extends TypedAction<any, infer R> ? R : never;
```

### Action 定义示例

```typescript
// 示例 1: 用户注册 Action
const registerUserAction: TypedAction<
  {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  },
  {
    success: boolean;
    user?: { id: string; username: string; email: string };
    error?: string;
  }
> = {
  name: 'registerUser',
  description: 'Register a new user account',
  category: 'user',

  // 参数 Schema
  params: z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),

    email: z.string()
      .email('Invalid email address')
      .refine(
        async (email) => {
          // 自定义校验：检查邮箱是否已被注册
          const exists = await checkEmailExists(email);
          return !exists;
        },
        { message: 'Email already registered' }
      ),

    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),

    confirmPassword: z.string()
  }).refine(
    (data) => data.password === data.confirmPassword,
    { message: 'Passwords do not match', path: ['confirmPassword'] }
  ),

  // 返回值 Schema
  result: z.object({
    success: z.boolean(),
    user: z.object({
      id: z.string(),
      username: z.string(),
      email: z.string()
    }).optional(),
    error: z.string().optional()
  }).refine(
    (data) => data.success ? data.user != null : data.error != null,
    { message: 'Result must have user on success or error on failure' }
  ),

  // 处理函数（类型完全安全）
  handler: async (params, context) => {
    // params 的类型由 z.infer<typeof params> 推导
    // TypeScript 知道 params.username, params.email, params.password 的类型

    // 执行注册逻辑
    const hashedPassword = await hashPassword(params.password);

    const user = await db.users.create({
      data: {
        username: params.username,
        email: params.email,
        password: hashedPassword
      }
    });

    // 返回值的类型也受 result Schema 约束
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  }
};

// 使用示例（类型安全）
async function safeExecute() {
  const rawParams = {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123'
  };

  // 运行时校验 + 类型推导
  const params = registerUserAction.params.parse(rawParams);

  // 执行（类型安全）
  const result = await registerUserAction.handler(params, {});

  // result 的类型是 z.infer<typeof registerUserAction.result>
  // TypeScript 知道 result.success, result.user, result.error 的类型
  if (result.success) {
    console.log(`User registered: ${result.user!.username}`);
  } else {
    console.error(`Registration failed: ${result.error}`);
  }
}
```

## 高级类型技巧

### 1. 条件类型：根据参数推导返回值

```typescript
// 根据操作类型推导不同的返回值
const dataOperationAction = {
  params: z.object({
    operation: z.enum(['fetch', 'create', 'update', 'delete']),
    resource: z.string(),
    data: z.any().optional()
  }),

  result: z.discriminatedUnion('operation', [
    z.object({
      operation: z.literal('fetch'),
      data: z.any()
    }),
    z.object({
      operation: z.literal('create'),
      id: z.string(),
      data: z.any()
    }),
    z.object({
      operation: z.literal('update'),
      affected: z.number()
    }),
    z.object({
      operation: z.literal('delete'),
      deleted: z.boolean()
    })
  ]),

  handler: async (params) => {
    switch (params.operation) {
      case 'fetch':
        return { operation: 'fetch', data: await fetchData(params.resource) };
      case 'create':
        const id = await createData(params.resource, params.data);
        return { operation: 'create', id, data: params.data };
      case 'update':
        const affected = await updateData(params.resource, params.data);
        return { operation: 'update', affected };
      case 'delete':
        await deleteData(params.resource);
        return { operation: 'delete', deleted: true };
    }
  }
};

// TypeScript 能正确推导每种操作的返回值类型
```

### 2. 泛型 Action：可复用的类型模板

```typescript
// CRUD Action 模板
function createCRUDAction<T extends z.ZodType>(
  resourceName: string,
  schema: T
) {
  return {
    create: {
      params: z.object({ data: schema }),
      result: z.object({
        success: z.boolean(),
        data: schema.optional()
      })
    },

    update: {
      params: z.object({
        id: z.string(),
        data: schema.partial()
      }),
      result: z.object({
        success: z.boolean(),
        data: schema.optional()
      })
    },

    delete: {
      params: z.object({ id: z.string() }),
      result: z.object({
        success: z.boolean(),
        deleted: z.boolean()
      })
    }
  };
}

// 使用示例
const userSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  age: z.number().optional()
});

const userActions = createCRUDAction('user', userSchema);

// TypeScript 知道 userActions.create.params.data 的类型
// userActions.update.params.data 是部分类型（所有字段可选）
```

### 3. 递归类型：处理嵌套结构

```typescript
// 递归定义 JSON Schema 类型
const jsonSchema: z.ZodType<
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonSchema }
  | JsonSchema[]
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.record(jsonSchema),
    z.array(jsonSchema)
  ])
);

// 使用递归类型的 Action
const validateJSONAction = {
  params: z.object({
    json: jsonSchema,
    schema: z.string()
  }),
  result: z.object({
    valid: z.boolean(),
    errors: z.array(z.object({
      path: z.string(),
      message: z.string()
    })).optional()
  })
};
```

## 类型安全的 Action 执行器

```typescript
class TypedActionExecutor {
  private actions = new Map<string, TypedAction<any, any>>();

  // 注册 Action
  register<TParams, TResult>(action: TypedAction<TParams, TResult>) {
    this.actions.set(action.name, action);
  }

  // 执行 Action（类型安全）
  async execute<TName extends string, TParams, TResult>(
    name: TName,
    params: TParams
  ): Promise<TResult> {
    const action = this.actions.get(name);

    if (!action) {
      throw new Error(`Action "${name}" not found`);
    }

    // 运行时校验
    const validatedParams = action.params.parse(params);

    // 执行（类型安全）
    const result = await action.handler(validatedParams, {});

    // 返回值校验
    return action.result.parse(result);
  }

  // 批量执行
  async executeBatch<
    T extends Array<{ name: string; params: any }>
  >(operations: T): Promise<any[]> {
    return Promise.all(
      operations.map(op => this.execute(op.name, op.params))
    );
  }

  // 条件执行
  async executeIf<TCondition, TParams, TResult>(
    condition: TypedAction<TCondition, boolean>,
    conditionParams: TCondition,
    thenAction: string,
    thenParams: TParams,
    elseAction?: string,
    elseParams?: TParams
  ): Promise<TResult | null> {
    const result = await this.execute(
      condition.name,
      conditionParams
    );

    if (result) {
      return this.execute(thenAction, thenParams);
    } else if (elseAction && elseParams) {
      return this.execute(elseAction, elseParams);
    }

    return null;
  }
}

// 使用示例
const executor = new TypedActionExecutor();

executor.register(registerUserAction);

// 类型安全的执行
const result = await executor.execute('registerUser', {
  username: 'john_doe',
  email: 'john@example.com',
  password: 'SecurePass123',
  confirmPassword: 'SecurePass123'
});

// result 的类型是 RegisterUserResult
```

## 类型安全的 Action 链

```typescript
interface ActionChainStep<TAction extends string> {
  action: TAction;
  params: TAction extends keyof ActionRegistry
    ? Parameters<ActionRegistry[TAction]['handler']>[0]
    : never;
}

// 类型安全的 Action 链定义
const userRegistrationChain = [
  {
    action: 'validateUsername',
    params: { username: 'john_doe' }
  },
  {
    action: 'validateEmail',
    params: { email: 'john@example.com' }
  },
  {
    action: 'registerUser',
    params: {
      username: 'john_doe',
      email: 'john@example.com',
      password: 'SecurePass123'
    }
  },
  {
    action: 'sendWelcomeEmail',
    params: { email: 'john@example.com' }
  }
] as const;

// TypeScript 能推导每一步的参数类型
// 如果任何一步的参数类型不匹配，编译时会报错
```

## 类型安全最佳实践

### 1. 始终使用 Zod 推导类型

```typescript
// ✅ 正确
const schema = z.object({
  username: z.string(),
  email: z.string().email()
});
type Params = z.infer<typeof schema>;

// ❌ 错误：手动维护类型，容易不一致
interface Params {
  username: string;
  email: string;
}
const schema = z.object({
  username: z.string(),
  email: z.string().email()
});
```

### 2. 使用严格的类型选项

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 3. 使用品牌类型防止混淆

```typescript
// 防止不同用途的相同类型互相混淆
type UserId = string & { readonly __brand: unique symbol };
type Email = string & { readonly __brand: unique symbol };

// 创建函数
function createUserId(id: string): UserId {
  return id as UserId;
}

function createEmail(email: string): Email {
  if (!email.includes('@')) {
    throw new Error('Invalid email');
  }
  return email as Email;
}

// 现在 UserId 和 Email 不能互相赋值
const userId: UserId = createUserId('123');
const email: Email = createEmail('user@example.com');

// ❌ 类型错误：不能将 Email 赋值给 UserId
// const wrong: UserId = email;
```

### 4. 使用 discriminated union

```typescript
// 使用判别联合提高类型安全性
type ActionResult =
  | { success: true; data: any }
  | { success: false; error: string };

function handleResult(result: ActionResult) {
  if (result.success) {
    // TypeScript 知道这里 result.success 是 true
    // result.data 可用
    console.log(result.data);
  } else {
    // TypeScript 知道这里 result.success 是 false
    // result.error 可用
    console.error(result.error);
  }
}
```

## 相关文档

- [Action 系统设计](./action-system.md)
- [安全性设计](./action-security.md)
- [Catalog 系统](./catalog-system.md)
