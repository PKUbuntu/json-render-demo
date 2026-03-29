/**
 * JSON 渲染器
 * 
 * 将 JSON Schema 渲染为真实的 React 组件
 * 核心功能：
 * 1. 解析 JSON Schema
 * 2. 根据组件类型渲染对应的 antd 组件
 * 3. 处理 props 和 children
 * 4. 执行 actions
 */

import React from 'react';
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
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// JSON Schema 类型定义
export interface JsonNode {
  type: string;
  props?: Record<string, unknown>;
  children?: JsonNode[];
}

export interface JsonSchema {
  version: string;
  component: JsonNode;
  state?: Record<string, unknown>;
  actions?: Record<string, unknown>;
}

// 原生 HTML 元素处理
const htmlElements = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li'];

// 组件映射表
const componentMap: Record<string, React.ComponentType<Record<string, unknown>>> = {
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

// 处理特殊 props
function processProps(type: string, props: Record<string, unknown>): Record<string, unknown> {
  const processed = { ...props };

  switch (type) {
    case 'DatePicker':
      if (props.value) {
        processed.value = dayjs(props.value as string);
      }
      break;
    
    case 'Table':
      if (props.dataSource) {
        processed.dataSource = (props.dataSource as Array<Record<string, unknown>>).map((item, index) => ({
          ...item,
          key: item.key || item.id || index,
        }));
      }
      break;
    
    case 'Menu':
      if (props.items) {
        processed.items = (props.items as Array<Record<string, unknown>>).map((item) => ({
          ...item,
          icon: item.icon ? <span className={`icon-${item.icon}`} /> : undefined,
        }));
      }
      break;
    
    case 'Tabs':
      // Tabs 的 children 需要特殊处理
      break;
  }

  return processed;
}

// 渲染上下文
interface RenderContext {
  key?: string | number;
  state?: Record<string, unknown>;
  onAction?: (actionName: string, payload: Record<string, unknown>) => void;
}

// 渲染单个节点
function renderNode(node: JsonNode, context: RenderContext): React.ReactNode {
  const { type, props = {}, children = [] } = node;
  
  // 处理原生 HTML 元素
  if (htmlElements.includes(type)) {
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

  const processedProps = processProps(type, props);

  // 处理 action handlers
  if (props.onClick && context.onAction) {
    processedProps.onClick = () => context.onAction(props.onClick as string, props);
  }
  if (props.onChange && context.onAction) {
    processedProps.onChange = (e: unknown) => {
      const value = (e as { target?: { value: unknown } })?.target?.value ?? e;
      context.onAction(props.onChange as string, { value, ...props });
    };
  }

  // 渲染子节点
  const renderedChildren = children.map((child, index) => 
    renderNode(child, { ...context, key: index })
  );

  // 特殊组件处理
  if (type === 'Divider' && props.children) {
    return <Divider key={context.key} {...processedProps}>{props.children as React.ReactNode}</Divider>;
  }

  if (type === 'Descriptions') {
    return (
      <Descriptions key={context.key} {...processedProps}>
        {(props.items as Array<{ label: string; value: React.ReactNode; span?: number }>)?.map((item, index) => (
          <Descriptions.Item key={index} label={item.label} span={item.span}>
            {item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  }

  if (type === 'Statistic') {
    return (
      <Statistic key={context.key} {...processedProps} />
    );
  }

  if (type === 'Progress') {
    return <Progress key={context.key} {...processedProps} />;
  }

  if (type === 'Tag') {
    return <Tag key={context.key} {...processedProps}>{props.children as React.ReactNode}</Tag>;
  }

  if (type === 'TypographyTitle') {
    return <Title key={context.key} level={parseInt(props.level as string || '1') as 1 | 2 | 3 | 4 | 5}>{props.children as React.ReactNode}</Title>;
  }

  if (type === 'TypographyText') {
    return <Text key={context.key} {...processedProps}>{props.children as React.ReactNode}</Text>;
  }

  if (type === 'Empty') {
    return <Empty key={context.key} {...processedProps} />;
  }

  if (type === 'Alert') {
    return <Alert key={context.key} {...processedProps} />;
  }

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
export function renderJsonSchema(schema: JsonSchema, context?: RenderContext): React.ReactNode {
  return renderNode(schema.component, context || {});
}

// 渲染器组件
interface JsonRendererProps {
  schema: JsonSchema;
  state?: Record<string, unknown>;
  onAction?: (actionName: string, payload: Record<string, unknown>) => void;
}

export const JsonRenderer: React.FC<JsonRendererProps> = ({ 
  schema, 
  state, 
  onAction 
}) => {
  const context: RenderContext = {
    state,
    onAction: (actionName, payload) => {
      console.log(`Action triggered: ${actionName}`, payload);
      if (onAction) {
        onAction(actionName, payload);
      }
    },
  };

  return (
    <div className="json-renderer">
      {renderJsonSchema(schema, context)}
    </div>
  );
};

export default JsonRenderer;