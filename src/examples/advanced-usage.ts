/**
 * 高级功能示例
 * 展示分层 Catalog、Action 执行器、响应式状态等新功能的使用
 */

import { z } from 'zod';
import { defaultCatalog } from '../core/Catalog';
import { ActionExecutor, createBuiltinActions } from '../actions/ActionExecutor';
import { StateManager } from '../state/ReactiveState';
import { validateJsonSchema, formatValidationResult } from '../utils/helpers';

// ==================== 示例 1: 使用分层 Catalog ====================

export function example1_LayeredCatalog() {
  console.log('=== 示例 1: 分层 Catalog ===\n');

  // 查看所有组件
  const allPrimitives = Object.keys(defaultCatalog.primitives);
  const allCompound = Object.keys(defaultCatalog.compound);
  const allBusiness = Object.keys(defaultCatalog.business);
  const allTemplates = Object.keys(defaultCatalog.templates);

  console.log('原子组件:', allPrimitives);
  console.log('复合组件:', allCompound);
  console.log('业务组件:', allBusiness);
  console.log('布局模板:', allTemplates);

  // 使用模板
  const dashboardTemplate = defaultCatalog.templates.DashboardLayout;
  console.log('\nDashboard 模板参数:', dashboardTemplate.parameters);

  // 使用 Design Tokens
  console.log('\nDesign Tokens:');
  console.log('  主色:', defaultCatalog.tokens.colors.primary);
  console.log('  间距:', defaultCatalog.tokens.spacing);
}

// ==================== 示例 2: 使用 Action 执行器 ====================

export async function example2_ActionExecutor() {
  console.log('\n=== 示例 2: Action 执行器 ===\n');

  // 创建执行器
  const executor = new ActionExecutor({
    enableSanitization: true,
    enableLogging: true
  });

  // 注册内置 Actions
  executor.registerAll(createBuiltinActions());

  // 执行导航 Action
  console.log('执行导航 Action:');
  const navResult = await executor.execute('navigate', {
    path: '/dashboard',
    query: { tab: 'overview' }
  });
  console.log('结果:', navResult);

  // 执行消息 Action
  console.log('\n执行消息 Action:');
  const msgResult = await executor.execute('showMessage', {
    type: 'success',
    content: '操作成功！'
  });
  console.log('结果:', msgResult);

  // 执行状态更新 Action
  console.log('\n执行状态更新 Action:');
  const stateResult = await executor.execute('updateState', {
    key: 'user.name',
    value: 'John Doe'
  }, { state: { user: {} } });
  console.log('结果:', stateResult);

  // 执行 HTTP 请求 Action
  console.log('\n执行 HTTP 请求 Action:');
  const fetchResult = await executor.execute('fetch', {
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    method: 'GET'
  });
  console.log('结果:', fetchResult);

  // 查看日志
  console.log('\n执行日志:');
  console.log(executor.getLogs());

  // 查看慢速 Action
  console.log('\n慢速 Action (>0ms):');
  console.log(executor.getSlowActions(0));
}

// ==================== 示例 3: 响应式状态管理 ====================

export function example3_ReactiveState() {
  console.log('\n=== 示例 3: 响应式状态管理 ===\n');

  // 创建状态管理器
  const manager = new StateManager({
    user: {
      name: 'Alice',
      email: 'alice@example.com'
    },
    count: 0,
    items: ['apple', 'banana']
  }, {
    enableDevtools: true,
    enablePersistence: false
  });

  // 获取状态
  console.log('初始状态:', manager.getState().toJSON());

  // 更新状态
  manager.set('user.name', 'Bob');
  console.log('\n更新后的用户名:', manager.get('user.name'));

  // 批量更新
  manager.batch({
    'user.email': 'bob@example.com',
    'count': 10
  });
  console.log('\n批量更新后的状态:', manager.getState().toJSON());

  // 添加监听器
  const unwatch = manager.watch('count', (newValue, oldValue) => {
    console.log(`\ncount 变化: ${oldValue} → ${newValue}`);
  });

  manager.set('count', 20);
  manager.set('count', 30);

  // 移除监听器
  unwatch();

  // 添加计算属性
  manager.getState().computed('doubledCount', (state) => {
    return state.get('count') * 2;
  });

  console.log('\n计算属性 doubledCount:', manager.getState().getComputed('doubledCount'));

  manager.set('count', 50);
  console.log('更新后的 doubledCount:', manager.getState().getComputed('doubledCount'));
}

