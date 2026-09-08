# OpenCode Proxy

Cloudflare Worker 代理服务，解决 OpenCode API 的 `x-opencode-session` 问题。

## 背景

OpenCode API 要求每个请求携带 `x-opencode-session` 头来维持会话状态，但直接调用 API 时：

- 客户端需要自行管理 session ID 的生成和传递
- 浏览器直接请求会遇到 CORS 跨域限制
- 多设备/多窗口切换时 session 容易混乱

本项目通过 Cloudflare Worker 代理转发，**自动生成并管理 session**，客户端无需关心 session 维护细节。

## OpenCode API 使用规范

> 以下规范来自 OpenCode 官方，使用本代理时请遵守。

- **User-Agent** — 本代理已设置 `opencode-proxy/1.0` 作为 User-Agent，符合官方要求（不使用通用 SDK/HTTP 库名称）
- **Session 稳定性** — 为每段对话保持稳定的 `x-opencode-session`，以便上游优化路由和提示词缓存
- **流量合规** — 发送典型的编程 Agent 流量，避免滥用行为

## 功能

- **自动 session 管理** — 未传 `x-opencode-session` 时自动生成 UUID，传了则原样透传
- **自定义 User-Agent** — 设置为 `opencode-proxy/1.0`，满足上游 API 的身份识别要求
- **CORS 跨域支持** — `Access-Control-Allow-Origin: *`
- **路径透明代理** — `/v1/*` → `https://opencode.ai/zen/go/v1/*`
- **兼容路径** — `/compat/v1/*` 同样映射到上游 API
- **健康检查** — `GET /` 或 `GET /health`

## 快速开始

### 前提条件

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare 账号](https://dash.cloudflare.com/)
- OpenCode API Key

### 部署

```bash
git clone https://github.com/your-username/opencode-proxy.git
cd opencode-proxy
npm install

# 登录 Cloudflare
npx wrangler login

# 设置 API Key（交互式输入）
npx wrangler secret put OPENCODE_API_KEY

# 部署
npx wrangler deploy
```

### 使用方式

```bash
# 自动 session（代理自动生成）
curl https://your-worker.workers.dev/v1/models

# 自定义 session
curl -H "x-opencode-session: my-session-id" https://your-worker.workers.dev/v1/models

# Chat completions
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"minimax-m3","messages":[{"role":"user","content":"hello"}]}'
```

## Session 工作原理

```
客户端                    Worker                    OpenCode API
  │                         │                          │
  │  请求（无 session）      │                          │
  │ ──────────────────────> │                          │
  │                         │  自动生成 session ID      │
  │                         │ ───────────────────────> │
  │                         │                          │
  │  请求（带 session）      │                          │
  │ ──────────────────────> │  原样透传                 │
  │                         │ ───────────────────────> │
  │                         │                          │
```

- 客户端不传 `x-opencode-session` → Worker 自动生成 UUID 并在响应中返回
- 客户端传了 `x-opencode-session` → Worker 原样透传给上游
- 下一次请求带上上次返回的 session 即可维持会话

## API 路由

| 路径 | 说明 |
|------|------|
| `GET /` | 健康检查 |
| `GET /health` | 健康检查 |
| `OPTIONS *` | CORS 预检请求 |
| `/v1/*` | 代理到 `https://opencode.ai/zen/go/v1/*` |
| `/compat/v1/*` | 同上，兼容路径 |

## 环境变量

| 变量 | 类型 | 说明 |
|------|------|------|
| `OPENCODE_API_KEY` | Secret | OpenCode API 密钥（必需） |

## 技术栈

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## License

MIT
