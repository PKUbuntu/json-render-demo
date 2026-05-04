/**
 * Action 执行器
 * 安全的 Action 执行引擎，支持白名单、校验、沙箱等
 */

import { z } from 'zod';
import {
  TypedAction,
  ActionResult,
  ActionError,
  ActionContext,
  ActionConfig
} from '../types/core';

// ==================== 错误定义 ====================

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ACTION_NOT_FOUND = 'ACTION_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 创建 Action 错误
 */
function createActionError(
  code: ErrorCode,
  message: string,
  retryable: boolean = false,
  userMessage?: string,
  details?: any
): ActionError {
  return {
    code,
    message,
    details,
    retryable,
    userMessage: userMessage || message
  };
}

// ==================== 参数清理 ====================

/**
 * 参数清理器 - 防止注入攻击
 */
class ParameterSanitizer {
  /**
   * 清理参数值
   */
  sanitizeValue(value: any, depth = 0): any {
    // 防止深度嵌套
    if (depth > 100) {
      throw new Error('Parameter nesting too deep');
    }

    // 字符串清理
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    // 数组清理
    if (Array.isArray(value)) {
      if (value.length > 1000) {
        throw new Error('Array too large');
      }
      return value.map((v, i) => this.sanitizeValue(v, depth + 1));
    }

    // 对象清理
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      let count = 0;

      for (const [key, val] of Object.entries(value)) {
        // 阻止原型污染
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new Error(`Prototype pollution attempt detected: "${key}"`);
        }

        // 限制属性数量
        if (count++ > 100) {
          throw new Error('Object has too many properties');
        }

        sanitized[key] = this.sanitizeValue(val, depth + 1);
      }

      return sanitized;
    }

    return value;
  }

  /**
   * 清理字符串
   */
  private sanitizeString(str: string): string {
    // 移除控制字符
    let sanitized = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 检测可疑模式
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(str)) {
        throw new Error(`Suspicious pattern detected in parameter`);
      }
    }

    return sanitized;
  }

  /**
   * 清理参数（公开接口）
   */
  sanitize(params: any): any {
    return this.sanitizeValue(params);
  }
}

// ==================== Action 执行器 ====================

/**
 * Action 执行器配置
 */
export interface ActionExecutorConfig {
  timeout?: number;
  enableSanitization?: boolean;
  enableLogging?: boolean;
}

/**
 * Action 执行器
 */
export class ActionExecutor {
  private actions = new Map<string, TypedAction<any, any>>();
  private sanitizer = new ParameterSanitizer();
  private logs: Array<{
    action: string;
    params: any;
    result: ActionResult;
    duration: number;
    timestamp: number;
  }> = [];

  constructor(private config: ActionExecutorConfig = {}) {}

  /**
   * 注册 Action
   */
  register<TParams, TResult>(action: TypedAction<TParams, TResult>): void {
    this.actions.set(action.name, action);
  }

  /**
   * 批量注册 Action
   */
  registerAll(actions: TypedAction<any, any>[]): void {
    actions.forEach(action => this.register(action));
  }

  /**
   * 检查 Action 是否存在
   */
  has(actionName: string): boolean {
    return this.actions.has(actionName);
  }

  /**
   * 获取 Action
   */
  get(actionName: string): TypedAction<any, any> | undefined {
    return this.actions.get(actionName);
  }

