# JSON Render Demo

🚀 **在线演示**: https://pkubuntu.github.io/json-render-demo/

## 简介

这是一个展示 **JSON Render** 核心能力的演示项目，灵感来自 Vercel 的 [json-render](https://github.com/vercel-labs/json-render)。

## 核心能力

### 1. Schema 约束 AI 输出

AI 只能生成 Catalog 中定义的组件，输出完全可控：

```typescript
// 定义允许的组件
Button: {
  props: z.object({
    type: z.enum(['primary', 'default', 'dashed', 'text', 'link']),
    children: z.string(),
  })
}
```

### 2. JSON → UI 渲染

JSON Schema 动态渲染为真实的 antd 组件：

```json
{
  "type": "Card",
  "props": { "title": "Dashboard" },
  "children": [
    { "type": "Button", "props": { "type": "primary", "children": "Submit" } }
  ]
}
```

### 3. JSON → Code 生成

自动将 JSON Schema 转换为可用的 React 源代码。

### 4. 双向同步潜力

JSON 作为中间格式，可连接：
- Figma ↔ JSON ↔ Code

## 技术栈

- React 19
- Vite
- Ant Design 6
- TypeScript
- Zod (Schema validation)

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── catalog/
│   └── antd-catalog.ts      # 组件目录定义 (Zod Schema)
├── components/
│   └── JsonRenderer.tsx     # JSON → antd 渲染器
├── examples/
│   └── dashboard.json       # 示例 JSON Schema
└── App.tsx                  # 主应用
```

## 对比 v0.dev

| 维度 | v0.dev | json-render + antd |
|------|--------|-------------------|
| 输出可控性 | 自由生成 | Schema 强约束 |
| 设计源 | 无 | 可连接 Figma |
| 双向同步 | 不支持 | 完整支持 |
| 组件规范 | Tailwind/shadcn | antd 企业级 |
| 适用场景 | C端/原型 | 中后台/企业级 |

## License

MIT