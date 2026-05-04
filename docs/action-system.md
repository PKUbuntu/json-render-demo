# Action 系统设计

Action 系统是 AI UI 体系的安全边界和交互核心，负责处理用户操作与业务逻辑的连接。

## 概述

在 AI 生成的 UI 中，Action 是连接用户交互和业务逻辑的桥梁：

```typescript
// 示例：按钮点击触发 Action
{
  "type": "Button",
  "props": {
    "type": "primary",
    "children": "提交",
    "onClick": "submitForm"  // 引用 Action
  }
}

// Action 定义
{
  "submitForm": {
    "type": "api.request",
    "url": "/api/submit",
    "method": "POST",
    "body": "{{state.formData}}"
  }
}
```

## 设计要点矩阵

| 设计点 | 优先级 | 描述 |
|--------|--------|------|
| **安全性** | P0 | 白名单、沙箱、注入防护 |
| **类型安全** | P0 | Schema 驱动、运行时校验 |
| **错误处理** | P1 | 结构化错误、友好提示 |
| **可组合性** | P1 | 链式调用、并行执行 |
| **性能** | P2 | 缓存、防抖节流 |
| **可观测性** | P2 | 日志、监控 |
| **测试** | P3 | Mock 工具、测试集成 |

## 核心架构

```
┌─────────────────────────────────────────────────────────┐
│  Action Catalog (白名单)                                  │
│  ├─ 预定义 Action                                         │
│  ├─ 参数 Schema (Zod)                                    │
│  └─ 权限配置                                              │
└─────────────────────────────────────────────────────────┘
                          ↓ 校验
┌─────────────────────────────────────────────────────────┐
│  Action Executor (执行引擎)                               │
│  ├─ 参数校验                                              │
│  ├─ 权限检查                                              │
│  ├─ 沙箱执行                                              │
│  └─ 错误处理                                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Action Runtime (运行时)                                  │
│  ├─ 链式执行                                              │
│  ├─ 并行执行                                              │
│  ├─ 缓存                                                  │
│  └─ 日志                                                  │
└─────────────────────────────────────────────────────────┘
```

## Action 定义格式

### 基础定义

```typescript
interface ActionDefinition {
  name: string;
  description: string;

  // 参数 Schema
  params: z.ZodTypeAny;

  // 返回值 Schema
  result?: z.ZodTypeAny;

  // 执行函数
  handler: (params: any, context: ActionContext) => Promise<any>;

  // 配置
  config?: {
    cacheable?: boolean;
    ttl?: number;
    retryable?: boolean;
    debounce?: number;
    throttle?: number;
  };

  // 权限
  permission?: {
    allowedRoles?: string[];
    requiresAuth?: boolean;
    rateLimit?: RateLimit;
  };
}
```

### Action Catalog

```typescript
// Action 白名单目录
const actionCatalog = {
  // 导航类
  navigate: {
    params: z.object({
      path: z.string(),
      query: z.record(z.string()).optional()
    }),
    handler: async ({ path, query }) => {
      // 路由导航逻辑
    }
  },

  // UI 交互类
  showMessage: {
    params: z.object({
      type: z.enum(['success', 'error', 'info', 'warning']),
      content: z.string()
    }),
    handler: async ({ type, content }) => {
      message[type](content);
    }
  },

  // 数据请求类
  fetchData: {
    params: z.object({
      url: z.string().url(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
      stateKey: z.string()  // 存储到状态中的键
    }),
    handler: async ({ url, method, stateKey }, context) => {
      const response = await fetch(url, { method });
      const data = await response.json();
      context.state.set(stateKey, data);
    }
  },

  // 状态更新类
  updateState: {
    params: z.object({
      key: z.string(),
      value: z.any()
    }),
    handler: async ({ key, value }, context) => {
      context.state.set(key, value);
    }
  }
};
```

## 安全设计

### 1. 白名单机制

```typescript
// AI 只能引用预定义的 Action
const allowedActions = new Set(Object.keys(actionCatalog));

function validateActionRef(actionName: string): boolean {
  if (!allowedActions.has(actionName)) {
    throw new Error(
      `Action "${actionName}" is not allowed. ` +
      `Must be one of: ${Array.from(allowedActions).join(', ')}`
    );
  }
  return true;
}
```

### 2. 参数注入防护

```typescript
// 防止 SQL/XSS 注入
function sanitizeParams(params: any): any {
  if (typeof params === 'string') {
    // 移除潜在的脚本标签
    return params.replace(/<script[^>]*>.*?<\/script>/gi, '');
  }

  if (Array.isArray(params)) {
    return params.map(sanitizeParams);
  }

  if (typeof params === 'object' && params !== null) {
    // 防止 prototype pollution
    const sanitized: any = {};
    for (const [key, value] of Object.entries(params)) {
      if (key === '__proto__' || key === 'constructor') {
        continue;
      }
      sanitized[key] = sanitizeParams(value);
    }
    return sanitized;
  }

  return params;
}
```

### 3. 沙箱执行

```typescript
interface SandboxLimits {
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxNetworkRequests: number;
}

async function executeInSandbox<T>(
  action: () => Promise<T>,
  limits: SandboxLimits
): Promise<T> {
  // 超时控制
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Action timeout')), limits.maxExecutionTime);
  });

  // 资源监控
  const startMemory = process.memoryUsage().heapUsed;

  try {
    return await Promise.race([action(), timeoutPromise]);
  } finally {
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = endMemory - startMemory;

    if (memoryUsed > limits.maxMemoryUsage) {
      console.warn(`Action exceeded memory limit: ${memoryUsed} bytes`);
    }
  }
}
```