  /**
   * 执行 Action
   */
  async execute<TParams = any, TResult = any>(
    actionName: string,
    params: TParams,
    context?: Partial<ActionContext>
  ): Promise<ActionResult<TResult>> {
    const startTime = Date.now();

    try {
      // 1. 检查 Action 是否存在
      const action = this.actions.get(actionName);
      if (!action) {
        throw createActionError(
          ErrorCode.ACTION_NOT_FOUND,
          `Action "${actionName}" not found`,
          false
        );
      }

      // 2. 参数清理
      let sanitizedParams = params;
      if (this.config.enableSanitization !== false) {
        try {
          sanitizedParams = this.sanitizer.sanitize(params);
        } catch (error) {
          throw createActionError(
            ErrorCode.VALIDATION_ERROR,
            `Parameter sanitization failed: ${error}`,
            false,
            'Invalid input parameters'
          );
        }
      }

      // 3. 参数校验
      let validatedParams: TParams;
      try {
        validatedParams = action.params.parse(sanitizedParams);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw createActionError(
            ErrorCode.VALIDATION_ERROR,
            'Parameter validation failed',
            false,
            'Please check your input',
            error.errors
          );
        }
        throw error;
      }

      // 4. 构建上下文
      const fullContext: ActionContext = {
        state: context?.state || {},
        event: context?.event,
        value: context?.value,
        params: context?.params
      };

      // 5. 执行 Action（带超时）
      const result = await this.executeWithTimeout(
        () => action.handler(validatedParams, fullContext),
        action.config?.timeout || this.config.timeout || 5000
      );

      // 6. 返回值校验
      let validatedResult: TResult;
      try {
        validatedResult = action.result.parse(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.warn('Action result validation failed:', error.errors);
        }
        validatedResult = result as TResult;
      }

      // 记录成功日志
      const duration = Date.now() - startTime;
      this.log(actionName, params, { success: true, data: validatedResult }, duration);

      return {
        success: true,
        data: validatedResult
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // 处理错误
      let actionError: ActionError;

      if (error instanceof Error) {
        if (error.message === 'Action timeout') {
          actionError = createActionError(
            ErrorCode.TIMEOUT,
            'Action execution timeout',
            true,
            'Operation timed out, please try again'
          );
        } else {
          actionError = createActionError(
            ErrorCode.UNKNOWN_ERROR,
            error.message,
            false,
            'Operation failed, please try again later'
          );
        }
      } else {
        actionError = createActionError(
          ErrorCode.UNKNOWN_ERROR,
          'Unknown error occurred',
          false,
          'An unexpected error occurred'
        );
      }

      // 记录失败日志
      this.log(actionName, params, { success: false, error: actionError }, duration);

      return {
        success: false,
        error: actionError
      };
    }
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Action timeout')), timeout);
      })
    ]);
  }

  /**
   * 记录日志
   */
  private log(
    action: string,
    params: any,
    result: ActionResult,
    duration: number
  ): void {
    if (this.config.enableLogging) {
      const logEntry = {
        action,
        params,
        result,
        duration,
        timestamp: Date.now()
      };

      this.logs.push(logEntry);

      console.log(JSON.stringify({
        level: result.success ? 'info' : 'error',
        action,
        duration,
        success: result.success
      }));
    }
  }

  /**
   * 获取日志
   */
  getLogs(): Array<{
    action: string;
    params: any;
    result: ActionResult;
    duration: number;
    timestamp: number;
  }> {
    return [...this.logs];
  }

  /**
   * 清除日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 获取慢速 Action
   */
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

// ==================== 内置 Actions ====================

/**
 * 创建内置 Action 集合
 */
export function createBuiltinActions(): TypedAction<any, any>[] {
  return [
    // 导航 Action
    {
      name: 'navigate',
      description: 'Navigate to a different page',
      category: 'navigation',
      params: z.object({
        path: z.string(),
        query: z.record(z.string()).optional()
      }),
      result: z.object({
        success: z.boolean()
      }),
      handler: async (params) => {
        // TODO: 实现路由导航
        console.log('Navigate to:', params.path, params.query);
        return { success: true };
      }
    },

    // 消息提示 Action
    {
      name: 'showMessage',
      description: 'Display a message notification',
      category: 'ui',
      params: z.object({
        type: z.enum(['success', 'error', 'info', 'warning']),
        content: z.string(),
        duration: z.number().optional()
      }),
      result: z.object({
        success: z.boolean()
      }),
      handler: async (params) => {
        // TODO: 集成 antd message
        console.log(`Show ${params.type} message:`, params.content);
        return { success: true };
      }
    },

    // 状态更新 Action
    {
      name: 'updateState',
      description: 'Update state value',
      category: 'state',
      params: z.object({
        key: z.string(),
        value: z.any()
      }),
      result: z.object({
        success: z.boolean(),
        previousValue: z.any().optional()
      }),
      handler: async (params, context) => {
        const previousValue = context.state?.[params.key];
        context.state[params.key] = params.value;
        return {
          success: true,
          previousValue
        };
      }
    },

    // HTTP 请求 Action
    {
      name: 'fetch',
      description: 'Make an HTTP request',
      category: 'api',
      params: z.object({
        url: z.string().url(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
        body: z.any().optional(),
        headers: z.record(z.string()).optional()
      }),
      result: z.object({
        success: z.boolean(),
        data: z.any().optional(),
        status: z.number().optional()
      }),
      handler: async (params) => {
        try {
          const response = await fetch(params.url, {
            method: params.method,
            headers: {
              'Content-Type': 'application/json',
              ...params.headers
            },
            body: params.body ? JSON.stringify(params.body) : undefined
          });

          const data = await response.json();

          return {
            success: response.ok,
            data,
            status: response.status
          };
        } catch (error) {
          return {
            success: false,
            status: 0
          };
        }
      },
      config: {
        timeout: 10000
      }
    },

    // 打开 Modal Action
    {
      name: 'openModal',
      description: 'Open a modal dialog',
      category: 'ui',
      params: z.object({
        modalId: z.string(),
        data: z.any().optional()
      }),
      result: z.object({
        success: z.boolean()
      }),
      handler: async (params, context) => {
        context.state.modals = context.state.modals || {};
        context.state.modals[params.modalId] = {
          open: true,
          data: params.data
        };
        return { success: true };
      }
    },

    // 关闭 Modal Action
    {
      name: 'closeModal',
      description: 'Close a modal dialog',
      category: 'ui',
      params: z.object({
        modalId: z.string()
      }),
      result: z.object({
        success: z.boolean()
      }),
      handler: async (params, context) => {
        if (context.state.modals?.[params.modalId]) {
          context.state.modals[params.modalId].open = false;
        }
        return { success: true };
      }
    }
  ];
}
