const axios = require('axios')
const config = require('../config.js')
const accountManager = require('./account.js')
const { sleep } = require('./tools.js')

const sendChatRequest = async (body) => {

  try {
    const response = await axios.post('https://chat.qwen.ai/api/chat/completions',
      body,
      {
        headers: {
          'Authorization': `Bearer ${accountManager.getAccountToken()}`,
          'Content-Type': 'application/json',
          'Cookie': `ssxmod_itna=${config.ssxmodItna}`
        },
        responseType: body.stream ? 'stream' : 'json'
      }
    )

    return {
      status: 200,
      response: response.data
    }
  }catch (error) {
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
