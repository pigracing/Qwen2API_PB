# 多阶段构建 - 构建阶段
FROM node:lts-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制根目录的 package 文件并安装后端依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制前端 package 文件并安装前端依赖
COPY public/package*.json ./public/
RUN cd public && npm ci && npm cache clean --force

# 复制所有源代码
COPY . .

# 构建前端应用
RUN cd public && npm run build

# 生产阶段
FROM node:lts-alpine AS production

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# 从构建阶段复制必要文件
COPY --from=builder --chown=nextjs:nodejs /app .

# 删除前端源码和 node_modules（保留构建产物）
RUN rm -rf public/src public/node_modules public/package*.json

# 创建日志目录并设置权限
RUN mkdir -p logs && \
    chown -R nextjs:nodejs /app && \
    chmod -R 755 /app

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]