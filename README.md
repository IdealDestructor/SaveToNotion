# SaveToNotion

一键提取网页内容，经 AI 整理后保存到 Notion。

## 在线预览

[notion.idealx.top](https://notion.idealx.top)

## 功能

- 输入 URL，自动抓取网页正文
- 支持 OpenAI / Anthropic（Claude）两种 AI 提供商
- AI 自动整理为结构清晰的 Markdown 笔记
- 保留图片、视频（含 YouTube / Bilibili 等外链）与 PDF，并尽量保持原文相对位置
- 支持「纯文本（无图）」模式，提取前可选
- 保存成功后提供可跳转的 Notion 页面链接
- 一键保存到 Notion，支持选择目标页面
- 预览功能，确认后再保存（预览中可看到图片）
- 中英双语与深浅色主题切换
- 自定义 AI 提示词

## 快速开始

### 前置要求

- Node.js >= 18
- Notion API Key（[创建集成](https://www.notion.so/my-integrations)）
- OpenAI API Key 或 Anthropic API Key

### 安装

```bash
git clone https://github.com/IdealDestructor/savetonotion.git
cd savetonotion
npm install
```

### 配置

配置（Notion / AI 密钥等）保存在**浏览器的 localStorage** 中，在「设置」页修改后会自动保存，无需服务端文件，也不会随仓库提交。

如需手动重置，在浏览器控制台执行 `localStorage.removeItem('savetonotion-settings')` 即可。

> 端口可用环境变量 `PORT` 覆盖（默认 3000）。

### 启动

```bash
npm start
```

打开浏览器访问 `http://localhost:3000`

### 开发模式

```bash
npm run dev
```

## API

### `POST /api/extract`

提取并保存网页到 Notion。

```json
{ "url": "https://example.com", "parentId": "", "promptOverride": "" }
```

### `POST /api/extract/preview`

预览 AI 处理结果（不保存）。

```json
{ "url": "https://example.com", "promptOverride": "" }
```

### `POST /api/settings/notion-pages`

获取 Notion 页面列表（树状，支持 `query` 搜索）。

```json
{ "notionApiKey": "...", "query": "", "parentId": "" }
```

### `POST /api/settings/test-notion`

校验 Notion 连接。

### `POST /api/settings/test-ai`

校验 AI 连接。

### `GET /api/health`

健康检查。

## 技术栈

- **后端**: Node.js, Express 5
- **内容抓取**: Axios, Cheerio, node-html-markdown
- **AI**: OpenAI API / Anthropic API
- **存储**: Notion API
- **前端**: 原生 HTML / CSS / JS（无框架）

## 开源协议

MIT
