/**
 * Ant Design 组件目录定义
 * 
 * 这是 json-render 的核心概念：
 * 1. 定义允许使用的组件（白名单）
 * 2. 定义每个组件的 Props Schema（Zod）
 * 3. 定义可用的 Actions
 * 
 * AI 只能生成符合这个 Catalog 的 JSON，从而保证输出可控
 */

import { z } from 'zod';

// 定义 antd 组件目录 Schema
export const antdCatalogSchema = {
  components: {
    // ==================== 通用组件 ====================
    Button: {
      props: z.object({
        type: z.enum(['primary', 'default', 'dashed', 'text', 'link']).optional(),
        size: z.enum(['large', 'middle', 'small']).optional(),
        danger: z.boolean().optional(),
        loading: z.boolean().optional(),
        disabled: z.boolean().optional(),
        block: z.boolean().optional(),
        children: z.string(),
        onClick: z.string().optional(),
      }),
      description: 'Ant Design Button component with various styles',
    },

    // ==================== 布局组件 ====================
    Card: {
      props: z.object({
        title: z.string().optional(),
        bordered: z.boolean().optional(),
        loading: z.boolean().optional(),
        hoverable: z.boolean().optional(),
        size: z.enum(['default', 'small']).optional(),
      }),
      slots: ['children'],
      description: 'Card container for content grouping',
    },

    Space: {
      props: z.object({
        direction: z.enum(['horizontal', 'vertical']).optional(),
        size: z.enum(['small', 'middle', 'large']).or(z.number()).optional(),
        wrap: z.boolean().optional(),
      }),
      slots: ['children'],
      description: 'Flexible space between components',
    },

    Divider: {
      props: z.object({
        direction: z.enum(['horizontal', 'vertical']).optional(),
        orientation: z.enum(['left', 'center', 'right']).optional(),
        dashed: z.boolean().optional(),
        children: z.string().optional(),
      }),
      description: 'Divider line for separating content',
    },

    Row: {
      props: z.object({
        gutter: z.number().or(z.tuple([z.number(), z.number()])).optional(),
        justify: z.enum(['start', 'end', 'center', 'space-around', 'space-between', 'space-evenly']).optional(),
        align: z.enum(['top', 'middle', 'bottom']).optional(),
      }),
      slots: ['children'],
      description: 'Grid row component',
    },

    Col: {
      props: z.object({
        span: z.number().min(1).max(24).optional(),
        offset: z.number().optional(),
        push: z.number().optional(),
        pull: z.number().optional(),
      }),
      slots: ['children'],
      description: 'Grid column component',
    },

    // ==================== 数据录入 ====================
    Input: {
      props: z.object({
        placeholder: z.string().optional(),
        value: z.string().optional(),
        disabled: z.boolean().optional(),
        allowClear: z.boolean().optional(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
        onChange: z.string().optional(),
      }),
      description: 'Text input field',
    },

    InputNumber: {
      props: z.object({
        placeholder: z.string().optional(),
        value: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
        disabled: z.boolean().optional(),
        onChange: z.string().optional(),
      }),
      description: 'Number input field',
    },

    Select: {
      props: z.object({
        placeholder: z.string().optional(),
        value: z.string().optional(),
        disabled: z.boolean().optional(),
        allowClear: z.boolean().optional(),
        mode: z.enum(['multiple', 'tags']).optional(),
        options: z.array(z.object({
          label: z.string(),
          value: z.string(),
          disabled: z.boolean().optional(),
        })),
        onChange: z.string().optional(),
      }),
      description: 'Dropdown select component',
    },

    Switch: {
      props: z.object({
        checked: z.boolean().optional(),
        disabled: z.boolean().optional(),
        loading: z.boolean().optional(),
        size: z.enum(['default', 'small']).optional(),
        onChange: z.string().optional(),
      }),
      description: 'Switch toggle component',
    },

    Checkbox: {
      props: z.object({
        checked: z.boolean().optional(),
        disabled: z.boolean().optional(),
        indeterminate: z.boolean().optional(),
        children: z.string().optional(),
        onChange: z.string().optional(),
      }),
      description: 'Checkbox component',
    },

    RadioGroup: {
      props: z.object({
        value: z.string().optional(),
        disabled: z.boolean().optional(),
        optionType: z.enum(['default', 'button']).optional(),
        options: z.array(z.object({
          label: z.string(),
          value: z.string(),
          disabled: z.boolean().optional(),
        })),
        onChange: z.string().optional(),
      }),
      description: 'Radio group component',
    },

    DatePicker: {
      props: z.object({
        placeholder: z.string().optional(),
        format: z.string().optional(),
        disabled: z.boolean().optional(),
        showTime: z.boolean().optional(),
        picker: z.enum(['date', 'week', 'month', 'quarter', 'year']).optional(),
        onChange: z.string().optional(),
      }),
      description: 'Date picker component',
    },

    // ==================== 数据展示 ====================
    Table: {
      props: z.object({
        columns: z.array(z.object({
          title: z.string(),
          dataIndex: z.string(),
          key: z.string().optional(),
          width: z.number().optional(),
          fixed: z.enum(['left', 'right']).optional(),
          align: z.enum(['left', 'center', 'right']).optional(),
        })),
        dataSource: z.array(z.record(z.any())),
        loading: z.boolean().optional(),
        pagination: z.union([
          z.boolean(),
          z.object({
            current: z.number().optional(),
            pageSize: z.number().optional(),
            total: z.number().optional(),
          }),
        ]).optional(),
        rowKey: z.string().optional(),
        size: z.enum(['large', 'middle', 'small']).optional(),
        bordered: z.boolean().optional(),
      }),
      description: 'Table component for displaying data',
    },

    Descriptions: {
      props: z.object({
        title: z.string().optional(),
        bordered: z.boolean().optional(),
        column: z.number().optional(),
        size: z.enum(['default', 'middle', 'small']).optional(),
        items: z.array(z.object({
          label: z.string(),
          value: z.any(),
          span: z.number().optional(),
        })),
      }),
      description: 'Description list for displaying details',
    },

    Statistic: {
      props: z.object({
        title: z.string(),
        value: z.number().or(z.string()),
        precision: z.number().optional(),
        prefix: z.string().optional(),
        suffix: z.string().optional(),
        valueStyle: z.record(z.any()).optional(),
      }),
      description: 'Statistic number display',
    },

    Progress: {
      props: z.object({
        percent: z.number().min(0).max(100),
        type: z.enum(['line', 'circle', 'dashboard']).optional(),
        status: z.enum(['success', 'exception', 'normal', 'active']).optional(),
        strokeColor: z.string().optional(),
      }),
      description: 'Progress bar component',
    },

    Tag: {
      props: z.object({
        color: z.string().optional(),
        bordered: z.boolean().optional(),
        closable: z.boolean().optional(),
        children: z.string(),
      }),
      description: 'Tag label component',
    },

    Badge: {
      props: z.object({
        count: z.number().optional(),
        showZero: z.boolean().optional(),
        overflowCount: z.number().optional(),
        status: z.enum(['success', 'processing', 'default', 'error', 'warning']).optional(),
        text: z.string().optional(),
      }),
      slots: ['children'],
      description: 'Badge notification component',
    },

    Avatar: {
      props: z.object({
        src: z.string().optional(),
        icon: z.string().optional(),
        size: z.union([z.number(), z.enum(['large', 'default', 'small'])]).optional(),
        shape: z.enum(['circle', 'square']).optional(),
      }),
      description: 'Avatar image component',
    },

    // ==================== 反馈组件 ====================
    Modal: {
      props: z.object({
        title: z.string().optional(),
        open: z.boolean(),
        width: z.number().optional(),
        centered: z.boolean().optional(),
        footer: z.union([z.boolean(), z.array(z.any())]).optional(),
        onOk: z.string().optional(),
        onCancel: z.string().optional(),
      }),
      slots: ['children'],
      description: 'Modal dialog component',
    },

    Alert: {
      props: z.object({
        type: z.enum(['success', 'info', 'warning', 'error']),
        message: z.string(),
        description: z.string().optional(),
        showIcon: z.boolean().optional(),
        closable: z.boolean().optional(),
        banner: z.boolean().optional(),
      }),
      description: 'Alert banner component',
    },

    // ==================== 导航组件 ====================
    Menu: {
      props: z.object({
        mode: z.enum(['horizontal', 'vertical', 'inline']).optional(),
        theme: z.enum(['light', 'dark']).optional(),
        selectedKeys: z.array(z.string()).optional(),
        items: z.array(z.object({
          key: z.string(),
          label: z.string(),
          icon: z.string().optional(),
          disabled: z.boolean().optional(),
          children: z.array(z.any()).optional(),
        })),
        onClick: z.string().optional(),
      }),
      description: 'Navigation menu component',
    },

    Tabs: {
      props: z.object({
        activeKey: z.string().optional(),
        type: z.enum(['line', 'card', 'editable-card']).optional(),
        tabPosition: z.enum(['top', 'right', 'bottom', 'left']).optional(),
        items: z.array(z.object({
          key: z.string(),
          label: z.string(),
          disabled: z.boolean().optional(),
        })),
        onChange: z.string().optional(),
      }),
      slots: ['children'],
      description: 'Tab navigation component',
    },

    Breadcrumb: {
      props: z.object({
        items: z.array(z.object({
          title: z.string(),
          href: z.string().optional(),
          icon: z.string().optional(),
        })),
      }),
      description: 'Breadcrumb navigation',
    },

    // ==================== 其他 ====================
    TypographyTitle: {
      props: z.object({
        level: z.enum(['1', '2', '3', '4', '5']).optional(),
        children: z.string(),
      }),
      description: 'Typography title',
    },

    TypographyText: {
      props: z.object({
        type: z.enum(['secondary', 'success', 'warning', 'danger']).optional(),
        mark: z.boolean().optional(),
        code: z.boolean().optional(),
        keyboard: z.boolean().optional(),
        underline: z.boolean().optional(),
        delete: z.boolean().optional(),
        strong: z.boolean().optional(),
        italic: z.boolean().optional(),
        children: z.string(),
      }),
      description: 'Typography text',
    },

    Empty: {
      props: z.object({
        description: z.string().optional(),
        image: z.enum(['simple', 'default']).optional(),
      }),
      description: 'Empty state placeholder',
    },

    Image: {
      props: z.object({
        src: z.string(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        preview: z.boolean().optional(),
        fallback: z.string().optional(),
      }),
      description: 'Image display with preview',
    },
  },

  // 定义可用的 Actions
  actions: {
    submit: {
      description: 'Submit form data to server',
      parameters: z.object({
        url: z.string(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
      }),
    },
    navigate: {
      description: 'Navigate to a different page',
      parameters: z.object({
        path: z.string(),
        query: z.record(z.string()).optional(),
      }),
    },
    refresh: {
      description: 'Refresh current page or data',
      parameters: z.object({
        target: z.string().optional(),
      }),
    },
    openModal: {
      description: 'Open a modal dialog',
      parameters: z.object({
        modalId: z.string(),
      }),
    },
    closeModal: {
      description: 'Close current modal',
      parameters: z.object({
        modalId: z.string(),
      }),
    },
    showMessage: {
      description: 'Display a message notification',
      parameters: z.object({
        type: z.enum(['success', 'error', 'info', 'warning']),
        content: z.string(),
      }),
    },
    exportData: {
      description: 'Export data to file',
      parameters: z.object({
        format: z.enum(['csv', 'excel', 'pdf']),
        filename: z.string().optional(),
      }),
    },
    filter: {
      description: 'Filter data based on criteria',
      parameters: z.object({
        field: z.string(),
        operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains']),
        value: z.any(),
      }),
    },
  },
};

// 导出类型
export type AntdCatalog = typeof antdCatalogSchema;