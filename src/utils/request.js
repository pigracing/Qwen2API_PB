const axios = require('axios')
const config = require('../config/index.js')
const accountManager = require('./account.js')
const { logger } = require('./logger')


/**
 * 发送聊天请求
 * @param {Object} body - 请求体
 * @param {number} retryCount - 当前重试次数
 * @param {string} lastUsedEmail - 上次使用的邮箱（用于错误记录）
 * @returns {Promise<Object>} 响应结果
 */
const sendChatRequest = async (body) => {
    try {
        // 获取可用的令牌
        const currentToken = accountManager.getAccountToken()

        if (!currentToken) {
            logger.error('无法获取有效的访问令牌', 'TOKEN')
            return {
                status: false,
                response: null
            }
        }

        // 构建请求配置
        const requestConfig = {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...(config.ssxmodItna && { 'Cookie': `ssxmod_itna=${config.ssxmodItna}` })
            },
            responseType: body.stream ? 'stream' : 'json',
            timeout: 60 * 1000,
        }

        // console.log(body)
        // console.log(requestConfig)
        
        logger.network(`发送聊天请求`, 'REQUEST')
        const response = await axios.post("https://chat.qwen.ai/api/chat/completions", body, requestConfig)

        // 请求成功
        if (response.status === 200) {
            return {
                currentToken: currentToken,
                status: true,
                response: response.data
            }
        }

    } catch (error) {
        logger.error('发送聊天请求失败', 'REQUEST', '', error.message)
        return {
            status: false,
            response: null
        }
    }
}

module.exports = {
    sendChatRequest
}