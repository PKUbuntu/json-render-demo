# Action 系统安全性设计

Action 系统是 AI UI 体系的安全边界，任何安全漏洞都可能导致严重后果。本文档详细说明安全设计的各个方面。

## 安全威胁模型

### 潜在攻击向量

| 攻击类型 | 描述 | 风险等级 |
|----------|------|----------|
| **注入攻击** | SQL/XSS/命令注入 | 🔴 高 |
| **原型污染** | 通过 `__proto__` 修改对象原型 | 🔴 高 |
| **权限绕过** | 执行未授权的操作 | 🔴 高 |
| **资源耗尽** | DoS 攻击、内存泄漏 | 🟡 中 |
| **数据泄露** | 敏感信息暴露 | 🔴 高 |
| **代码执行** | 任意代码执行 | 🔴 高 |

### 攻击场景示例

```json
// ❌ 场景 1: SQL 注入
{
  "type": "Input",
  "props": {
    "onChange": "updateQuery",
    "value": "{{state.search}}"
  },
  "actions": {
    "updateQuery": {
      "type": "database.query",
      "statement": "SELECT * FROM users WHERE name = '{{state.search}}'"
      // 输入: "'; DROP TABLE users; --"
    }
  }
}

// ❌ 场景 2: XSS 攻击
{
  "type": "div",
  "props": {
    "dangerouslySetInnerHTML": {
      "__html": "{{state.userInput}}"
    }
    // 输入: "<script>alert('XSS')</script>"
  }
}

// ❌ 场景 3: 原型污染
{
  "type": "Button",
  "props": {
    "onClick": "polluted"
  },
  "actions": {
    "polluted": {
      "type": "eval",
      "code": "JSON.parse('{\"__proto__\": {\"isAdmin\": true}}')"
    }
  }
}

// ❌ 场景 4: 无限循环 DoS
{
  "actions": {
    "infiniteLoop": {
      "type": "while",
      "condition": "true",
      "body": "console.log('DoS')"
    }
  }
}
```

## 深度防御策略

### 1. 白名单机制（第一道防线）

```typescript
// 严格的 Action 白名单
interface ActionWhitelist {
  [actionName: string]: {
    schema: z.ZodTypeAny;
    handler: ActionHandler;
    riskLevel: 'low' | 'medium' | 'high';
    rateLimit?: RateLimit;
  };
}

const actionWhitelist: ActionWhitelist = {
  // 安全的导航 Action
  navigate: {
    schema: z.object({
      path: z.string().regex(/^\//.source, 'Path must start with /'),
      query: z.record(z.string()).optional()
    }),
    handler: navigateHandler,
    riskLevel: 'low'
  },

  // 需要认证的 API 请求
  apiRequest: {
    schema: z.object({
      url: z.string().url(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
      body: z.any().optional()
    }),
    handler: apiRequestHandler,
    riskLevel: 'medium',
    rateLimit: {
      maxRequests: 100,
      window: 60000,  // 每分钟 100 次
      burst: 10       // 瞬时最多 10 次
    }
  },

  // ❌ 永远不暴露危险 Action
  // eval: ...
  // exec: ...
  // fs: ...
};

// 白名单验证
function validateActionRef(actionName: string): void {
  if (!(actionName in actionWhitelist)) {
    throw new SecurityError(
      `SECURITY: Action "${actionName}" is not whitelisted`,
      { actionName, code: 'UNAUTHORIZED_ACTION' }
    );
  }
}
```

### 2. 参数校验与清理（第二道防线）

