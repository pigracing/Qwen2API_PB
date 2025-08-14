const axios = require('axios')
const config = require('../config/index.js')
const accountManager = require('./account.js')
const { sleep } = require('./tools.js')
const { logger } = require('./logger')

/**
 * 聊天请求管理器
 * 提供智能的请求发送、错误处理和重试机制
 */

// 请求配置常量
const REQUEST_CONFIG = {
  maxRetries: 3,           // 最大重试次数
  baseDelay: 1000,         // 基础延迟时间(ms)
  maxDelay: 10000,         // 最大延迟时间(ms)
  timeout: 30000,          // 请求超时时间(ms)
  endpoint: 'https://chat.qwen.ai/api/chat/completions',
  t2iEndpoint: 'https://chat.qwen.ai/api/v2/chats/new'
}

// 错误状态码映射
const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
}

/**
 * 计算指数退避延迟
 * @param {number} retryCount - 重试次数
 * @returns {number} 延迟时间(ms)
 */
const calculateBackoffDelay = (retryCount) => {
  const delay = REQUEST_CONFIG.baseDelay * Math.pow(2, retryCount)
  return Math.min(delay, REQUEST_CONFIG.maxDelay)
}

/**
 * 判断错误是否可重试
 * @param {number} statusCode - HTTP状态码
 * @returns {boolean} 是否可重试
 */
const isRetryableError = (statusCode) => {
  return [
    ERROR_CODES.TOO_MANY_REQUESTS,
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    ERROR_CODES.BAD_GATEWAY,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    ERROR_CODES.GATEWAY_TIMEOUT
  ].includes(statusCode)
}

/**
 * 发送聊天请求
 * @param {Object} body - 请求体
 * @param {number} retryCount - 当前重试次数
 * @param {string} lastUsedEmail - 上次使用的邮箱（用于错误记录）
 * @returns {Promise<Object>} 响应结果
 */
