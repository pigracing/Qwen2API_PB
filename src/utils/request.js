const axios = require('axios')
const config = require('../config/index.js')
const accountManager = require('./account.js')
const { sleep } = require('./tools.js')

const sendChatRequest = async (body, retryCount = 0) => {
  const maxRetries = 2 // 最多重试2次

  try {
    const currentToken = accountManager.getAccountToken()
    const response = await axios.post('https://chat.qwen.ai/api/chat/completions',
      body,
      {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
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
    console.log("发送请求失败:", error.status || error.response?.status || error.code)
    
    if (error.status === 429 || error.response?.status === 429 || error.code === 429) {
      await sleep(1000)
      return sendChatRequest(body, retryCount)
    }

    if (error.status === 401 || error.response?.status === 401 || error.code === 401) {
      console.log("收到401错误，尝试刷新token...")
      
      if (retryCount < maxRetries) {
        try {
          // 获取当前使用的账户信息
          const currentIndex = accountManager.currentIndex === 0 ? 
            accountManager.accountTokens.length - 1 : accountManager.currentIndex - 1
          const currentAccount = accountManager.accountTokens[currentIndex]
          
          if (currentAccount) {
            console.log(`正在为账户 ${currentAccount.email} 刷新token...`)
            
            // 使用refreshSingleToken方法刷新token
            const refreshResult = await accountManager.refreshSingleToken(currentAccount)
            
            if (refreshResult) {
              console.log("token刷新成功，重新发起请求...")
              return sendChatRequest(body, retryCount + 1)
            } else {
              console.log("token刷新失败，尝试使用下一个账户...")
              // 如果刷新失败，尝试使用下一个token
              return sendChatRequest(body, retryCount + 1)
            }
          } else {
            console.log("无法找到当前账户信息")
            return {
              status: 401,
              response: { error: "无法找到当前账户信息进行token刷新" }
            }
          }
        } catch (refreshError) {
          console.error("刷新token时发生错误:", refreshError.message)
          
          if (retryCount < maxRetries) {
            console.log("尝试使用下一个账户...")
            return sendChatRequest(body, retryCount + 1)
          }
        }
      } else {
        console.log("已达到最大重试次数，返回401错误")
        return {
          status: 401,
          response: { error: "认证失败，已尝试刷新token但仍然无法通过验证" }
        }
      }
    }

    return {
      status: error.status || error.response?.status || 500,
      response: error.response?.data || { error: error.message }
    }
  }
}

module.exports = {
  sendChatRequest
}