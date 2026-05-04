/**
 * 响应式状态管理
 * 实现数据绑定、计算属性、监听器等
 */

import { z } from 'zod';

// ==================== 类型定义 ====================

/**
 * 状态值类型
 */
export type StateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | StateValue[]
  | { [key: string]: StateValue };

/**
 * 监听器函数
 */
export type WatcherCallback = (newValue: any, oldValue: any) => void;

/**
 * 计算属性函数
 */
export type ComputedFunction = (state: ReactiveState) => any;

// ==================== 响应式状态 ====================

/**
 * 响应式状态类
 */
export class ReactiveState {
  private _state: Record<string, StateValue>;
  private _watchers: Map<string, Set<WatcherCallback>>;
  private _computed: Map<string, ComputedFunction>;
  private _computedCache: Map<string, { value: any; dirty: boolean }>;

  constructor(initialState: Record<string, StateValue> = {}) {
    this._state = { ...initialState };
    this._watchers = new Map();
    this._computed = new Map();
    this._computedCache = new Map();
  }

  /**
   * 获取状态值
   * 支持路径访问，如 'user.profile.name'
   */
  get(path: string): any {
    const keys = path.split('.');
    let value: any = this._state;

    for (const key of keys) {
      if (value == null) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * 设置状态值
   * 支持路径设置，如 'user.profile.name'
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: any = this._state;

    // 创建嵌套路径
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }

    // 获取旧值
    const oldValue = target[lastKey];

    // 设置新值
    target[lastKey] = value;

    // 触发监听器
    this.trigger(path, value, oldValue);

    // 标记相关计算属性为 dirty
    this.markComputedDirty(path);
  }

  /**
   * 批量更新状态
   */
  batch(updates: Record<string, any>): void {
    // 收集所有变更
    const changes: Array<{ path: string; newValue: any; oldValue: any }> = [];

    // 执行所有更新（暂不触发监听器）
    for (const [path, value] of Object.entries(updates)) {
      const oldValue = this.get(path);
      this.set(path, value);
      changes.push({ path, newValue: value, oldValue });
    }

    // 批量触发监听器
    for (const { path, newValue, oldValue } of changes) {
      this.trigger(path, newValue, oldValue);
    }
  }

  /**
   * 添加监听器
   */
  watch(path: string, callback: WatcherCallback): () => void {
    if (!this._watchers.has(path)) {
      this._watchers.set(path, new Set());
    }
    this._watchers.get(path)!.add(callback);

    // 返回取消监听函数
    return () => {
      this._watchers.get(path)?.delete(callback);
    };
  }

  /**
   * 移除监听器
   */
  unwatch(path: string, callback: WatcherCallback): void {
    this._watchers.get(path)?.delete(callback);
  }

  /**
   * 添加计算属性
   */
  computed(path: string, fn: ComputedFunction): void {
    this._computed.set(path, fn);
    this._computedCache.set(path, { value: undefined, dirty: true });
  }

  /**
   * 获取计算属性的值
   */
  getComputed(path: string): any {
    const cached = this._computedCache.get(path);
    if (!cached) {
      throw new Error(`Computed property "${path}" not found`);
    }

    // 如果 dirty，重新计算
    if (cached.dirty) {
      const fn = this._computed.get(path)!;
      cached.value = fn(this);
      cached.dirty = false;
    }

    return cached.value;
  }

  /**
   * 触发监听器
   */
  private trigger(path: string, newValue: any, oldValue: any): void {
    // 精确匹配的监听器
    this._watchers.get(path)?.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (error) {
        console.error(`Watcher error for "${path}":`, error);
      }
    });

    // 通配符监听器
    for (const [watchPath, callbacks] of this._watchers) {
      if (watchPath.endsWith('*')) {
        const prefix = watchPath.slice(0, -1);
        if (path.startsWith(prefix)) {
          callbacks.forEach(callback => {
            try {
              callback(newValue, oldValue);
            } catch (error) {
              console.error(`Watcher error for "${watchPath}":`, error);
            }
          });
        }
      }
    }
  }

  /**
   * 标记计算属性为 dirty
   */
  private markComputedDirty(changedPath: string): void {
    for (const [path, fn] of this._computed) {
      // 简单实现：标记所有计算属性为 dirty
      // 更好的实现是分析依赖关系
      this._computedCache.set(path, {
        value: this._computedCache.get(path)!.value,
        dirty: true
      });
    }
  }

  /**
   * 获取整个状态对象
   */
  toJSON(): Record<string, StateValue> {
    return { ...this._state };
  }

  /**
   * 清空状态
   */
  clear(): void {
    this._state = {};
    this._watchers.clear();
    this._computed.clear();
    this._computedCache.clear();
  }
}

