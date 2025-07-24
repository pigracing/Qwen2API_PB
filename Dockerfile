FROM node:lts-alpine

# 全局安装PM2
#RUN npm install -g pm2

WORKDIR /app

# 复制package文件并安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 设置权限
RUN chmod 777 /app

# 创建日志目录
RUN mkdir -p logs

# 暴露端口（通过环境变量SERVICE_PORT控制）
EXPOSE 3000

# 使用PM2启动应用，并保持容器运行
CMD ["npm", "start"]