```typescript
// 深度参数清理
class ParameterSanitizer {
  // 清理单个值
  private sanitizeValue(value: any, depth = 0): any {
    // 防止深度嵌套导致栈溢出
    if (depth > 100) {
      throw new SecurityError('Parameter nesting too deep');
    }

    // 字符串清理
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    // 数组清理
    if (Array.isArray(value)) {
      return value.map((v, i) => {
        if (i > 1000) {
          throw new SecurityError('Array too large');
        }
        return this.sanitizeValue(v, depth + 1);
      });
    }

    // 对象清理
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};

      for (const [key, val] of Object.entries(value)) {
        // 阻止原型污染
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new SecurityError(
            `SECURITY: Prototype pollution attempt detected: "${key}"`,
            { key, code: 'PROTOTYPE_POLLUTION' }
          );
        }

        // 限制对象属性数量
        if (Object.keys(sanitized).length > 100) {
          throw new SecurityError('Object has too many properties');
        }

        sanitized[key] = this.sanitizeValue(val, depth + 1);
      }

      return sanitized;
    }

    return value;
  }

  // 字符串清理
  private sanitizeString(str: string): string {
    // 移除控制字符（除了换行、制表符）
    let sanitized = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // HTML 转义（防止 XSS）
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    // 检测可疑模式
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,  // 事件处理器
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(str)) {
        throw new SecurityError(
          `SECURITY: Suspicious pattern detected in parameter`,
          { pattern: pattern.source, code: 'SUSPICIOUS_INPUT' }
        );
      }
    }

    return sanitized;
  }

  // 公开接口
  sanitize(params: any): any {
    return this.sanitizeValue(params);
  }
}

// 使用示例
const sanitizer = new ParameterSanitizer();

function executeActionSafe(actionName: string, rawParams: any) {
  // 1. 清理参数
  const sanitized = sanitizer.sanitize(rawParams);

  // 2. Schema 校验
  const schema = actionWhitelist[actionName].schema;
  const validated = schema.parse(sanitized);

  // 3. 执行
  return actionWhitelist[actionName].handler(validated);
}
```

### 3. 沙箱执行（第三道防线）

```typescript
// 完全隔离的沙箱环境
interface SandboxConfig {
  timeout: number;
  memoryLimit: number;
  networkAllowed: boolean;
  maxNetworkRequests: number;
  allowedDomains: string[];
}

class ActionSandbox {
  private networkRequestCount = 0;
  private startMemory = 0;

  constructor(private config: SandboxConfig) {}

  async execute<T>(action: () => Promise<T>): Promise<T> {
    // 重置状态
    this.networkRequestCount = 0;
    this.startMemory = process.memoryUsage().heapUsed;

    // 拦截 fetch
    const originalFetch = globalThis.fetch;
    this.interceptNetwork(originalFetch);

    try {
      // 带超时和内存限制执行
      return await this.executeWithLimits(action);
    } finally {
      // 恢复原始 fetch
      globalThis.fetch = originalFetch;
    }
  }

  // 网络请求拦截
  private interceptNetwork(originalFetch: typeof fetch) {
    globalThis.fetch = async (...args) => {
      // 检查是否允许网络请求
      if (!this.config.networkAllowed) {
        throw new SecurityError('Network requests are not allowed');
      }

      // 检查请求次数限制
      this.networkRequestCount++;
      if (this.networkRequestCount > this.config.maxNetworkRequests) {
        throw new SecurityError('Exceeded maximum network requests');
      }

      // 检查域名白名单
      const url = new URL(args[0] as string);
      if (!this.config.allowedDomains.includes(url.hostname)) {
        throw new SecurityError(
          `Domain "${url.hostname}" is not in the whitelist`
        );
      }

      // 执行请求
      return originalFetch(...args);
    };
  }

  // 带限制的执行
  private async executeWithLimits<T>(action: () => Promise<T>): Promise<T> {
    // 超时控制
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new SecurityError('Action execution timeout'));
      }, this.config.timeout);
    });

    // 内存监控
    const memoryCheckPromise = new Promise<never>((_, reject) => {
      const interval = setInterval(() => {
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryUsed = currentMemory - this.startMemory;

        if (memoryUsed > this.config.memoryLimit) {
          clearInterval(interval);
          reject(new SecurityError('Memory limit exceeded'));
        }
      }, 100);
    });

    // 执行 Action
    const actionPromise = action();

    try {
      return await Promise.race([
        actionPromise,
        timeoutPromise,
        memoryCheckPromise
      ]);
    } finally {
      // 清理
      clearInterval(memoryCheckPromise as any);
    }
  }
}

// 使用示例
const sandbox = new ActionSandbox({
  timeout: 5000,           // 5 秒超时
  memoryLimit: 50 * 1024 * 1024,  // 50MB
  networkAllowed: true,
  maxNetworkRequests: 5,
  allowedDomains: ['api.example.com']
});

await sandbox.execute(async () => {
  return await someAction();
});
```

### 4. 权限控制（第四道防线）