const sendChatRequest = async (body, retryCount = 0, lastUsedEmail = null,url = REQUEST_CONFIG.endpoint,responseType) => {
  try {
    // 获取可用的令牌
    const currentToken = accountManager.getAccountToken()

    if (!currentToken) {
      logger.error('无法获取有效的访问令牌', 'TOKEN')
      return {
        status: ERROR_CODES.UNAUTHORIZED,
        response: { error: '无可用的访问令牌' }
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
      responseType: responseType ? responseType : body.stream ? 'stream' : 'json',
      timeout: REQUEST_CONFIG.timeout,
      validateStatus: (status) => status < 500 // 只有5xx错误才抛出异常
    }

    logger.network(`发送聊天请求 (重试: ${retryCount}/${REQUEST_CONFIG.maxRetries})`, 'REQUEST')
    const response = await axios.post(url, body, requestConfig)

    // 请求成功
    if (response.status === 200) {
      return {
        status: 200,
        response: response.data
      }
    }

    // 处理非200状态码
    return await handleErrorResponse(response, body, retryCount, lastUsedEmail)

  } catch (error) {
    console.log(error)
    return await handleRequestError(error, body, retryCount, lastUsedEmail)
  }
}

/**
 * 发送聊天请求
 * @param {Object} body - 请求体
 * @param {number} retryCount - 当前重试次数
 * @param {string} lastUsedEmail - 上次使用的邮箱（用于错误记录）
 * @returns {Promise<Object>} 响应结果
 */
const sendT2IRequest = async (body, retryCount = 0, lastUsedEmail = null,url = REQUEST_CONFIG.endpoint,responseType) => {
  try {
    // 获取可用的令牌
    const currentToken = accountManager.getAccountToken()

    if (!currentToken) {
      logger.error('无法获取有效的访问令牌', 'TOKEN')
      return {
        status: ERROR_CODES.UNAUTHORIZED,
        response: { error: '无可用的访问令牌' }
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
      responseType: responseType ? responseType : body.stream ? 'stream' : 'json',
      timeout: REQUEST_CONFIG.timeout,
      validateStatus: (status) => status < 500 // 只有5xx错误才抛出异常
    }

    logger.network(`发送聊天请求 (重试: ${retryCount}/${REQUEST_CONFIG.maxRetries})`, 'REQUEST')
    const response = await axios.post(url, body, requestConfig)

    // 请求成功
    if (response.status === 200) {
      return {
        status: 200,
        response: response.data
      }
    }

    // 处理非200状态码
    return await handleErrorResponse(response, body, retryCount, lastUsedEmail)

  } catch (error) {
    console.log(error)
    return await handleRequestError(error, body, retryCount, lastUsedEmail)
  }
}

/**
 * 处理HTTP响应错误
 * @param {Object} response - HTTP响应对象
 * @param {Object} body - 原始请求体
 * @param {number} retryCount - 当前重试次数
 * @param {string} lastUsedEmail - 上次使用的邮箱
 * @returns {Promise<Object>} 处理结果
 */
const handleErrorResponse = async (response, body, retryCount, lastUsedEmail) => {
  const statusCode = response.status

  logger.error(`请求失败，状态码: ${statusCode}`, 'REQUEST')

  // 401 未授权 - 令牌问题
  if (statusCode === ERROR_CODES.UNAUTHORIZED) {
    return await handleUnauthorizedError(body, retryCount, lastUsedEmail)
  }

  // 429 请求过多 - 需要等待
  if (statusCode === ERROR_CODES.TOO_MANY_REQUESTS) {
    return await handleRateLimitError(body, retryCount)
  }

  // 其他可重试错误
  if (isRetryableError(statusCode) && retryCount < REQUEST_CONFIG.maxRetries) {
    const delay = calculateBackoffDelay(retryCount)
    logger.warn(`等待 ${delay}ms 后重试...`, 'REQUEST', '⏳')
    await sleep(delay)
    return sendChatRequest(body, retryCount + 1, lastUsedEmail)
  }

  return {
    status: statusCode,
    response: response.data || { error: `HTTP ${statusCode} 错误` }
  }
}

/**
 * 处理请求异常
 * @param {Error} error - 异常对象
 * @param {Object} body - 原始请求体
 * @param {number} retryCount - 当前重试次数
 * @param {string} lastUsedEmail - 上次使用的邮箱
 * @returns {Promise<Object>} 处理结果
 */
const handleRequestError = async (error, body, retryCount, lastUsedEmail) => {
  logger.error('请求异常', 'REQUEST', '', error)

  // 网络超时或连接错误
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    if (retryCount < REQUEST_CONFIG.maxRetries) {
      const delay = calculateBackoffDelay(retryCount)
      logger.warn(`网络错误，等待 ${delay}ms 后重试...`, 'REQUEST', '⏳')
      await sleep(delay)
      return sendChatRequest(body, retryCount + 1, lastUsedEmail)
    }
  }

  // HTTP状态码错误
  if (error.response) {
    return await handleErrorResponse(error.response, body, retryCount, lastUsedEmail)
  }

  return {
    status: 500,
    response: { error: error.message || '请求发送失败' }
  }
}

/**
 * 处理401未授权错误
 * @param {Object} body - 原始请求体
 * @param {number} retryCount - 当前重试次数
 * @param {string} lastUsedEmail - 上次使用的邮箱
 * @returns {Promise<Object>} 处理结果
 */
const handleUnauthorizedError = async (body, retryCount, lastUsedEmail) => {
  logger.warn('收到401错误，尝试处理令牌问题...', 'TOKEN', '🔐')

  if (retryCount >= REQUEST_CONFIG.maxRetries) {
    logger.error('已达到最大重试次数', 'REQUEST')
    return {
      status: ERROR_CODES.UNAUTHORIZED,
      response: { error: '认证失败，已达到最大重试次数' }
    }
  }

  // 记录账户失败（如果有上次使用的邮箱）
  if (lastUsedEmail) {
    accountManager.recordAccountFailure(lastUsedEmail)
  }

  // 尝试获取新的令牌（账户轮询器会自动选择下一个可用账户）
  const newToken = accountManager.getAccountToken()

  if (!newToken) {
    logger.error('无法获取新的有效令牌', 'TOKEN')
    return {
      status: ERROR_CODES.UNAUTHORIZED,
      response: { error: '无可用的有效令牌' }
    }
  }

  logger.info('获取到新令牌，重新发起请求...', 'TOKEN', '🎫')
  await sleep(1000) // 短暂等待避免过快重试
  return sendChatRequest(body, retryCount + 1)
}

/**
 * 处理429限流错误
 * @param {Object} body - 原始请求体
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<Object>} 处理结果
 */
const handleRateLimitError = async (body, retryCount) => {
  if (retryCount >= REQUEST_CONFIG.maxRetries) {
    return {
      status: ERROR_CODES.TOO_MANY_REQUESTS,
      response: { error: '请求频率过高，请稍后再试' }
    }
  }

  const delay = calculateBackoffDelay(retryCount + 1) // 使用更长的延迟
  logger.warn(`请求频率过高，等待 ${delay}ms 后重试...`, 'REQUEST', '⏳')
  await sleep(delay)

  return sendChatRequest(body, retryCount + 1)
}

/**
 * 获取请求统计信息
 * @returns {Object} 统计信息
 */
const getRequestStats = () => {
  return {
    config: REQUEST_CONFIG,
    accountHealth: accountManager.getHealthStats()
  }
}

module.exports = {
  REQUEST_CONFIG,
  sendChatRequest,
  sendT2IRequest,
  getRequestStats
}