// ==================== 示例 4: 绑定表达式 ====================

export function example4_BindingExpressions() {
  console.log('\n=== 示例 4: 绑定表达式 ===\n');

  const { parseBinding, evaluateBinding, ReactiveState } = require('../state/ReactiveState');

  const state = new ReactiveState({
    user: { name: 'Alice' },
    count: 5
  });

  // 解析不同类型的绑定
  const bindings = [
    'state.user.name',
    '{{state.user.name}}',
    '{{state.count * 2}}',
    'literal value',
    42
  ];

  console.log('绑定表达式解析和求值:');
  bindings.forEach(binding => {
    const parsed = parseBinding(binding);
    const evaluated = evaluateBinding(parsed, state);
    console.log(`  ${binding}`);
    console.log(`    类型: ${parsed.type}`);
    console.log(`    值: ${evaluated}`);
  });
}

// ==================== 示例 5: Schema 验证 ====================

export function example5_SchemaValidation() {
  console.log('\n=== 示例 5: Schema 验证 ===\n');

  // 有效的 Schema
  const validSchema = {
    version: '1.0.0',
    component: {
      type: 'Button',
      props: {
        type: 'primary',
        children: 'Click me'
      }
    }
  };

  console.log('验证有效 Schema:');
  const validResult = validateJsonSchema(validSchema, defaultCatalog);
  console.log(formatValidationResult(validResult));

  // 无效的 Schema
  const invalidSchema = {
    version: '1.0.0',
    component: {
      type: 'UnknownComponent',  // 不存在的组件
      props: {
        type: 'invalid',  // 无效的枚举值
        children: 'Test'
      }
    }
  };

  console.log('\n验证无效 Schema:');
  const invalidResult = validateJsonSchema(invalidSchema, defaultCatalog);
  console.log(formatValidationResult(invalidResult));
}

// ==================== 示例 6: 完整流程 ====================

export async function example6_CompleteWorkflow() {
  console.log('\n=== 示例 6: 完整工作流程 ===\n');

  // 1. 创建状态管理器
  const stateManager = new StateManager({
    formData: {
      username: '',
      email: ''
    },
    submitting: false
  });

  // 2. 创建 Action 执行器
  const actionExecutor = new ActionExecutor({
    enableSanitization: true,
    enableLogging: true
  });
  actionExecutor.registerAll(createBuiltinActions());

  // 3. 添加自定义 Action
  actionExecutor.register({
    name: 'submitForm',
    description: 'Submit form data',
    category: 'form',
    params: z.object({
      username: z.string().min(3),
      email: z.string().email()
    }).require(),
    result: z.object({
      success: z.boolean(),
      userId: z.string().optional()
    }),
    handler: async (params, context) => {
      console.log('提交表单:', params);

      // 更新状态
      context.state.submitting = true;

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      context.state.submitting = false;

      return {
        success: true,
        userId: '12345'
      };
    }
  });

  // 4. 监听状态变化
  stateManager.watch('submitting', (newValue) => {
    console.log('提交状态变化:', newValue);
  });

  // 5. 模拟用户输入
  stateManager.batch({
    'formData.username': 'johndoe',
    'formData.email': 'john@example.com'
  });

  // 6. 执行表单提交
  const formData = stateManager.get('formData');
  const submitResult = await actionExecutor.execute('submitForm', formData, {
    state: stateManager.getState()
  });

  console.log('\n提交结果:', submitResult);

  // 7. 显示成功消息
  if (submitResult.success) {
    await actionExecutor.execute('showMessage', {
      type: 'success',
      content: '表单提交成功！'
    });
  }
}

// ==================== 运行所有示例 ====================

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         AI UI 体系 - 高级功能示例                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    example1_LayeredCatalog();
    await example2_ActionExecutor();
    example3_ReactiveState();
    example4_BindingExpressions();
    example5_SchemaValidation();
    await example6_CompleteWorkflow();

    console.log('\n✅ 所有示例执行完成！');
  } catch (error) {
    console.error('\n❌ 示例执行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
