<div align="center">

# 🚀 Qwen-Proxy

[![Version](https://img.shields.io/badge/version-2025.07.24.12.00-blue.svg)](https://github.com/Rfym21/Qwen2API)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-supported-blue.svg)](https://hub.docker.com/r/rfym21/qwen2api)

[🔗 加入交流群](https://t.me/nodejs_project) | [📖 文档](#api-文档) | [🐳 Docker 部署](#docker-部署)

</div>

## 🛠️ 快速开始

### 环境要求

- Node.js 18+
- Docker (可选)
- Redis (可选，用于数据持久化)

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

# 启动服务
npm start

# 开发模式
npm run dev
```

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
├── package.json
│
├── caches/                          # 缓存文件目录
├── data/                            # 数据文件目录
│   └── data.json
│
├── docs/                            # 文档目录
│   └── images/
│
├── src/                             # 后端源代码目录
│   ├── server.js                    # 主服务器文件
│   ├── config/
│   │   └── index.js                 # 配置文件
│   ├── controllers/                 # 控制器目录
│   │   ├── chat.js
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
│       ├── model-utils.js
│       ├── redis.js
│       ├── request.js
│       ├── setting.js
│       ├── token-manager.js
│       ├── tools.js
│       └── upload.js
│
└── public/                          # 前端项目目录
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── dist/                        # 构建输出目录
    ├── src/                         # 前端源代码目录
    │   ├── App.vue                  # 主应用组件
    │   ├── main.js                  # 入口文件
    │   ├── style.css                # 样式文件
    │   ├── assets/
    │   ├── routes/
    │   │   └── index.js             # 路由配置
    │   └── views/                   # 视图组件目录
    │       ├── auth.vue
    │       ├── dashboard.vue
    │       └── settings.vue
    └── public/
        └── favicon.png
```

## 📖 API 文档

### 🔍 获取模型列表

获取所有可用的 AI 模型列表。

```http
GET /v1/models
Authorization: Bearer sk-your-api-key
```

```http
GET /v1/models (免认证)
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
