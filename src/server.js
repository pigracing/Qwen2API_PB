const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const dotenv = require('dotenv')
dotenv.config()

const modelsRouter = require('./router/models.js')
const chatRouter = require('./router/chat.js')
const imagesRouter = require('./router/images.js')
const verifyRouter = require('./router/verify.js')

app.use(bodyParser.json({ limit: '128mb' }))
app.use(bodyParser.urlencoded({ limit: '128mb', extended: true }))
app.use(modelsRouter)
app.use(chatRouter)
app.use(imagesRouter)
app.use(verifyRouter)

const startInfo = `
-------------------------------------------------------------------
监听地址：${process.env.LISTEN_ADDRESS ? process.env.LISTEN_ADDRESS : 'localhost'}
服务端口：${process.env.SERVICE_PORT}
API路径：${process.env.API_PREFIX ? process.env.API_PREFIX : '未设置'}
-------------------------------------------------------------------
`
if (process.env.LISTEN_ADDRESS) {
  app.listen(process.env.SERVICE_PORT || 3000, process.env.LISTEN_ADDRESS, () => {
    console.log(startInfo)
  })
} else {
  app.listen(process.env.SERVICE_PORT || 3000, () => {
    console.log(startInfo)
  })
}

