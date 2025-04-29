# Qwen2API

Qwen2API 是一个基于 Node.js 的 API 服务，提供聊天模型的接口以及图像上传功能。

## 配置文件

### .env 文件

```plaintext
    API_PREFIX=
    LISTEN_ADDRESS=0.0.0.0
    SERVICE_PORT=3000
    API_KEY=sk-123456
    ACCOUNT_TOKENS=
    SEARCH_INFO_MODE=table
    OUTPUT_THINK=true
    REDIS_URL=
```

---

- API_PREFIX: 服务路径
    > API 路径，不填则为空(<http://localhost:3000>)

    > 示例(/api) 则访问 <http://localhost:3000/api>
- LISTEN_ADDRESS: 监听地址
    > 监听地址，不填则为 localhost
- SERVICE_PORT: 服务运行端口
    > 如果需要修改Docker暴露端口，请修改ports中的参数

    >示例(8080:3000) 则访问 <http://localhost:8080>
- API_KEY: 密钥
    > API 密钥 (必填)
- SEARCH_INFO_MODE: 搜索信息展示模式
    > 搜索信息展示模式，可选 table 或 text

    > 示例：table
- OUTPUT_THINK: 是否输出思考过程
    > 是否输出思考过程，可选 true 或 false

    > 示例：true
- REDIS_URL: 运行模式
    > redis地址，必填（可在Upstash免费创建一个）
    ![upstash](./docs/images/upstash.png)

---

## 安装与运行

### 先决条件

确保您已安装以下软件：

- [Docker](https://www.docker.com/)（可选）

---

### 使用 Docker 运行

1. 使用 Docker 命令：

   ```bash
   docker run -d -p 3000:3000 -e API_KEY=sk-123456 -e REDIS_URL=redis-cli --tls -u redis://... --name qwen2api rfym21/qwen2api:latest
   ```

2. 使用 docker-compose 运行服务：

   ```bash
   curl -o docker-compose.yml https://raw.githubusercontent.com/Rfym21/Qwen2API/refs/heads/main/docker-compose.yml
   docker compose pull && docker compose up -d
   ```

---

### 复制 Hugging Face 空间

- [Qwen2API](https://huggingface.co/spaces/devme/q2waepnilm)

---

## API 端点

---

### 获取模型列表

- **请求方式**: `GET`
- **URL**: `/v1/models`
- **Headers**:
  - `Authorization`: 提供有效的授权令牌(可选)

---

### 聊天完成

- **请求方式**: `POST`
- **URL**: `/v1/chat/completions`
- **Headers**:
  - `Authorization`: 必须提供有效的授权令牌。
- **请求体**:

  ```json
  {
    "model": "模型名称",
    "messages": [
      {
        "role": "user",
        "content": "用户消息"
      }
    ],
    "stream": false
  }
  ```

---

### 生成图像(暂时失效)

- **请求方式**: `POST`
- **URL**: `/v1/images/generations`
- **Headers**:
  - `Authorization`: 必须提供有效的授权令牌。
- **请求体**:

  ```json
  {
    "model": "模型名称",
    "prompt": "用户消息",
    "n": 1,
    "size": "1024*1024"
  }
  ```

---

### 上传图像

在发送聊天消息时，如果消息包含图像，API 会自动处理图像上传。

### 模型启用推理或搜索

- 在模型名后添加"-search"启用搜索

  > 示例：qwen-max-latest-search

- 在模型名后添加"-thinking"启用推理

  > 示例：qwen-max-latest-thinking

- 在模型名后添加"-thinking-search"启用推理和搜索

  > 示例：qwen-max-latest-thinking-search

- 在模型名后添加"-draw"启用图像生成(暂时失效)

  > 示例：qwen-max-latest-draw
>
### 更新问题

> 如果长时间没有更新，大概率是没人点 Star 没人提 Issues 了