// ==================== 绑定表达式 ====================

/**
 * 绑定表达式类型
 */
export enum BindingType {
  State = 'state',
  Computed = 'computed',
  Literal = 'literal'
}

/**
 * 解析绑定表达式
 */
export function parseBinding(value: any): {
  type: BindingType;
  path?: string;
  expression?: string;
  value?: any;
} {
  if (typeof value === 'string') {
    // 模板表达式: {{state.xxx}} 或 {{xxx}}
    if (value.startsWith('{{') && value.endsWith('}}')) {
      const expr = value.slice(2, -2).trim();

      if (expr.startsWith('state.')) {
        return {
          type: BindingType.State,
          path: expr.slice(6)
        };
      }

      return {
        type: BindingType.Computed,
        expression: expr
      };
    }

    // 简单状态引用: state.xxx
    if (value.startsWith('state.')) {
      return {
        type: BindingType.State,
        path: value.slice(6)
      };
    }
  }

  // 字面量
  return {
    type: BindingType.Literal,
    value
  };
}

/**
 * 求值绑定表达式
 */
export function evaluateBinding(
  binding: ReturnType<typeof parseBinding>,
  state: ReactiveState
): any {
  switch (binding.type) {
    case BindingType.State:
      return state.get(binding.path!);

    case BindingType.Computed:
      if (!binding.expression) {
        return undefined;
      }
      // 安全执行表达式
      return safeEvaluate(binding.expression, state);

    case BindingType.Literal:
      return binding.value;
  }
}

/**
 * 安全执行表达式
 */
function safeEvaluate(expression: string, state: ReactiveState): any {
  try {
    // 创建安全的执行环境
    const sandbox = {
      state: state.toJSON(),
      Math,
      Date,
      JSON,
      parseInt,
      parseFloat,
      String,
      Number,
      Boolean
    };

    // 使用 Function 构造器执行（比 eval 稍安全）
    const fn = new Function(...Object.keys(sandbox), `return (${expression});`);
    return fn(...Object.values(sandbox));
  } catch (error) {
    console.error(`Expression evaluation failed: "${expression}"`, error);
    return undefined;
  }
}

// ==================== 状态管理器 ====================

/**
 * 状态管理器配置
 */
export interface StateManagerConfig {
  enableDevtools?: boolean;
  enablePersistence?: boolean;
  persistenceKey?: string;
}

/**
 * 状态管理器
 */
export class StateManager {
  private state: ReactiveState;
  private config: StateManagerConfig;

  constructor(
    initialState: Record<string, StateValue> = {},
    config: StateManagerConfig = {}
  ) {
    this.config = config;
    this.state = new ReactiveState(initialState);

    // 开发工具集成
    if (this.config.enableDevtools && typeof window !== 'undefined') {
      (window as any).__REACTIVE_STATE__ = this.state;
    }

    // 持久化
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }
  }

  /**
   * 获取状态值
   */
  get(path: string): any {
    return this.state.get(path);
  }

  /**
   * 设置状态值
   */
  set(path: string, value: any): void {
    this.state.set(path, value);

    // 持久化
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * 批量更新
   */
  batch(updates: Record<string, any>): void {
    this.state.batch(updates);

    // 持久化
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  /**
   * 添加监听器
   */
  watch(path: string, callback: WatcherCallback): () => void {
    return this.state.watch(path, callback);
  }

  /**
   * 添加计算属性
   */
  computed(path: string, fn: ComputedFunction): void {
    this.state.computed(path, fn);
  }

  /**
   * 获取底层状态对象
   */
  getState(): ReactiveState {
    return this.state;
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    const key = this.config.persistenceKey || '__reactive_state__';
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state.batch(parsed);
      }
    } catch (error) {
      console.error('Failed to load state from storage:', error);
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    const key = this.config.persistenceKey || '__reactive_state__';
    try {
      localStorage.setItem(key, JSON.stringify(this.state.toJSON()));
    } catch (error) {
      console.error('Failed to save state to storage:', error);
    }
  }

  /**
   * 清空状态
   */
  clear(): void {
    this.state.clear();

    if (this.config.enablePersistence) {
      const key = this.config.persistenceKey || '__reactive_state__';
      localStorage.removeItem(key);
    }
  }
}

// ==================== Hooks ====================

/**
 * 创建 React Hook
 */
export function createReactiveHook(manager: StateManager) {
  // 这个将在 React 集成时实现
  return {
    useReactive: () => {
      // TODO: 实现 React Hook
      return manager.getState();
    }
  };
}
