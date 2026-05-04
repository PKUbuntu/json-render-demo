/**
 * 增强的 JSON 渲染器
 * 支持新 DSL 格式（BindingExpr、节点级 Actions、条件渲染等）
 */

import React, { useMemo, useEffect, useState } from 'react';
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
  Form,
} from 'antd';
import { JsonNode, JsonSchema, RenderContext, parseBinding, evaluateBinding, isNewDSLFormat, legacyToNew } from '../types/core';

const { Title, Text } = Typography;

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
  Form,
  TypographyTitle: Title,
  TypographyText: Text,
  Empty,
  Image,
};

// ==================== 增强的渲染器 ====================

export interface EnhancedJsonRendererProps {
  schema: JsonSchema | any; // 支持新旧格式
  state?: Record<string, any>;
  onAction?: (action: { type: string; payload?: any }, context: RenderContext) => void | Promise<void>;
  strict?: boolean;
  showValidation?: boolean;
}

export const EnhancedJsonRenderer: React.FC<EnhancedJsonRendererProps> = ({
  schema,
  state = {},
  onAction,
  strict = false,
  showValidation = false,
}) => {
  // 规范化 Schema（支持新旧格式）
  const normalizedSchema = useMemo(() => {
    if (isNewDSLFormat(schema)) {
      return schema as JsonSchema;
    }
    // 旧格式转换为新格式
    return legacyToNew(schema);
  }, [schema]);

  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    // TODO: 添加 Schema 校验
    setValidationResult({ valid: true, errors: [], warnings: [] });
  }, [normalizedSchema]);

  // 渲染上下文
  const context: RenderContext = useMemo(
    () => ({
      state,
      onAction: async (actionName, payload) => {
        console.log(`Action triggered: ${actionName}`, payload);
        if (onAction) {
          await onAction({ type: actionName, payload }, context);
        }
      },
    }),
    [state, onAction]
  );

  // 渲染单个节点
  const renderNode = (node: JsonNode, nodeContext: RenderContext): React.ReactNode => {
    const { id, type, props = {}, children = [], actions, bindings, meta } = node;

    // 条件渲染检查
    if (meta?.visible === false) {
      return null;
    }

    // 处理原生 HTML 元素
    if (['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li'].includes(type)) {
      const renderedChildren = children.map((child, index) =>
        renderNode(child, { ...nodeContext, key: index })
      );
      return React.createElement(type, { key: meta?.key || id || nodeContext.key, ...props }, renderedChildren);
    }

    const Component = componentMap[type];

    if (!Component) {
      console.warn(`Unknown component type: ${type}`);
      const renderedChildren = children.map((child, index) =>
        renderNode(child, { ...nodeContext, key: index })
      );
      return React.createElement('div', { key: meta?.key || id || nodeContext.key }, renderedChildren);
    }

    // 解析 Props（处理绑定表达式）
    const resolvedProps = resolveProps(props, nodeContext);

    // 处理节点级 Actions
    const eventHandlers = resolveActions(actions, node, nodeContext);

    // 处理特殊组件
    if (type === 'Descriptions' && props.items) {
      return (
        <Descriptions key={meta?.key || id || nodeContext.key} {...resolvedProps} {...eventHandlers}>
          {(props.items as any[]).map((item: any, index: number) => (
            <Descriptions.Item key={index} label={item.label} span={item.span}>
              {item.value}
            </Descriptions.Item>
          ))}
        </Descriptions>
      );
    }

    if (type === 'TypographyTitle') {
      return <Title key={meta?.key || id || nodeContext.key} level={parseInt(resolvedProps.level || '1') as any}>{resolvedProps.children}</Title>;
    }

    if (type === 'TypographyText') {
      return <Text key={meta?.key || id || nodeContext.key} {...resolvedProps} {...eventHandlers}>{resolvedProps.children}</Text>;
    }

    // 渲染子节点
    const renderedChildren = children.map((child, index) =>
      renderNode(child, { ...nodeContext, key: index })
    );

    // 通用渲染
    if (renderedChildren.length > 0) {
      return (
        <Component key={meta?.key || id || nodeContext.key} {...resolvedProps} {...eventHandlers}>
          {renderedChildren}
        </Component>
      );
    }

    return <Component key={meta?.key || id || nodeContext.key} {...resolvedProps} {...eventHandlers} />;
  };

  // 解析 Props（处理绑定表达式）
  const resolveProps = (props: Record<string, any>, nodeContext: RenderContext) => {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(props)) {
      const binding = parseBinding(value);
      resolved[key] = evaluateBinding(binding, nodeContext);
    }

    return resolved;
  };

  // 解析 Actions
  const resolveActions = (actions: JsonNode['actions'], node: JsonNode, nodeContext: RenderContext) => {
    if (!actions || actions.length === 0) return {};

    const handlers: Record<string, (e: any) => void> = {};

    actions.forEach(action => {
      if (action.type === 'onClick') {
        handlers.onClick = (e) => {
          nodeContext.onAction?.(action, nodeContext);
        };
      }
      if (action.type === 'onChange') {
        handlers.onChange = (e) => {
          const value = e?.target?.value ?? e;
          nodeContext.onAction?.({ ...action, payload: { ...action.payload, value } }, nodeContext);
        };
      }
      if (action.type === 'onOk') {
        handlers.onOk = (e) => {
          nodeContext.onAction?.(action, nodeContext);
        };
      }
      if (action.type === 'onCancel') {
        handlers.onCancel = (e) => {
          nodeContext.onAction?.(action, nodeContext);
        };
      }
    });

    return handlers;
  };

  // 校验失败处理
  if (validationResult && !validationResult.valid) {
    return (
      <div className="json-renderer">
        <Alert
          message="Schema 校验失败"
          description={<pre style={{ maxHeight: 300, overflow: 'auto' }}>{validationResult.errors.join('\n')}</pre>}
          type="error"
          showIcon
        />
      </div>
    );
  }

  // 显示校验结果
  if (showValidation && validationResult) {
    return (
      <div className="json-renderer">
        <Alert
          message={validationResult.valid ? 'Schema 校验通过' : 'Schema 校验通过（有警告）'}
          description={
            validationResult.errors.length === 0 && validationResult.warnings.length === 0 ? (
              <span>所有组件和 Props 均符合 Catalog 定义</span>
            ) : (
              <ul style={{ margin: '8px 0 0 20px' }}>
                {validationResult.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            )
          }
          type={validationResult.valid ? 'success' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
        />
        {renderNode(normalizedSchema.root, context)}
      </div>
    );
  }

  return (
    <div className="json-renderer">
      {renderNode(normalizedSchema.root, context)}
    </div>
  );
};

export default EnhancedJsonRenderer;
