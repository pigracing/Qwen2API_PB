const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config.js')
const cors = require('cors')
const app = express()
const path = require('path')
const { getDefaultHeaders, getDefaultCookie } = require('./lib/setting')
const modelsRouter = require('./router/models.js')
const chatRouter = require('./router/chat.js')
const imagesRouter = require('./router/images.js')
const verifyRouter = require('./router/verify.js')
const accountsRouter = require('./router/accounts.js')
const settingsRouter = require('./router/settings.js')

app.use(bodyParser.json({ limit: '128mb' }))
app.use(bodyParser.urlencoded({ limit: '128mb', extended: true }))
app.use(cors())
// API路由
app.use(modelsRouter)
app.use(chatRouter)
app.use(imagesRouter)
app.use(verifyRouter)
app.use('/api', accountsRouter)
app.use('/api', settingsRouter)

app.use(express.static(path.join(__dirname, '../public/client')))
app.get('*', (req, res) => {
  // 确保发送的是 public 目录下的 index.html
  res.sendFile(path.join(__dirname, '../public/client/index.html'), (err) => {
    if (err) {
      console.error("管理页面加载失败", err)
      res.status(500).send('服务器内部错误')
    }
  })
})

const initConfig = async () => {
  config.defaultHeaders = await getDefaultHeaders()
  config.defaultCookie = await getDefaultCookie()
}

initConfig()

const startInfo = `
-------------------------------------------------------------------
监听地址：${process.env.LISTEN_ADDRESS ? process.env.LISTEN_ADDRESS : 'localhost'}
服务端口：${config.listenPort}
接口路径：${config.apiPrefix ? config.apiPrefix : '未设置'}
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
     - https://t.me/nodejs_project
-------------------------------------------------------------------
`
if (config.listenAddress) {
  app.listen(config.listenPort, config.listenAddress, () => {
    console.log(startInfo)
  })
} else {
  app.listen(config.listenPort, () => {
    console.log(startInfo)
  })
}

