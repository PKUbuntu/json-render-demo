/**
 * JSON 渲染器
 *
 * 将 JSON Schema 渲染为真实的 React 组件
 * 在渲染前使用 Zod 校验 Schema 的合法性
 */

import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Space,
  Divider,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Switch,
  Checkbox,
  Radio,
  DatePicker,
  Table,
  Descriptions,
  Statistic,
  Progress,
  Tag,
  Badge,
  Avatar,
  Modal,
  Alert,
  Menu,
  Tabs,
  Breadcrumb,
  Typography,
  Empty,
  Image,
} from 'antd';
import {
  validateJsonSchema,
  formatValidationResult,
} from '../utils/schemaValidator';

const { Title, Text } = Typography;

// JSON Schema 类型定义
export interface JsonNode {
  type: string;
  props?: Record<string, any>;
  children?: JsonNode[];
}

export interface JsonSchema {
  version: string;
  component: JsonNode;
  state?: Record<string, any>;
  actions?: Record<string, any>;
}

// 组件映射表
const componentMap: Record<string, any> = {
  Button,
  Card,
  Space,
  Divider,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Switch,
  Checkbox,
  RadioGroup: Radio.Group,
  DatePicker,
  Table,
  Descriptions,
  Statistic,
  Progress,
  Tag,
  Badge,
  Avatar,
  Modal,
  Alert,
  Menu,
  Tabs,
  Breadcrumb,
  TypographyTitle: Title,
  TypographyText: Text,
  Empty,
  Image,
};

// 渲染单个节点
function renderNode(node: JsonNode, context: any): React.ReactNode {
  const { type, props = {}, children = [] } = node;

  // 处理原生 HTML 元素
  if (['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li'].includes(type)) {
    const renderedChildren = children.map((child, index) =>
      renderNode(child, { ...context, key: index })
    );
    return React.createElement(type, { key: context.key, ...props }, renderedChildren);
  }

  const Component = componentMap[type];

  if (!Component) {
    console.warn(`Unknown component type: ${type}`);
    // 使用 div 作为 fallback
    const renderedChildren = children.map((child, index) =>
      renderNode(child, { ...context, key: index })
    );
    return React.createElement('div', { key: context.key, ...props }, renderedChildren);
  }

  // 处理 action handlers
  const processedProps = { ...props };
  if (props.onClick && context.onAction) {
    processedProps.onClick = () => context.onAction(props.onClick, props);
  }
  if (props.onChange && context.onAction) {
    processedProps.onChange = (e: any) => {
      const value = e?.target?.value ?? e;
      context.onAction(props.onChange, { value, ...props });
    };
  }

  // 特殊组件处理
  if (type === 'Descriptions' && props.items) {
    return (
      <Descriptions key={context.key} {...processedProps}>
        {props.items.map((item: any, index: number) => (
          <Descriptions.Item key={index} label={item.label} span={item.span}>
            {item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  }

  if (type === 'TypographyTitle') {
    return <Title key={context.key} level={parseInt(props.level || '1') as any}>{props.children}</Title>;
  }

  if (type === 'TypographyText') {
    return <Text key={context.key} {...processedProps}>{props.children}</Text>;
  }

  // 渲染子节点
  const renderedChildren = children.map((child, index) =>
    renderNode(child, { ...context, key: index })
  );

  // 通用渲染
  if (renderedChildren.length > 0) {
    return (
      <Component key={context.key} {...processedProps}>
        {renderedChildren}
      </Component>
    );
  }

  return <Component key={context.key} {...processedProps} />;
}

// 主渲染函数
export function renderJsonSchema(schema: JsonSchema, context?: any): React.ReactNode {
  return renderNode(schema.component, context || {});
}

// 渲染器组件
interface JsonRendererProps {
  schema: JsonSchema;
  state?: Record<string, any>;
  onAction?: (actionName: string, payload: any) => void;
  strict?: boolean;
  showValidation?: boolean;
}

export const JsonRenderer: React.FC<JsonRendererProps> = ({
  schema,
  state,
  onAction,
  strict = false,
  showValidation = false,
}) => {
  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateJsonSchema> | null>(null);

  useEffect(() => {
    const result = validateJsonSchema(schema);
    setValidationResult(result);

    // 严格模式下，校验失败时抛出异常
    if (strict && !result.valid) {
      throw new Error(formatValidationResult(result));
    }

    // 开发环境下，即使不严格也输出警告
    if (process.env.NODE_ENV === 'development' && !result.valid) {
      console.warn('Schema validation failed:', result);
    }
  }, [schema, strict]);

  const context = {
    state,
    onAction: (actionName: string, payload: any) => {
      console.log(`Action triggered: ${actionName}`, payload);
      if (onAction) {
        onAction(actionName, payload);
      }
    },
  };

  // 校验失败且不是严格模式，显示错误信息
  if (validationResult && !validationResult.valid) {
    return (
      <div className="json-renderer">
        <Alert
          message="Schema 校验失败"
          description={
            <pre style={{ maxHeight: 300, overflow: 'auto' }}>
              {formatValidationResult(validationResult)}
            </pre>
          }
          type="error"
          showIcon
        />
        {renderJsonSchema(schema, context)}
      </div>
    );
  }

  // 显示校验结果（用于演示）
  if (showValidation && validationResult) {
    const alertType = validationResult.valid ? 'success' : 'warning';
    const alertMessage = validationResult.valid
      ? 'Schema 校验通过'
      : 'Schema 校验通过（有警告）';

    return (
      <div className="json-renderer">
        <Alert
          message={alertMessage}
          description={
            <div>
              {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                <span>所有组件和 Props 均符合 Catalog 定义</span>
              )}
              {validationResult.warnings.length > 0 && (
                <>
                  <strong>警告：</strong>
                  <ul style={{ margin: '8px 0 0 20px' }}>
                    {validationResult.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          }
          type={alertType as any}
          showIcon
          style={{ marginBottom: 16 }}
        />
        {renderJsonSchema(schema, context)}
      </div>
    );
  }

  return (
    <div className="json-renderer">
      {renderJsonSchema(schema, context)}
    </div>
  );
};

export default JsonRenderer;
