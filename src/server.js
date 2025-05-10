// server.js
const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config.js');
const cors = require('cors');
const app = express();
const path = require('path');
const fs = require('fs');
const { getDefaultHeaders, getDefaultCookie } = require('./lib/setting');

// 引入路由
const modelsRouter = require('./router/models.js');
const chatRouter = require('./router/chat.js');
const imagesRouter = require('./router/images.js');
const verifyRouter = require('./router/verify.js');
const accountsRouter = require('./router/accounts.js');
const settingsRouter = require('./router/settings.js');
const fileUploadRouter = require('./router/file_upload.js');

const dataDirPath = path.join(__dirname, '../data');
const dataFilePath = path.join(dataDirPath, 'data.json');

// 如果配置为文件存储模式，则检查并创建数据目录和文件
if (config.dataSaveMode === 'file') {
  if (!fs.existsSync(dataDirPath)) {
    try {
      fs.mkdirSync(dataDirPath, { recursive: true }); // 确保父目录存在
      console.log(`[信息] 数据目录创建成功: ${dataDirPath}`);
    } catch (err) {
      console.error(`[错误] 创建数据目录失败: ${dataDirPath}`, err);
    }
  }
  if (fs.existsSync(dataDirPath) && !fs.existsSync(dataFilePath)) {
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify({ "defaultHeaders": null, "defaultCookie": null, "accounts": [] }, null, 2));
      console.log(`[信息] 数据文件创建成功: ${dataFilePath}`);
    } catch (err) {
      console.error(`[错误] 创建数据文件失败: ${dataFilePath}`, err);
    }
  }
}

app.use(bodyParser.json({ limit: '128mb' }));
app.use(bodyParser.urlencoded({ limit: '128mb', extended: true }));
app.use(cors());

// API路由
app.use(modelsRouter);
app.use(chatRouter);
app.use(imagesRouter);
app.use(verifyRouter);
app.use('/api', accountsRouter);
app.use('/api', settingsRouter);
app.use(fileUploadRouter);

// 静态文件服务 (管理页面)
const publicDistPath = path.join(__dirname, '../public/dist');
console.log(`[信息] 尝试服务静态文件路径: ${publicDistPath}`);

if (fs.existsSync(publicDistPath)) {
  console.log(`[信息] 管理页面静态文件目录找到: ${publicDistPath}`);
  app.use(express.static(publicDistPath)); // 服务 public/dist 目录

  // SPA 回退路由：对于非 API 的 GET 请求，返回 index.html
  // 需要放在所有 API 路由之后
  app.get('*', (req, res, next) => {
    if (req.path.startsWith(config.apiPrefix || '/v1/') || req.path.startsWith('/api/')) {
      return next(); // API 请求，交由后续路由处理或404
    }
    res.sendFile(path.join(publicDistPath, 'index.html'), (err) => {
      if (err) {
        console.error("[错误] 发送管理页面 index.html 失败:", err);
        if (!res.headersSent) {
          res.status(500).send('服务器内部错误，无法加载管理页面。');
        }
      }
    });
  });
} else {
  console.warn(`[警告] public/dist 目录不存在，管理页面可能无法访问。计算路径: ${publicDistPath}`);
  app.get('/', (req, res) => { // 根路径提示
    res.send('Qwen API服务正在运行。管理页面未找到。');
  });
}

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error("全局错误处理器捕获到错误:", err.stack);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).send('服务器内部错误');
});

// 初始化配置 (如默认请求头和 Cookie)
const initConfig = async () => {
  try {
    config.defaultHeaders = await getDefaultHeaders();
    config.defaultCookie = await getDefaultCookie();
  } catch (error) {
    console.error("初始化配置失败:", error);
  }
};

initConfig().then(() => {
  const listenAddress = config.listenAddress || 'localhost';
  const listenPort = config.listenPort;
  const startInfo = `
-------------------------------------------------------------------
监听地址：${listenAddress}
服务端口：${listenPort}
API 主机: http://${listenAddress === '0.0.0.0' ? 'localhost' : listenAddress}:${listenPort} (从容器外部访问请使用正确的IP或域名)
接口路径：${config.apiPrefix || '/v1'} (例如: ${config.apiPrefix || '/v1'}/chat/completions, ${config.apiPrefix || '/v1'}/files/upload)
管理接口路径: /api (例如: /api/settings)
思考输出：${config.outThink ? '开启' : '关闭'}
搜索显示：${config.searchInfoMode === 'table' ? '表格' : '文本'}
数据保存模式：${config.dataSaveMode}
开源地址：https://github.com/Rfym21/Qwen2API
Tips：如果你是因为报错而来看日志的，那么建议看看下面几条：
1. 在环境变量中添加了账号但是启动失败，或无法获取到账号
     - 在 2025.04.29.17.00 之后的版本，将不再支持将账号写入环境变量，请在运行成功后打开管理页面添加账号！！！
2. 启动后发生聊天请求崩溃：
     - 请检查是否在面板中添加了账号，如果没有添加，可能会报错！！！
3. 如果你有还有是有问题可以加电报群：
     - https://t.me/nodejs_project (此为示例，非真实群组)
-------------------------------------------------------------------
`;
  app.listen(listenPort, listenAddress, () => {
    console.log(startInfo);
  });
}).catch(err => {
    console.error("服务启动失败:", err);
});
