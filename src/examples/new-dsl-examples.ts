/**
 * 新 DSL 格式示例
 * 展示 JR-AUI DSL 的新格式特性
 */

import { JsonSchema } from '../types/core';

// ==================== 示例 1: 基础用法（显式绑定）====================

export const basicExample: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Card",
    props: {
      title: { type: "const", value: "用户信息" },
      bordered: { type: "const", value: false }
    },
    children: [
      {
        type: "Space",
        props: {
          direction: { type: "const", value: "vertical" },
          size: { type: "const", value: "large" }
        },
        children: [
          {
            type: "TypographyText",
            props: {
              strong: { type: "const", value: true },
              children: { type: "const", value: "用户名：" }
            }
          },
          {
            type: "TypographyText",
            props: {
              children: { type: "state", path: "user.name" }
            }
          }
        ]
      },
      {
        type: "Button",
        props: {
          type: { type: "const", value: "primary" },
          children: { type: "const", value: "编辑" }
        },
        actions: [{ type: "editUser", payload: { userId: 123 } }],
        meta: { key: "edit-btn" }
      }
    ]
  },
  state: {
    user: {
      id: 123,
      name: "Alice",
      email: "alice@example.com"
    }
  }
};

// ==================== 示例 2: 节点级 Actions ====================

export const nodeActionsExample: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Space",
    props: { direction: { type: "const", value: "horizontal" }, size: { type: "const", value: "middle" } },
    children: [
      {
        type: "Button",
        props: {
          children: { type: "const", value: "提交" }
        },
        actions: [{ type: "submitForm", payload: { action: "create" } }],
        meta: { key: "submit-btn" }
      },
      {
        type: "Button",
        props: {
          children: { type: "const", value: "取消" }
        },
        actions: [{ type: "cancelForm" }],
        meta: { key: "cancel-btn" }
      }
    ]
  }
};

// ==================== 示例 3: 条件渲染 ====================

export const conditionalRenderExample: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Card",
    props: {
      title: { type: "const", value: "条件渲染示例" }
    },
    children: [
      {
        id: "admin-panel",
        type: "Button",
        props: {
          type: { type: "const", value: "primary" },
          children: { type: "const", value: "管理员面板" }
        },
        meta: {
          key: "admin-btn",
          visible: { type: "state", path: "user.isAdmin" } // 条件渲染
        },
        actions: [{ type: "openAdminPanel" }]
      },
      {
        id: "user-panel",
        type: "Button",
        props: {
          children: { type: "const", value: "用户面板" }
        },
        meta: {
          key: "user-btn",
          visible: { type: "state", path: "user.isRegularUser" }
        },
        actions: [{ type: "openUserPanel" }]
      }
    ]
  },
  state: {
    user: {
      isAdmin: true,
      isRegularUser: false
    }
  }
};

// ==================== 示例 4: 独立 Bindings ====================

export const bindingsExample: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Card",
    props: {
      title: { type: "const", value: "表单示例" }
    },
    children: [
      {
        type: "Form",
        props: {
          layout: { type: "const", value: "vertical" }
        },
        children: [
          {
            type: "Input",
            props: {
              placeholder: { type: "const", value: "用户名" }
            },
            bindings: {
              value: { type: "state", path: "form.username" },
              onChange: { type: "const", value: "updateUsername" }
            }
          },
          {
            type: "Input",
            props: {
              placeholder: { type: "const", value: "邮箱" }
            },
            bindings: {
              value: { type: "state", path: "form.email" }
            }
          },
          {
            type: "Button",
            props: {
              type: { type: "const", value: "primary" },
              children: { type: "const", value: "提交" }
            },
            actions: [{ type: "submitForm", payload: { formKey: "login" } }]
          }
        ]
      }
    ]
  },
  state: {
    form: {
      username: "",
      email: ""
    }
  }
};

// ==================== 示例 5: 列表渲染 ====================

export const listRenderExample: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Card",
    props: {
      title: { type: "const", value: "用户列表" }
    },
    children: [
      {
        type: "Table",
        props: {
          columns: { type: "const", value: [
            { title: "ID", dataIndex: "id", key: "id" },
            { title: "姓名", dataIndex: "name", key: "name" },
            { title: "邮箱", dataIndex: "email", key: "email" }
          ]},
          dataSource: { type: "state", path: "users" },
          rowKey: { type: "const", value: "id" }
        }
      }
    ]
  },
  state: {
    users: [
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" },
      { id: 3, name: "Charlie", email: "charlie@example.com" }
    ]
  }
};

// ==================== 示例 6: 复杂交互示例 ====================

export const complexInteractionExample: JsonSchema = {
  schemaVersion: "1.0.0",
  catalogVersion: "1.0.0",
  root: {
    type: "Space",
    props: { direction: { type: "const", value: "vertical" }, size: { type: "const", value: "large" } },
    children: [
      {
        type: "Card",
        props: {
          title: { type: "const", value: "购物车" }
        },
        children: [
          {
            type: "Table",
            props: {
              columns: { type: "const", value: [
                { title: "商品", dataIndex: "name", key: "name" },
                { title: "价格", dataIndex: "price", key: "price", render: { type: "const", value: "Tag" } },
                { title: "数量", dataIndex: "quantity", key: "quantity" },
                { title: "操作", key: "action" }
              ]},
              dataSource: { type: "state", path: "cart.items" },
              rowKey: { type: "const", value: "id" },
              pagination: { type: "const", value: false }
            }
          },
          {
            type: "Divider",
            props: {}
          },
          {
            type: "Space",
            props: {},
            children: [
              {
                type: "TypographyText",
                props: {
                  children: { type: "state", path: "cart.totalText" }
                }
              },
              {
                type: "Button",
                props: {
                  type: { type: "const", value: "primary" },
                  children: { type: "const", value: "结算" },
                  disabled: { type: "state", path: "cart.isEmpty" }
                },
                actions: [{ type: "checkout" }]
              },
              {
                type: "Button",
                props: {
                  children: { type: "const", value: "清空" }
                },
                actions: [{ type: "clearCart" }]
              }
            ]
          }
        ]
      }
    ]
  },
  state: {
    cart: {
      items: [
        { id: 1, name: "商品A", price: 100, quantity: 2 },
        { id: 2, name: "商品B", price: 200, quantity: 1 }
      ],
      totalText: "总计: ¥400",
      isEmpty: false
    }
  },
  meta: {
    generatedBy: "claude-ai",
    timestamp: 1715000000000,
    traceId: "trace-123"
  }
};

// ==================== 导出所有示例 ====================

export const newDslExamples = {
  basic: basicExample,
  nodeActions: nodeActionsExample,
  conditionalRender: conditionalRenderExample,
  bindings: bindingsExample,
  listRender: listRenderExample,
  complexInteraction: complexInteractionExample
};
