# OpenCode Proxy

Cloudflare Worker 代理服务，转发请求到 [OpenCode](https://opencode.ai) API，解决跨域问题。

## 功能

- 代理所有 OpenCode API 请求（`/v1/*`）
- 自动生成 session ID（可通过 `x-opencode-session` 头自定义）
- CORS 支持（`Access-Control-Allow-Origin: *`）
- `/compat/*` 路径自动映射到上游 `/v1/*`

## 快速开始

### 前提条件

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare 账号](https://dash.cloudflare.com/)
- OpenCode API Key

### 安装

```bash
git clone https://github.com/your-username/opencode-proxy.git
cd opencode-proxy
npm install
```

### 配置

1. 登录 Cloudflare：

```bash
npx wrangler login
```

2. 设置 API Key 为 Cloudflare Secret：

```bash
npx wrangler secret put OPENCODE_API_KEY
```

3. 部署：

```bash
npx wrangler deploy
```

### 本地开发

```bash
# 创建本地环境变量文件
cp .env.example .dev.vars
# 编辑 .dev.vars，填入你的 OPENCODE_API_KEY

# 启动本地开发服务器
npx wrangler dev
```

> 注意：workerd 在某些 Windows 环境下可能无法正常启动（缺少 VC++ 运行时）。

## API 路由

| 路径 | 说明 |
|------|------|
| `GET /` | 健康检查 |
| `GET /health` | 健康检查 |
| `OPTIONS *` | CORS 预检请求 |
| `/v1/*` | 代理到 `https://opencode.ai/zen/go/v1/*` |
| `/compat/v1/*` | 同上，兼容路径 |

## 请求示例

```bash
# 获取模型列表
curl https://your-worker.workers.dev/v1/models

# 使用自定义 session
curl -H "x-opencode-session: my-session" https://your-worker.workers.dev/v1/models

# Chat completions
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"minimax-m3","messages":[{"role":"user","content":"hello"}]}'
```

## 环境变量

| 变量 | 类型 | 说明 |
|------|------|------|
| `OPENCODE_API_KEY` | Secret | OpenCode API 密钥（必需） |

## 技术栈

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## License

MIT
