const axios = require('axios')
const uuid = require('uuid')
const accountManager = require('./account.js')
const { sleep } = require('./tools.js')

const sendChatRequest = async (body) => {

  if (accountManager) {
    const models = await accountManager.getModels()
    if (!models.includes(body.model)) {
      body.model = 'qwen3-235b-a22b'
    }
  }

  try {
    // console.log(JSON.stringify(body))
    const response = await axios.post('https://chat.qwen.ai/api/chat/completions',
      body,
      {
        headers: accountManager.getHeaders(),
        responseType: body.stream ? 'stream' : 'json'
      }
    )

    return {
      status: 200,
      response: response.data
    }
  }
  catch (error) {
    console.log("发送请求失败:", error.status || error.response.status || error.code)
    if (error.status === 429 || error.response.status === 429 || error.code === 429) {
      await sleep(1000)
      return sendChatRequest(body)
    }
    // process.exit(0)
    return {
      status: 500,
      response: null
    }
  }

}

module.exports = {
  sendChatRequest
}
