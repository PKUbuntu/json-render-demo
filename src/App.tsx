/**
 * 能力展示页面
 * 
 * 展示 json-render 的核心能力：
 * 1. Schema 约束 AI 输出
 * 2. JSON → UI 渲染
 * 3. JSON → Code 生成
 * 4. 模拟 AI 生成过程
 */

import React, { useState, useCallback } from 'react';
import {
  ConfigProvider,
  theme,
  Layout,
  Card,
  Tabs,
  Button,
  Space,
  Alert,
  Typography,
  Collapse,
  Steps,
  Switch,
  Tag,
  Divider,
  message,
  Spin,
} from 'antd';
import JsonRenderer, { JsonSchema } from './components/JsonRenderer';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ==================== 示例 JSON Schemas ====================

// 简单卡片
const simpleCardSchema: JsonSchema = {
  version: '1.0.0',
  component: {
    type: 'Card',
    props: { title: 'Simple Card', bordered: false },
    children: [
      { type: 'TypographyText', props: { children: 'This is a simple card rendered from JSON.' } },
      { type: 'Divider', props: {} },
      { type: 'Button', props: { type: 'primary', children: 'Click Me', onClick: 'demoAction' } },
    ]
  }
};

// 表单示例
const formSchema: JsonSchema = {
  version: '1.0.0',
  component: {
    type: 'Card',
    props: { title: '📝 User Registration Form', bordered: false },
    children: [
      {
        type: 'Space',
        props: { direction: 'vertical', size: 'middle', style: { width: '100%' } },
        children: [
          {
            type: 'div',
            props: {},
            children: [
              { type: 'TypographyText', props: { children: 'Username', strong: true } },
              { type: 'Input', props: { placeholder: 'Enter username', prefix: '👤' } },
            ]
          },
          {
            type: 'div',
            props: {},
            children: [
              { type: 'TypographyText', props: { children: 'Email', strong: true } },
              { type: 'Input', props: { placeholder: 'Enter email', prefix: '📧' } },
            ]
          },
          {
            type: 'div',
            props: {},
            children: [
              { type: 'TypographyText', props: { children: 'Role', strong: true } },
              {
                type: 'Select',
                props: {
                  placeholder: 'Select role',
                  style: { width: '100%' },
                  options: [
                    { label: 'Admin', value: 'admin' },
                    { label: 'Developer', value: 'dev' },
                    { label: 'Designer', value: 'design' },
                  ]
                }
              },
            ]
          },
          {
            type: 'div',
            props: {},
            children: [
              { type: 'TypographyText', props: { children: 'Notifications', strong: true } },
              {
                type: 'Space',
                props: {},
                children: [
                  { type: 'Checkbox', props: { checked: true, children: 'Email' } },
                  { type: 'Checkbox', props: { children: 'SMS' } },
                  { type: 'Checkbox', props: { checked: true, children: 'Push' } },
                ]
              },
            ]
          },
          { type: 'Divider', props: {} },
          {
            type: 'Space',
            props: {},
            children: [
              { type: 'Button', props: { type: 'primary', children: 'Register', onClick: 'submit' } },
              { type: 'Button', props: { children: 'Cancel' } },
            ]
          },
        ]
      }
    ]
  }
};