```typescript
// 基于角色的访问控制
interface Permission {
  allowedRoles: string[];
  requiresAuth: boolean;
  requiresMFA?: boolean;
  resourceCheck?: (resource: string, user: User) => Promise<boolean>;
}

interface SecurityContext {
  user: User | null;
  session: Session;
  permissions: Map<string, Permission>;
}

class PermissionChecker {
  // 检查 Action 权限
  async checkActionPermission(
    actionName: string,
    context: SecurityContext
  ): Promise<void> {
    const permission = context.permissions.get(actionName);

    if (!permission) {
      throw new SecurityError(`Action "${actionName}" has no permission config`);
    }

    // 检查认证
    if (permission.requiresAuth && !context.user) {
      throw new SecurityError('Authentication required', {
        code: 'AUTH_REQUIRED'
      });
    }

    // 检查 MFA
    if (permission.requiresMFA && !context.user?.mfaVerified) {
      throw new SecurityError('MFA verification required', {
        code: 'MFA_REQUIRED'
      });
    }

    // 检查角色
    if (permission.allowedRoles.length > 0) {
      if (!context.user || !permission.allowedRoles.includes(context.user.role)) {
        throw new SecurityError(
          `Insufficient permissions. Required roles: ${permission.allowedRoles.join(', ')}`,
          { code: 'INSUFFICIENT_PERMISSIONS' }
        );
      }
    }

    // 资源级权限检查
    if (permission.resourceCheck) {
      const hasAccess = await permission.resourceCheck(
        actionName,
        context.user!
      );
      if (!hasAccess) {
        throw new SecurityError('Resource access denied', {
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }
    }
  }

  // 检查数据访问权限
  checkDataAccess(dataPath: string, user: User): boolean {
    // 实现字段级权限控制
    const fieldPermissions = {
      'users.email': ['admin', 'support'],
      'users.phone': ['admin'],
      'users.ssn': ['admin']
    };

    const allowedRoles = fieldPermissions[dataPath];
    return allowedRoles?.includes(user.role) ?? false;
  }
}

// 使用示例
const securityContext: SecurityContext = {
  user: { id: '123', role: 'user', mfaVerified: false },
  session: { id: 'session-123' },
  permissions: new Map([
    ['viewProfile', {
      allowedRoles: ['user', 'admin'],
      requiresAuth: true
    }],
    ['deleteUser', {
      allowedRoles: ['admin'],
      requiresAuth: true,
      requiresMFA: true,
      resourceCheck: async (resource, user) => {
        // 检查是否有权限删除特定用户
        return user.role === 'admin';
      }
    }]
  ])
};

const permissionChecker = new PermissionChecker();
await permissionChecker.checkActionPermission('deleteUser', securityContext);
```

### 5. 速率限制（第五道防线）

