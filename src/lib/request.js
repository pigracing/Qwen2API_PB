const axios = require('axios')
const uuid = require('uuid')
const accountManager = require('./account.js')
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
    console.log(123, error)
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