## 错误处理

### 结构化错误

```typescript
interface ActionError {
  code: ErrorCode;
  message: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
}

enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

function handleError(error: unknown): ActionError {
  // Zod 校验错误
  if (error instanceof z.ZodError) {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: '参数校验失败',
      details: error.errors,
      retryable: false,
      userMessage: '请检查输入是否正确'
    };
  }

  // 网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: '网络请求失败',
      retryable: true,
      userMessage: '网络连接失败，请检查网络后重试'
    };
  }

  // 超时错误
  if (error instanceof Error && error.message === 'Action timeout') {
    return {
      code: ErrorCode.TIMEOUT,
      message: '操作超时',
      retryable: true,
      userMessage: '操作超时，请稍后重试'
    };
  }

  // 未知错误
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: error instanceof Error ? error.message : '未知错误',
    retryable: false,
    userMessage: '操作失败，请稍后重试'
  };
}
```

## 可组合性

### 链式执行

```typescript
interface ActionChain {
  name: string;
  steps: ActionStep[];
  onError?: 'stop' | 'continue' | 'retry';
}

interface ActionStep {
  action: string;
  params: any;
  condition?: string;  // 条件表达式
}

// 示例：用户注册流程
const registrationFlow: ActionChain = {
  name: 'userRegistration',
  steps: [
    {
      action: 'validateForm',
      params: { schema: 'registration' }
    },
    {
      action: 'checkUsername',
      params: { username: '{{state.username}}' },
      condition: '{{state.username}}'
    },
    {
      action: 'sendVerification',
      params: { email: '{{state.email}}' }
    },
    {
      action: 'createUser',
      params: {
        username: '{{state.username}}',
        email: '{{state.email}}'
      }
    },
    {
      action: 'navigate',
      params: { path: '/welcome' }
    }
  ],
  onError: 'stop'
};
```

### 并行执行

```typescript
interface ParallelActions {
  actions: Array<{ action: string; params: any }>;
  mode: 'all' | 'race' | 'any';
  fallback?: any;  // all 失败时的回退值
}

// 示例：并行加载数据
const loadDashboardData: ParallelActions = {
  actions: [
    { action: 'fetchUserStats', params: {} },
    { action: 'fetchRecentOrders', params: {} },
    { action: 'fetchNotifications', params: {} }
  ],
  mode: 'all'
};
```

## 性能优化

### 缓存策略

```typescript
interface CacheConfig {
  key: string;
  ttl: number;
  condition?: (params: any) => boolean;
}

const actionCache = new Map<string, { value: any; expires: number }>();

async function executeWithCache<T>(
  action: string,
  params: any,
  cache?: CacheConfig
): Promise<T> {
  if (!cache) {
    return executeAction(action, params);
  }

  const cacheKey = `${action}:${JSON.stringify(params)}`;
  const cached = actionCache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const result = await executeAction(action, params);

  actionCache.set(cacheKey, {
    value: result,
    expires: Date.now() + cache.ttl
  });

  return result;
}
```

### 防抖与节流

```typescript
interface ThrottleConfig {
  debounce?: number;
  throttle?: number;
  leading?: boolean;
  trailing?: boolean;
}

const throttleMap = new Map<string, any>();

function wrapWithThrottle<T extends (...args: any[]) => any>(
  actionName: string,
  handler: T,
  config: ThrottleConfig
): T {
  return (async (...args: any[]) => {
    const key = actionName;
    const now = Date.now();

    if (config.debounce) {
      clearTimeout(throttleMap.get(key));
      throttleMap.set(key, setTimeout(() => {
        handler(...args);
      }, config.debounce));
      return;
    }

    if (config.throttle) {
      const lastCall = throttleMap.get(`${key}:last`) || 0;
      if (now - lastCall < config.throttle) {
        return;
      }
      throttleMap.set(`${key}:last`, now);
    }

    return handler(...args);
  }) as T;
}
```

## 可观测性

### 执行日志

```typescript
interface ActionLog {
  action: string;
  params: any;
  result?: any;
  error?: ActionError;
  duration: number;
  timestamp: number;
  userId?: string;
  sessionId: string;
  traceId: string;
}

class ActionLogger {
  private logs: ActionLog[] = [];

  log(entry: ActionLog) {
    this.logs.push(entry);

    // 结构化输出
    console.log(JSON.stringify({
      level: entry.error ? 'error' : 'info',
      action: entry.action,
      duration: entry.duration,
      traceId: entry.traceId
    }));

    // 发送到日志服务
    this.sendToRemote(entry);
  }

  // 查询日志
  query(filter: (log: ActionLog) => boolean): ActionLog[] {
    return this.logs.filter(filter);
  }

  // 性能分析
  getSlowActions(threshold: number = 1000): Array<{
    action: string;
    avgDuration: number;
    count: number;
  }> {
    const stats = new Map<string, { total: number; count: number }>();

    for (const log of this.logs) {
      const stat = stats.get(log.action) || { total: 0, count: 0 };
      stat.total += log.duration;
      stat.count += 1;
      stats.set(log.action, stat);
    }

    return Array.from(stats.entries())
      .filter(([_, { total, count }]) => total / count > threshold)
      .map(([action, { total, count }]) => ({
        action,
        avgDuration: total / count,
        count
      }));
  }
}
```

## 相关文档

- [整体架构](./architecture.md)
- [运行时层](./runtime-layer.md)
- [安全性设计](./action-security.md) (待展开)
- [类型安全设计](./action-type-safety.md) (待展开)
