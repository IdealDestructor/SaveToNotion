# url2notion

一键提取网页内容，经 AI 整理后保存到 Notion。

## 功能

- 输入 URL，自动抓取网页正文
- 支持 OpenAI / Anthropic（Claude）两种 AI 提供商
- AI 自动整理为结构清晰的 Markdown 笔记
- 一键保存到 Notion，支持选择目标页面
- 预览功能，确认后再保存
- 自定义 AI 提示词

## 快速开始

### 前置要求

- Node.js >= 18
- Notion API Key（[创建集成](https://www.notion.so/my-integrations)）
- OpenAI API Key 或 Anthropic API Key

### 安装

```bash
git clone https://github.com/IdealDestructor/url2notion.git
cd url2notion
npm install
```

### 配置

复制环境变量文件并填入配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
NOTION_API_KEY=nt_xxxxx
NOTION_VERSION=2022-06-28
PORT=3000
AI_PROVIDER=openai
AI_MODEL=gpt-4o
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-xxxxx
EXTRA_PROMPT=
```

> 你也可以在 Web UI 的「设置」页面中完成所有配置。

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
{ "url": "https://example.com", "parentId": "", "note": "备注", "promptOverride": "" }
```

### `POST /api/extract/preview`

预览 AI 处理结果（不保存）。

```json
{ "url": "https://example.com", "promptOverride": "" }
```

### `GET /api/settings`

获取当前设置。

### `PUT /api/settings`

更新设置。

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
