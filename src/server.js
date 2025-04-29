const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config.js')
const app = express()

const modelsRouter = require('./router/models.js')
const chatRouter = require('./router/chat.js')
const imagesRouter = require('./router/images.js')
const verifyRouter = require('./router/verify.js')
const infoRouter = require('./router/info.js')
app.use(bodyParser.json({ limit: '128mb' }))
app.use(bodyParser.urlencoded({ limit: '128mb', extended: true }))
app.use(modelsRouter)
app.use(chatRouter)
app.use(imagesRouter)
app.use(verifyRouter)
app.use(infoRouter)
const startInfo = `
-------------------------------------------------------------------
监听地址：${process.env.LISTEN_ADDRESS ? process.env.LISTEN_ADDRESS : 'localhost'}
服务端口：${config.listenPort}
API路径：${config.apiPrefix ? config.apiPrefix : '未设置'}
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

