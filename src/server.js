const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config/index.js')
const cors = require('cors')
const app = express()
const path = require('path')
const fs = require('fs')
const modelsRouter = require('./routes/models.js')
const chatRouter = require('./routes/chat.js')
const verifyRouter = require('./routes/verify.js')
const accountsRouter = require('./routes/accounts.js')
const settingsRouter = require('./routes/settings.js')

if (config.dataSaveMode === 'file') {
  if (!fs.existsSync(path.join(__dirname, '../data/data.json'))) {
    fs.writeFileSync(path.join(__dirname, '../data/data.json'), JSON.stringify({"accounts": [] }, null, 2))
  }
}

app.use(bodyParser.json({ limit: '128mb' }))
app.use(bodyParser.urlencoded({ limit: '128mb', extended: true }))
app.use(cors())
// 处理错误中间件
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('服务器内部错误')
})
// API路由
app.use(modelsRouter)
app.use(chatRouter)
app.use(verifyRouter)
app.use('/api', accountsRouter)
app.use('/api', settingsRouter)

app.use(express.static(path.join(__dirname, '../public/dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dist/index.html'), (err) => {
    if (err) {
      console.error("管理页面加载失败", err)
      res.status(500).send('服务器内部错误')
    }
  })
})


const startInfo = `
-------------------------------------------------------------------
监听地址：${process.env.LISTEN_ADDRESS ? process.env.LISTEN_ADDRESS : 'localhost'}
服务端口：${config.listenPort}
接口路径：${config.apiPrefix ? config.apiPrefix : '未设置'}
思考输出：${config.outThink ? '开启' : '关闭'}
搜索显示：${config.searchInfoMode === 'table' ? '表格' : '文本'}
数据保存模式：${config.dataSaveMode}
开源地址：https://github.com/Rfym21/Qwen2API
电报群聊：https://t.me/nodejs_project
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