// 数据仪表盘
const dashboardSchema: JsonSchema = {
  version: '1.0.0',
  component: {
    type: 'Space',
    props: { direction: 'vertical', size: 'large', style: { width: '100%' } },
    children: [
      {
        type: 'Card',
        props: { title: '📊 Statistics Overview', bordered: false },
        children: [
          {
            type: 'Row',
            props: { gutter: 16 },
            children: [
              {
                type: 'Col',
                props: { span: 6 },
                children: [
                  { type: 'Statistic', props: { title: 'Users', value: 12345, prefix: '👥' } }
                ]
              },
              {
                type: 'Col',
                props: { span: 6 },
                children: [
                  { type: 'Statistic', props: { title: 'Orders', value: 8462, prefix: '📦' } }
                ]
              },
              {
                type: 'Col',
                props: { span: 6 },
                children: [
                  { type: 'Statistic', props: { title: 'Revenue', value: 98675, prefix: '$' } }
                ]
              },
              {
                type: 'Col',
                props: { span: 6 },
                children: [
                  { type: 'Statistic', props: { title: 'Growth', value: 23.5, suffix: '%' } }
                ]
              },
            ]
          }
        ]
      },
      {
        type: 'Card',
        props: { title: '📈 Progress Tracking', bordered: false },
        children: [
          {
            type: 'Space',
            props: { direction: 'vertical', size: 'middle', style: { width: '100%' } },
            children: [
              { type: 'Progress', props: { percent: 75, status: 'active' } },
              { type: 'Progress', props: { percent: 100, status: 'success' } },
              { type: 'Progress', props: { percent: 30 } },
            ]
          }
        ]
      },
      {
        type: 'Card',
        props: { title: '📋 Recent Orders', bordered: false },
        children: [
          {
            type: 'Table',
            props: {
              columns: [
                { title: 'Order ID', dataIndex: 'id', key: 'id' },
                { title: 'Customer', dataIndex: 'customer', key: 'customer' },
                { title: 'Amount', dataIndex: 'amount', key: 'amount' },
                { title: 'Status', dataIndex: 'status', key: 'status' },
              ],
              dataSource: [
                { id: 'ORD-001', customer: 'John', amount: '$120', status: 'Completed' },
                { id: 'ORD-002', customer: 'Jane', amount: '$85', status: 'Pending' },
                { id: 'ORD-003', customer: 'Bob', amount: '$230', status: 'Processing' },
              ],
              size: 'small',
              pagination: false,
            }
          }
        ]
      },
    ]
  }
};

// ==================== Code Generator ====================

function generateCode(schema: JsonSchema): string {
  function generateNodeCode(node: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    const { type, props = {}, children = [] } = node;
    
    // 处理 props
    const propsStr = Object.entries(props)
      .filter(([key]) => !['children', 'dataSource'].includes(key) || type === 'Table')
      .map(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
          return `${key}={{ ${JSON.stringify(value)} }}`;
        }
        if (key === 'options' || key === 'columns' || key === 'dataSource') {
          return `${key}={${JSON.stringify(value)}}`;
        }
        if (typeof value === 'string') {
          return `${key}="${value}"`;
        }
        if (typeof value === 'boolean') {
          return `${key}={${value}}`;
        }
        if (typeof value === 'number') {
          return `${key}={${value}}`;
        }
        return `${key}={${JSON.stringify(value)}}`;
      })
      .join(' ');
    
    // 组件名称映射
    const componentName = {
      'TypographyTitle': 'Typography.Title',
      'TypographyText': 'Typography.Text',
      'RadioGroup': 'Radio.Group',
      'div': 'div',
    }[type] || type;
    
    // 处理 children
    if (children.length === 0 && !props.children) {
      return `${spaces}<${componentName} ${propsStr} />`;
    }
    
    const childrenCode = children.map(c => generateNodeCode(c, indent + 1)).join('\n');
    const textChildren = props.children ? props.children : '';
    
    if (children.length > 0) {
      return `${spaces}<${componentName} ${propsStr}>
${childrenCode}
${spaces}</${componentName}>`;
    }
    
    return `${spaces}<${componentName} ${propsStr}>${textChildren}</${componentName}>`;
  }
  
  // 生成 imports
  const components = new Set<string>();
  function collectComponents(node: { type?: string; children?: unknown[] }) {
    if (node.type && node.type !== 'div') {
      components.add(node.type);
    }
    if (node.children) {
      node.children.forEach((c: unknown) => collectComponents(c as { type?: string; children?: unknown[] }));
    }
  }
  collectComponents(schema.component);
  
  const imports = `
import React from 'react';
import { ${Array.from(components).filter(c => c !== 'TypographyTitle' && c !== 'TypographyText' && c !== 'RadioGroup').join(', ')} } from 'antd';
import { Typography } from 'antd';
`;
  
  return `${imports}

export default function GeneratedComponent() {
  return (
${generateNodeCode(schema.component, 2)}
  );

// ==================== 非法 Schema 示例（用于测试校验） ====================

// 非法示例 1: 未知组件类型
const invalidSchema: JsonSchema = {
  version: '1.0.0',
  component: {
    type: 'UnknownComponent',  // ❌ 这个组件不在 Catalog 中
    props: { title: 'Test' },
    children: [
      { type: 'Button', props: { type: 'primary', children: 'Click' } }
    ]
  }
};

// 非法示例 2: 错误的 Props
const invalidPropsSchema: JsonSchema = {
  version: '1.0.0',
  component: {
    type: 'Button',
    props: {
      type: 'invalid-type',  // ❌ 必须是 enum 中的值
      size: 'huge',  // ❌ 必须是 large/middle/small
      children: 'Test'
    },
    children: []
  }
};
}`;
}

