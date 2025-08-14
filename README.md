<div align="center">

# 🚀 Qwen-Proxy

[![Version](https://img.shields.io/badge/version-2025.07.24.12.00-blue.svg)](https://github.com/Rfym21/Qwen2API)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-supported-blue.svg)](https://hub.docker.com/r/rfym21/qwen2api)
[![Binary](https://img.shields.io/badge/Binary-Available-orange.svg)](https://github.com/Rfym21/Qwen2API/releases)

[🔗 加入交流群](https://t.me/nodejs_project) | [📖 文档](#api-文档) | [🐳 Docker 部署](#docker-部署)

</div>

## 🛠️ 快速开始

### 环境要求

- Node.js 18+ (源码部署时需要)
- Docker (可选)
- Redis (可选，用于数据持久化)

> 💡 **提示**: 如果使用二进制文件部署，无需安装 Node.js 环境

### ⚙️ 环境配置

创建 `.env` 文件并配置以下参数：

```bash
# 🌐 服务配置
API_PREFIX=                    # API 路径前缀 (可选)
LISTEN_ADDRESS=localhost       # 监听地址
SERVICE_PORT=3000             # 服务端口

# 🔐 安全配置
API_KEY=sk-123456             # API 密钥 (必填)
ACCOUNTS=                     # 账户配置 (格式: user1:pass1,user2:pass2)

# 🚀 PM2 多进程配置
PM2_INSTANCES=1               # PM2进程数量 (1/数字/max)
PM2_MAX_MEMORY=1G             # PM2内存限制 (100M/1G/2G等)
                              # 注意: PM2集群模式下所有进程共用同一个端口

# 🔍 功能配置
SEARCH_INFO_MODE=table        # 搜索信息展示模式 (table/text)
OUTPUT_THINK=true             # 是否输出思考过程 (true/false)

# 🗄️ 数据存储
DATA_SAVE_MODE=none           # 数据保存模式 (none/file/redis)
REDIS_URL=                    # Redis 连接地址 (可选)
```

#### 📋 配置说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `API_PREFIX` | API 路径前缀，不填则为根路径 | `/api` → `http://localhost:3000/api` |
| `LISTEN_ADDRESS` | 服务监听地址 | `localhost` 或 `0.0.0.0` |
| `SERVICE_PORT` | 服务运行端口 | `3000` |
| `API_KEY` | API 访问密钥 (必填) | `sk-your-secret-key` |
| `PM2_INSTANCES` | PM2进程数量 | `1`/`4`/`max` |
| `PM2_MAX_MEMORY` | PM2内存限制 | `100M`/`1G`/`2G` |
| `SEARCH_INFO_MODE` | 搜索结果展示格式 | `table` 或 `text` |
| `OUTPUT_THINK` | 是否显示 AI 思考过程 | `true` 或 `false` |
| `DATA_SAVE_MODE` | 数据持久化方式 | `none`/`file`/`redis` |
| `REDIS_URL` | Redis 数据库连接 | `redis://localhost:6379` |
| `LOG_LEVEL` | 日志级别 | `DEBUG`/`INFO`/`WARN`/`ERROR` |
| `ENABLE_FILE_LOG` | 是否启用文件日志 | `true` 或 `false` |
| `LOG_DIR` | 日志文件目录 | `./logs` |
| `MAX_LOG_FILE_SIZE` | 最大日志文件大小(MB) | `10` |
| `MAX_LOG_FILES` | 保留的日志文件数量 | `5` |

> 💡 **提示**: 可以在 [Upstash](https://upstash.com/) 免费创建 Redis 实例，使用 TLS 协议时地址格式为 `rediss://...`

<div>
<img src="./docs/images/upstash.png" alt="Upstash Redis" width="600">
</div>

---

## 🚀 部署方式

### 🐳 Docker 部署

#### 方式一：直接运行

```bash
docker run -d \
  -p 3000:3000 \
  -e API_KEY=sk-your-secret-key \
  -e DATA_SAVE_MODE=none \
  -e ACCOUNTS= \
  --name qwen2api \
  rfym21/qwen2api:latest
```

#### 方式二：Docker Compose

```bash
# 下载配置文件
curl -o docker-compose.yml https://raw.githubusercontent.com/Rfym21/Qwen2API/refs/heads/main/docker-compose.yml

# 启动服务
docker compose pull && docker compose up -d
```

### 📦 本地部署

```bash
# 克隆项目
git clone https://github.com/Rfym21/Qwen2API.git
cd Qwen2API

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 智能启动 (推荐 - 自动判断单进程/多进程)
npm start

# 开发模式
npm run dev
```

### 🚀 PM2 多进程部署

使用 PM2 进行生产环境多进程部署，提供更好的性能和稳定性。

**重要说明**: PM2 集群模式下，所有进程共用同一个端口，PM2 会自动进行负载均衡。

### 🤖 智能启动模式

使用 `npm start` 可以自动判断启动方式：

- 当 `PM2_INSTANCES=1` 时，使用单进程模式
- 当 `PM2_INSTANCES>1` 时，使用 Node.js 集群模式
- 自动限制进程数不超过 CPU 核心数

### ☁️ Hugging Face 部署

快速部署到 Hugging Face Spaces：

[![Deploy to Hugging Face](https://img.shields.io/badge/🤗%20Hugging%20Face-Deploy-yellow)](https://huggingface.co/spaces/devme/q2waepnilm)

<div>
<img src="./docs/images/hf.png" alt="Hugging Face Deployment" width="600">
</div>

---

## 📁 项目结构

```
Qwen2API/
├── Dockerfile
├── README.md
├── docker-compose.yml
├── docker-compose-redis.yml
├── ecosystem.config.js              # PM2配置文件
├── package.json
│
├── caches/                          # 缓存文件目录
├── data/                            # 数据文件目录
│   └── data.json
│
├── src/                             # 后端源代码目录
│   ├── server.js                    # 主服务器文件
│   ├── start.js                     # 智能启动脚本 (自动判断单进程/多进程)
│   ├── config/
│   │   └── index.js                 # 配置文件
│   ├── controllers/                 # 控制器目录
│   │   ├── chat.js
│   │   ├── chat-optimized.js        # 优化版聊天控制器
│   │   └── models.js
│   ├── middlewares/                 # 中间件目录
│   │   ├── authorization.js
│   │   └── chat-middleware.js
│   ├── models/                      # 模型目录
│   │   └── models-map.js
│   ├── routes/                      # 路由目录
│   │   ├── accounts.js
│   │   ├── chat.js
│   │   ├── models.js
│   │   ├── settings.js
│   │   └── verify.js
│   └── utils/                       # 工具函数目录
│       ├── account-rotator.js
│       ├── account.js
│       ├── chat-helpers.js
│       ├── data-persistence.js
│       ├── img-caches.js
│       ├── logger.js                # 日志工具
│       ├── model-utils.js
│       ├── redis.js
│       ├── request.js
│       ├── setting.js
│       ├── token-manager.js
│       ├── tools.js
│       └── upload.js
│
└── public/                          # 前端项目目录
    └── dist/                        # 编译后的前端文件
```

## 📖 API 文档

### 🔍 获取模型列表

获取所有可用的 AI 模型列表。

```http
GET /v1/models
Authorization: Bearer sk-your-api-key
```

```http
GET /models (免认证)
```

**响应示例:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen-max-latest",
      "object": "model",
      "created": 1677610602,
      "owned_by": "qwen"
    }
  ]
}
```

### 💬 聊天对话

发送聊天消息并获取 AI 回复。

```http
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer sk-your-api-key
```

**请求体:**
```json
{
  "model": "qwen-max-latest",
  "messages": [
    {
      "role": "system",
      "content": "你是一个有用的助手。"
    },
    {
      "role": "user",
      "content": "你好，请介绍一下自己。"
    }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 2000
}
```

**响应示例:**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "qwen-max-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！我是一个AI助手..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 50,
    "total_tokens": 70
  }
}
```

### 🎯 高级功能

#### 🔍 智能搜索模式

在模型名称后添加 `-search` 后缀启用搜索功能：

```json
{
  "model": "qwen-max-latest-search",
  "messages": [...]
}
```

#### 🧠 推理模式

在模型名称后添加 `-thinking` 后缀启用思考过程输出：

```json
{
  "model": "qwen-max-latest-thinking",
  "messages": [...]
}
```

#### 🔍🧠 组合模式

同时启用搜索和推理功能：

```json
{
  "model": "qwen-max-latest-thinking-search",
  "messages": [...]
}
```

#### 🖼️ 多模态支持

API 自动处理图像上传，支持在对话中发送图片：

```json
{
  "model": "qwen-max-latest",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "这张图片里有什么？"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,..."
          }
        }
      ]
    }
  ]
}
```

### 🖥️ CLI 端点

CLI 端点支持使用 `qwen3-coder-plus` 256K上下文, tools_use

#### 💬 CLI 聊天对话

通过 CLI 端点发送聊天请求，支持流式和非流式响应。

```http
POST /cli/v1/chat/completions
Content-Type: application/json
Authorization: Bearer API_KEY
```

**请求体:**
```json
{
  "model": "qwen-max-latest",
  "messages": [
    {
      "role": "user",
      "content": "你好，请介绍一下自己。"
    }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 2000
}
```

**流式请求:**
```json
{
  "model": "qwen-max-latest",
  "messages": [
    {
      "role": "user",
      "content": "写一首关于春天的诗。"
    }
  ],
  "stream": true
}
```

**响应格式:**

非流式响应与标准 OpenAI API 格式相同：
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "qwen-max-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！我是一个AI助手..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 50,
    "total_tokens": 70
  }
}
```

流式响应使用 Server-Sent Events (SSE) 格式：
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"qwen-max-latest","choices":[{"index":0,"delta":{"content":"你好"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"qwen-max-latest","choices":[{"index":0,"delta":{"content":"！"},"finish_reason":null}]}

data: [DONE]
```
