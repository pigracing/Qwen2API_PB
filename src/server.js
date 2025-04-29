const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config.js')
const app = express()
const { getDefaultHeaders, getDefaultCookie } = require('./lib/setting')
const modelsRouter = require('./router/models.js')
const chatRouter = require('./router/chat.js')
const imagesRouter = require('./router/images.js')
const verifyRouter = require('./router/verify.js')
const infoRouter = require('./router/info.js')
const accountsRouter = require('./router/accounts.js')
const settingsRouter = require('./router/settings.js')

app.use(bodyParser.json({ limit: '128mb' }))
app.use(bodyParser.urlencoded({ limit: '128mb', extended: true }))

// API路由
app.use(modelsRouter)
app.use(chatRouter)
app.use(imagesRouter)
app.use(verifyRouter)
app.use(infoRouter)
app.use('/api', accountsRouter)
app.use('/api', settingsRouter)

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
开源地址：https://github.com/qwen2/Qwen2API
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