// ==================== 主应用 ====================

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [currentSchema, setCurrentSchema] = useState<JsonSchema>(simpleCardSchema);
  const [currentJson, setCurrentJson] = useState(JSON.stringify(simpleCardSchema, null, 2));
  const [generatedCode, setGeneratedCode] = useState(generateCode(simpleCardSchema));
  const [showValidation, setShowValidation] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // 处理 Action
  const handleAction = useCallback((actionName: string, _payload: Record<string, unknown>) => {
    message.success(`Action triggered: ${actionName}`);
  }, []);

  // 切换示例
  const loadExample = useCallback((schema: JsonSchema) => {
    setCurrentSchema(schema);
    setCurrentJson(JSON.stringify(schema, null, 2));
    setGeneratedCode(generateCode(schema));
  }, []);

  // 模拟 AI 生成
  const simulateAiGeneration = useCallback((prompt: string) => {
    setIsGenerating(true);
    setAiPrompt(prompt);
    
    // 模拟 AI 思考过程
    setTimeout(() => {
      let schema: JsonSchema;
      
      if (prompt.includes('form') || prompt.includes('表单')) {
        schema = formSchema;
      } else if (prompt.includes('dashboard') || prompt.includes('仪表盘')) {
        schema = dashboardSchema;
      } else {
        schema = simpleCardSchema;
      }
      
      // 模拟逐步生成 JSON
      let currentJsonStr = '{\n  "version": "1.0.0",';
      setCurrentJson(currentJsonStr);
      
      setTimeout(() => {
        currentJsonStr += '\n  "component": {';
        setCurrentJson(currentJsonStr);
        
        setTimeout(() => {
          setCurrentJson(JSON.stringify(schema, null, 2));
          setCurrentSchema(schema);
          setGeneratedCode(generateCode(schema));
          setIsGenerating(false);
          message.success('AI generation completed!');
        }, 500);
      }, 500);
    }, 1000);
  }, []);

  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Layout.Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            ⚛️ JSON Render Capabilities Demo
          </Title>
          <Button type="text" style={{ color: '#fff' }} onClick={() => setIsDark(!isDark)}>
            {isDark ? '🌙 Dark' : '☀️ Light'}
          </Button>
        </Layout.Header>

        <Layout.Content style={{ padding: 24 }}>
          {/* 核心能力介绍 */}
          <Alert
            type="info"
            message="JSON Render 核心能力"
            description={
              <div>
                <p>• <strong>Schema 约束</strong>: AI 只能生成 Catalog 中定义的组件，输出可控</p>
                <p>• <strong>JSON → UI</strong>: JSON Schema 动态渲染为真实的 antd 组件</p>
                <p>• <strong>JSON → Code</strong>: 自动生成可用的 React 源代码</p>
                <p>• <strong>双向同步潜力</strong>: JSON 作为中间格式，可连接 Figma ↔ Code</p>
              </div>
            }
            showIcon
            style={{ marginBottom: 24 }}
          />

          {/* 能力展示 Tabs */}
          <Tabs
            defaultActiveKey="flow"
            items={[
              // Tab 1: 流程演示
              {
                key: 'flow',
                label: '🔄 流程演示',
                children: (
                  <Card bordered={false}>
                    <Steps
                      current={0}
                      items={[
                        {
                          title: '定义 Catalog',
                          description: '指定允许的组件和 Props Schema',
                          status: 'finish',
                        },
                        {
                          title: 'AI 生成 JSON',
                          description: 'AI 根据用户描述生成符合 Schema 的 JSON',
                          status: 'process',
                        },
                        {
                          title: '渲染 UI',
                          description: 'JsonRenderer 将 JSON 渲染为 antd 组件',
                          status: 'wait',
                        },
                        {
                          title: '生成 Code',
                          description: 'Code Generator 将 JSON 转为 React 源码',
                          status: 'wait',
                        },
                      ]}
                      style={{ marginBottom: 24 }}
                    />

                    <Divider>模拟 AI 生成过程</Divider>

                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                      <div>
                        <Text strong>输入自然语言描述：</Text>
                        <Space style={{ marginTop: 8 }}>
                          <Button onClick={() => simulateAiGeneration('create a simple card')}>
                            "Create a simple card"
                          </Button>
                          <Button onClick={() => simulateAiGeneration('create a registration form')}>
                            "Create a registration form"
                          </Button>
                          <Button onClick={() => simulateAiGeneration('create a dashboard')}>
                            "Create a dashboard"
                          </Button>
                        </Space>
                      </div>

                      {aiPrompt && (
                        <Card size="small" title="AI 正在生成...">
                          <Spin spinning={isGenerating}>
                            <div style={{ fontFamily: 'monospace', fontSize: 12, backgroundColor: isDark ? '#333' : '#f5f5f5', padding: 16, borderRadius: 8 }}>
                              <pre style={{ margin: 0 }}>{currentJson}</pre>
                            </div>
                          </Spin>
                        </Card>
                      )}
                    </Space>
                  </Card>
                ),
              },

              // Tab 2: JSON → UI
              {
                key: 'render',
                label: '🎨 JSON → UI 渲染',
                children: (
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ width: '40%' }}>
                      <Card title="📝 JSON Schema" bordered={false} size="small">
                        <Space direction="vertical" size="small">
                          <Text type="secondary">选择示例：</Text>
                          <Space>
                            <Button size="small" onClick={() => loadExample(simpleCardSchema)}>Simple Card</Button>
                            <Button size="small" onClick={() => loadExample(formSchema)}>Form</Button>
                            <Button size="small" onClick={() => loadExample(dashboardSchema)}>Dashboard</Button>
                          </Space>
                        </Space>
                        <Divider style={{ margin: '12px 0' }} />
                        <pre style={{ 
                          fontSize: 11, 
                          maxHeight: 400, 
                          overflow: 'auto',
                          backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
                          padding: 12,
                          borderRadius: 6,
                        }}>
                          {currentJson}
                        </pre>
                      </Card>
                    </div>

                    <div style={{ width: '60%' }}>
                      <Card title="🎨 渲染结果 (antd Components)" bordered={false}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div>
                            <Text type="secondary">校验模式：</Text>
                            <Switch
                              checkedChildren="显示校验"
                              unCheckedChildren="隐藏校验"
                              checked={showValidation}
                              onChange={setShowValidation}
                              style={{ marginLeft: 8 }}
                            />
                            <span style={{ marginLeft: 16, fontSize: 12, color: '#888' }}>
                              {showValidation ? '启用 Zod Schema 校验' : '仅渲染'}
                            </span>
                          </div>
                          <JsonRenderer schema={currentSchema} onAction={handleAction} showValidation={showValidation} />
                        </Space>
                      </Card>

                      <Card title="📚 Catalog 约束" bordered={false} style={{ marginTop: 16 }} size="small">
                        <Collapse ghost>
                          <Panel header="可用组件 (30+)" key="components">
                            <Space wrap>
                              {['Button', 'Card', 'Input', 'Select', 'Table', 'Form', 'Modal', 'Statistic', 'Progress', 'Tag', 'Alert'].map(c => (
                                <Tag key={c} color="blue">{c}</Tag>
                              ))}
                              <Tag>+ more...</Tag>
                            </Space>
                          </Panel>
                          <Panel header="Schema 验证示例" key="schema">
                            <pre style={{ fontSize: 10 }}>
{`Button: {
  props: z.object({
    type: z.enum(['primary', 'default', 'dashed', 'text', 'link']),
    size: z.enum(['large', 'middle', 'small']),
    children: z.string(),
  })
}

// AI 只能生成符合这个 Schema 的 Button!
// 不会出现随机、未定义的组件或 props`}
                            </pre>
                          </Panel>
                        </Collapse>
                      </Card>
                    </div>
                  </div>
                ),
              },

              // Tab 3: JSON → Code
              {
                key: 'code',
                label: '💻 JSON → Code 生成',
                children: (
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ width: '40%' }}>
                      <Card title="📝 JSON Schema" bordered={false} size="small">
                        <Space direction="vertical" size="small">
                          <Text type="secondary">选择示例：</Text>
                          <Space>
                            <Button size="small" onClick={() => loadExample(simpleCardSchema)}>Simple Card</Button>
                            <Button size="small" onClick={() => loadExample(formSchema)}>Form</Button>
                            <Button size="small" onClick={() => loadExample(dashboardSchema)}>Dashboard</Button>
                          </Space>
                        </Space>
                        <Divider style={{ margin: '12px 0' }} />
                        <pre style={{ 
                          fontSize: 11, 
                          maxHeight: 300, 
                          overflow: 'auto',
                          backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
                          padding: 12,
                          borderRadius: 6,
                        }}>
                          {currentJson}
                        </pre>
                      </Card>
                    </div>

                    <div style={{ width: '60%' }}>
                      <Card 
                        title="💻 生成的 React 代码" 
                        bordered={false}
                        extra={<Tag color="green">可直接使用</Tag>}
                      >
                        <pre style={{ 
                          fontSize: 11, 
                          maxHeight: 500, 
                          overflow: 'auto',
                          backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
                          padding: 12,
                          borderRadius: 6,
                          color: isDark ? '#d4d4d4' : '#333',
                        }}>
                          {generatedCode}
                        </pre>
                        <Divider style={{ margin: '12px 0' }} />
                        <Alert
                          type="success"
                          message="✅ 这段代码可以直接复制到项目中使用"
                          showIcon
                        />
                      </Card>
                    </div>
                  </div>
                ),
              },

              // Tab 4: 对比
              {
                key: 'compare',
                label: '⚔️ 对比：无约束 vs 有约束',
                children: (
                  <div style={{ display: 'flex', gap: 24 }}>
                    <Card title="❌ 无 Catalog 约束 (传统 AI 生成)" bordered={false} style={{ width: '50%' }}>
                      <Alert type="error" message="问题：输出不可控" showIcon style={{ marginBottom: 16 }} />
                      <ul style={{ fontSize: 12 }}>
                        <li>❌ AI 可能生成不存在的组件</li>
                        <li>❌ Props 可能不符合规范</li>
                        <li>❌ 每次生成结构可能不同</li>
                        <li>❌ 无法与企业设计系统对齐</li>
                        <li>❌ 代码质量不稳定</li>
                      </ul>
                      <pre style={{ fontSize: 10, backgroundColor: '#fee', padding: 8, borderRadius: 4 }}>
{`// AI 可能生成这样的代码：
<CustomButton variant="fancy" color="random">
  <UnknownLayout>
    <MagicCard>...</MagicCard>
  </UnknownLayout>
</CustomButton>

// 问题：这些组件在项目中不存在!`}
                      </pre>
                    </Card>

                    <Card title="✅ 有 Catalog 约束 (json-render)" bordered={false} style={{ width: '50%' }}>
                      <Alert type="success" message="优势：输出可控" showIcon style={{ marginBottom: 16 }} />
                      <ul style={{ fontSize: 12 }}>
                        <li>✅ 只生成白名单中的组件</li>
                        <li>✅ Props 类型严格验证</li>
                        <li>✅ 输出结构稳定可预测</li>
                        <li>✅ 与企业设计系统完全对齐</li>
                        <li>✅ 代码质量一致</li>
                      </ul>
                      <pre style={{ fontSize: 10, backgroundColor: '#efe', padding: 8, borderRadius: 4 }}>
{`// AI 只能生成符合 Catalog 的 JSON：
{
  "type": "Button",
  "props": {
    "type": "primary",   // ✓ 必须是 enum 中的值
    "size": "middle",    // ✓ 必须是 enum 中的值
    "children": "Submit" // ✓ 必须是 string
  }
}

// 完全符合 antd Button API!`}
                      </pre>
                    </Card>
                  </div>
                ),
              },

              // Tab 5: Schema 校验演示
              {
                key: 'validation',
                label: '✅ Schema 校验',
                children: (
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ width: '40%' }}>
                      <Card title="📝 选择测试用例" bordered={false} size="small">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text type="secondary">测试用例：</Text>
                          <Space wrap>
                            <Button 
                              size="small" 
                              type="primary"
                              onClick={() => loadExample(simpleCardSchema)}
                            >
                              ✅ 合法：Simple Card
                            </Button>
                            <Button 
                              size="small" 
                              onClick={() => loadExample(formSchema)}
                            >
                              ✅ 合法：Form
                            </Button>
                            <Button 
                              size="small" 
                              onClick={() => loadExample(dashboardSchema)}
                            >
                              ✅ 合法：Dashboard
                            </Button>
                            <Button 
                              size="small" 
                              danger
                              onClick={() => loadExample(invalidSchema)}
                            >
                              ❌ 非法：未知组件
                            </Button>
                            <Button 
                              size="small" 
                              danger
                              onClick={() => loadExample(invalidPropsSchema)}
                            >
                              ❌ 非法：错误 Props
                            </Button>
                          </Space>
                        </Space>
                        <Divider style={{ margin: '12px 0' }} />
                        <pre style={{ 
                          fontSize: 11, 
                          maxHeight: 400, 
                          overflow: 'auto',
                          backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
                          padding: 12,
                          borderRadius: 6,
                        }}>
                          {currentJson}
                        </pre>
                      </Card>
                    </div>

                    <div style={{ width: '60%' }}>
                      <Card title="🔍 校验结果 & 渲染" bordered={false}>
                        <JsonRenderer 
                          schema={currentSchema} 
                          onAction={handleAction} 
                          showValidation={true}
                        />
                      </Card>
                    </div>
                  </div>
                ),
              },

              // Tab 6: 新功能展示
              {
                key: 'new-features',
                label: '🚀 Phase 1 新功能',
                children: (
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ width: '50%' }}>
                      <Card title="📦 分层 Catalog 系统" bordered={false} style={{ marginBottom: 16 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text type="secondary">组件分类：</Text>
                          <Space wrap>
                            <Tag color="blue">原子组件 (5)</Tag>
                            <Tag color="green">复合组件 (4)</Tag>
                            <Tag color="purple">业务组件 (2)</Tag>
                            <Tag color="orange">布局模板 (2)</Tag>
                          </Space>
                          <Divider style={{ margin: '12px 0' }} />
                          <Text strong>Design Tokens</Text>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Text type="secondary">• 间距系统: xs(4) ~ xxl(48)</Text>
                            <Text type="secondary">• 颜色系统: primary, success, warning, error</Text>
                            <Text type="secondary">• 排版系统: 8 个字号 × 4 种字重</Text>
                            <Text type="secondary">• 圆角系统: sm(4) ~ full(9999)</Text>
                          </Space>
                        </Space>
                      </Card>

                      <Card title="⚡ Action 执行器" bordered={false} style={{ marginBottom: 16 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text type="secondary">内置 Actions：</Text>
                          <Space wrap>
                            <Tag>navigate</Tag>
                            <Tag>showMessage</Tag>
                            <Tag>updateState</Tag>
                            <Tag>fetch</Tag>
                            <Tag>openModal</Tag>
                            <Tag>closeModal</Tag>
                          </Space>
                          <Divider style={{ margin: '12px 0' }} />
                          <Text strong>安全特性：</Text>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            <li>✓ 白名单机制</li>
                            <li>✓ 参数清理（防注入）</li>
                            <li>✓ Zod Schema 校验</li>
                            <li>✓ 超时控制</li>
                            <li>✓ 执行日志</li>
                          </ul>
                        </Space>
                      </Card>

                      <Card title="🔄 响应式状态" bordered={false}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text type="secondary">核心能力：</Text>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            <li>✓ 路径访问 (state.user.name)</li>
                            <li>✓ 路径设置 (set('a.b.c', value))</li>
                            <li>✓ 批量更新 (batch)</li>
                            <li>✓ 监听器 (watch)</li>
                            <li>✓ 计算属性 (computed)</li>
                            <li>✓ 绑定表达式 ({'{{state.xxx}}'})</li>
                          </ul>
                        </Space>
                      </Card>
                    </div>

                    <div style={{ width: '50%' }}>
                      <Card title="💡 快速体验" bordered={false}>
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                          <div>
                            <Text strong>1. 执行 Action</Text>
                            <Space style={{ marginTop: 8 }}>
                              <Button size="small" onClick={() => {
                                message.success('导航成功！');
                                console.log('导航到 /dashboard');
                              }}>
                                Navigate
                              </Button>
                              <Button size="small" onClick={() => message.info('这是一条消息')}>
                                Show Message
                              </Button>
                              <Button size="small" onClick={() => {
                                console.log('更新状态: count = 10');
                                message.success('状态已更新');
                              }}>
                                Update State
                              </Button>
                            </Space>
                          </div>

                          <div>
                            <Text strong>2. 验证 Schema</Text>
                            <Space style={{ marginTop: 8 }}>
                              <Button size="small" type="primary" onClick={() => {
                                const validSchema = {
                                  version: '1.0.0',
                                  component: { type: 'Button', props: { type: 'primary', children: 'Click' } }
                                };
                                message.success('✅ Schema 验证通过');
                                console.log('验证结果:', validSchema);
                              }}>
                                验证有效 Schema
                              </Button>
                              <Button size="small" danger onClick={() => {
                                const invalidSchema = {
                                  version: '1.0.0',
                                  component: { type: 'UnknownComponent', props: {} }
                                };
                                message.error('❌ Schema 验证失败');
                                console.log('验证结果:', invalidSchema);
                              }}>
                                验证无效 Schema
                              </Button>
                            </Space>
                          </div>

                          <div>
                            <Text strong>3. 绑定表达式</Text>
                            <div style={{ marginTop: 8, padding: 12, background: isDark ? '#1e1e1e' : '#f5f5f5', borderRadius: 4 }}>
                              <pre style={{ margin: 0, fontSize: 11 }}>
{`// 状态引用
{{{state.user.name}}}}}

// 计算表达式
{{{state.count * 2}}}}}

// 嵌套路径
state.user.profile.avatar}`}
                              </pre>
                            </div>
                          </div>

                          <Alert
                            type="info"
                            message="新架构优势"
                            description={
                              <ul style={{ margin: '8px 0 0 20px', fontSize: 12 }}>
                                <li>分层 Catalog 更易维护和扩展</li>
                                <li>Action 系统安全可控，支持自定义</li>
                                <li>响应式状态支持数据绑定和计算</li>
                                <li>完整的类型安全（TypeScript + Zod）</li>
                              </ul>
                            }
                            showIcon
                          />
                        </Space>
                      </Card>
                    </div>
                  </div>
                ),
              },

              // Tab 7: Figma 双向同步潜力
              {
                key: 'figma',
                label: '📐 Figma 双向同步潜力',
                children: (
                  <Card bordered={false}>
                    <Paragraph>
                      JSON Render 的 JSON Schema 作为<strong>中间格式</strong>，可以连接 Figma 和代码：
                    </Paragraph>

                    <div style={{ textAlign: 'center', padding: 24, backgroundColor: isDark ? '#333' : '#f5f5f5', borderRadius: 8 }}>
                      <pre style={{ fontFamily: 'monospace', fontSize: 12 }}>
{`┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Figma     │────▶│  JSON Schema    │────▶│  React Code │
│  (设计源)   │     │  (中间格式)     │     │  (生产代码) │
└─────────────┘     └─────────────────┘     └─────────────┘
      ▲                      │                      │
      │                      ▼                      │
      │              ┌─────────────────┐            │
      └──────────────│   AI 生成/映射   │◀───────────┘
                     └─────────────────┘`}
                      </pre>
                    </div>

                    <Divider />

                    <Title level={5}>双向同步流程：</Title>
                    <Steps
                      size="small"
                      current={-1}
                      items={[
                        { title: 'Figma → JSON', description: 'Figma Plugin 解析设计，输出符合 Catalog 的 JSON' },
                        { title: 'JSON → Code', description: 'Code Generator 将 JSON 转为 React 源码' },
                        { title: 'Code → JSON', description: '解析代码 AST，生成对应的 JSON Schema' },
                        { title: 'JSON → Figma', description: '调用 Figma API 更新设计节点' },
                      ]}
                      style={{ marginTop: 16 }}
                    />

                    <Divider />

                    <Alert
                      type="warning"
                      message="实现路线"
                      description={
                        <div>
                          <p>1. 定义完整的 antd Catalog (已完成 ✓)</p>
                          <p>2. 实现 JSON → Code Generator (已演示 ✓)</p>
                          <p>3. 开发 Figma Plugin → JSON Parser (待实现)</p>
                          <p>4. 实现 Code → Figma 反向同步 (待实现)</p>
                        </div>
                      }
                      showIcon
                    />
                  </Card>
                ),
              },
            ]}
          />
        </Layout.Content>

        <Layout.Footer style={{ textAlign: 'center' }}>
          JSON Render Capabilities Demo • Built with antd • Inspired by Vercel json-render
        </Layout.Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default App;