```typescript
// 多级速率限制
interface RateLimitConfig {
  // 单用户限制
  perUser: {
    maxRequests: number;
    window: number;
  };

  // 全局限制
  global: {
    maxRequests: number;
    window: number;
  };

  // IP 限制
  perIP: {
    maxRequests: number;
    window: number;
  };

  // 突发限制
  burst: {
    maxRequests: number;
    window: number;
  };
}

class RateLimiter {
  private userLimits = new Map<string, number[]>();
  private globalLimits: number[] = [];
  private ipLimits = new Map<string, number[]>();
  private burstLimits = new Map<string, number[]>();

  constructor(private config: RateLimitConfig) {}

  // 检查是否允许请求
  async checkLimit(
    userId: string,
    ip: string,
    action: string
  ): Promise<void> {
    const now = Date.now();

    // 检查用户限制
    this.check(this.userLimits, userId, this.config.perUser, 'User');

    // 检查 IP 限制
    this.check(this.ipLimits, ip, this.config.perIP, 'IP');

    // 检查突发限制
    this.check(
      this.burstLimits,
      `${userId}:${action}`,
      this.config.burst,
      'Burst'
    );

    // 检查全局限制
    this.check(
      new Map(Object.entries({ global: this.globalLimits })),
      'global',
      this.config.global,
      'Global'
    );
  }

  // 通用检查逻辑
  private check(
    storage: Map<string, number[]>,
    key: string,
    config: { maxRequests: number; window: number },
    limitType: string
  ): void {
    const timestamps = storage.get(key) || [];
    const now = Date.now();

    // 清理过期记录
    const validTimestamps = timestamps.filter(
      ts => now - ts < config.window
    );

    // 检查是否超限
    if (validTimestamps.length >= config.maxRequests) {
      const oldestTimestamp = validTimestamps[0];
      const retryAfter = Math.ceil(
        (oldestTimestamp + config.window - now) / 1000
      );

      throw new SecurityError(
        `Rate limit exceeded: ${limitType}`,
        {
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
          limitType,
          limit: config.maxRequests,
          window: config.window
        }
      );
    }

    // 记录本次请求
    validTimestamps.push(now);
    storage.set(key, validTimestamps);
  }

  // 记录成功请求
  recordRequest(userId: string, ip: string, action: string): void {
    const now = Date.now();

    // 记录到各级限制器
    this.record(this.userLimits, userId, now);
    this.record(this.ipLimits, ip, now);
    this.record(this.burstLimits, `${userId}:${action}`, now);
    this.record(new Map(Object.entries({ global: this.globalLimits })), 'global', now);
  }

  private record(storage: Map<string, number[]>, key: string, timestamp: number): void {
    const timestamps = storage.get(key) || [];
    timestamps.push(timestamp);
    storage.set(key, timestamps);
  }
}

// 使用示例
const rateLimiter = new RateLimiter({
  perUser: { maxRequests: 100, window: 60000 },   // 每分钟 100 次
  global: { maxRequests: 10000, window: 60000 },  // 每分钟 10000 次
  perIP: { maxRequests: 50, window: 60000 },      // 每分钟 50 次
  burst: { maxRequests: 10, window: 1000 }        // 每秒 10 次
});

try {
  await rateLimiter.checkLimit('user-123', '192.168.1.1', 'submitForm');
  // 执行 Action
  await executeAction('submitForm', params);
  rateLimiter.recordRequest('user-123', '192.168.1.1', 'submitForm');
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // 返回 429 状态码和重试时间
    return {
      error: 'Too many requests',
      retryAfter: error.retryAfter
    };
  }
}
```

## 审计与监控

### 安全事件日志

```typescript
interface SecurityEvent {
  type: 'security_violation' | 'permission_denied' | 'rate_limit_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;
  message: string;
  details: any;
  timestamp: number;
  userId?: string;
  ip?: string;
  action?: string;
  userAgent?: string;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];

  log(event: SecurityEvent) {
    this.events.push(event);

    // 高危事件立即告警
    if (event.severity === 'critical') {
      this.alert(event);
    }

    // 发送到 SIEM
    this.sendToSIEM(event);

    // 结构化日志
    console.log(JSON.stringify({
      level: 'security',
      ...event
    }));
  }

  private alert(event: SecurityEvent) {
    // 发送告警（邮件、短信、PagerDuty 等）
    console.error('🚨 CRITICAL SECURITY EVENT:', event);
  }

  private sendToSIEM(event: SecurityEvent) {
    // 发送到安全信息事件管理系统
    // 例如: Splunk, ELK, Datadog 等
  }

  // 查询安全事件
  query(filter: (event: SecurityEvent) => boolean): SecurityEvent[] {
    return this.events.filter(filter);
  }

  // 生成安全报告
  generateReport(timeRange: { start: number; end: number }) {
    const events = this.events.filter(
      e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    );

    return {
      total: events.length,
      bySeverity: this.groupBy(events, 'severity'),
      byCode: this.groupBy(events, 'code'),
      topUsers: this.getTopUsers(events),
      topIPs: this.getTopIPs(events)
    };
  }

  private groupBy(events: SecurityEvent[], key: keyof SecurityEvent) {
    const grouped = new Map();
    for (const event of events) {
      const value = event[key];
      grouped.set(value, (grouped.get(value) || 0) + 1);
    }
    return Object.fromEntries(grouped);
  }
}
```

## 最佳实践清单

### 必须实现（P0）

- [x] Action 白名单机制
- [x] 参数 Schema 校验
- [x] 原型污染防护
- [x] SQL/XSS 注入防护
- [x] 执行超时控制
- [x] 安全事件日志

### 应该实现（P1）

- [ ] 沙箱执行环境
- [ ] 权限控制系统
- [ ] 速率限制
- [ ] 输入清理与转义
- [ ] 敏感数据加密

### 可以实现（P2）

- [ ] AI 行为分析
- [ ] 异常检测
- [ ] 自动封禁
- [ ] 安全评分系统

## 相关文档

- [Action 系统设计](./action-system.md)
- [类型安全设计](./action-type-safety.md)
- [整体架构](./architecture.md)
