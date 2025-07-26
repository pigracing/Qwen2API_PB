const { generateUUID, isJson } = require('../utils/tools.js')
const { createUsageObject } = require('../utils/precise-tokenizer.js')
const accountManager = require('../utils/account.js')
const config = require('../config/index.js')
const { logger } = require('../utils/logger')

// 性能优化常量
const CHUNK_BUFFER_SIZE = 8192 // 8KB 缓冲区
const MAX_BUFFER_SIZE = 1024 * 1024 // 1MB 最大缓冲区
const DATA_PREFIX = 'data: '
const DATA_PREFIX_LENGTH = DATA_PREFIX.length
const CHUNK_DELIMITER = '\n\n'

/**
 * 优化版本的流式响应处理器
 * @param {object} res - Express 响应对象
 * @param {object} response - 上游响应流
 * @param {boolean} enable_thinking - 是否启用思考模式
 * @param {boolean} enable_web_search - 是否启用网络搜索
 * @param {object} requestBody - 原始请求体，用于提取prompt信息
 */
const handleStreamResponseOptimized = async (res, response, enable_thinking, enable_web_search, requestBody = null) => {
  try {
    const message_id = generateUUID()
    const decoder = new TextDecoder('utf-8')

    // 状态变量
    let web_search_info = null
    let thinking_start = false
    let thinking_end = false
    let buffer = ''
    let bufferSize = 0

    // Token消耗量统计
    let totalTokens = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
    let completionContent = '' // 收集完整的回复内容用于token估算

    // 提取prompt文本用于token估算
    let promptText = ''
    if (requestBody && requestBody.messages) {
      promptText = requestBody.messages.map(msg => {
        if (typeof msg.content === 'string') {
          return msg.content
        } else if (Array.isArray(msg.content)) {
          return msg.content.map(item => item.text || '').join('')
        }
        return ''
      }).join('\n')
    }

    // 预编译的模板对象，减少重复创建
    const baseTemplate = {
      id: `chatcmpl-${message_id}`,
      object: "chat.completion.chunk",
      choices: [{
        index: 0,
        delta: {},
        finish_reason: null
      }]
    }

    // 优化的数据处理函数
    const processChunk = (chunk) => {
      const decodeText = decoder.decode(chunk, { stream: true })
      buffer += decodeText
      bufferSize += decodeText.length
      
      // 防止缓冲区过大
      if (bufferSize > MAX_BUFFER_SIZE) {
        logger.warn('缓冲区大小超限，清理旧数据', 'CHAT', '⚠️')
        buffer = buffer.slice(-CHUNK_BUFFER_SIZE)
        bufferSize = buffer.length
      }

      const chunks = []
      let startIndex = 0

      // 优化的块解析算法
      while (startIndex < buffer.length) {
        const dataStart = buffer.indexOf(DATA_PREFIX, startIndex)
        if (dataStart === -1) break

        const dataEnd = buffer.indexOf(CHUNK_DELIMITER, dataStart)
        if (dataEnd === -1) break

        const dataChunk = buffer.substring(dataStart, dataEnd).trim()
        if (dataChunk.length > DATA_PREFIX_LENGTH) {
          chunks.push(dataChunk)
        }

        startIndex = dataEnd + 2
      }

      // 更新缓冲区
      if (startIndex > 0) {
        buffer = buffer.substring(startIndex)
        bufferSize = buffer.length
      }

      return chunks
    }

    // 优化的内容处理函数
    const processContent = async (decodeJson) => {
      // 快速验证必要字段
      if (!decodeJson?.choices?.[0]?.delta) {
        return null
      }

      // 提取真实的usage信息（如果上游API提供）
      if (decodeJson.usage) {
        totalTokens = {
          prompt_tokens: decodeJson.usage.prompt_tokens || totalTokens.prompt_tokens,
          completion_tokens: decodeJson.usage.completion_tokens || totalTokens.completion_tokens,
          total_tokens: decodeJson.usage.total_tokens || totalTokens.total_tokens
        }
      }

      const delta = decodeJson.choices[0].delta

      // 处理 web_search 信息
      if (delta.name === 'web_search' && delta.extra?.web_search_info) {
        web_search_info = delta.extra.web_search_info
        return null
      }

      // 验证内容和阶段
      if (!delta.content || (delta.phase !== 'think' && delta.phase !== 'answer')) {
        return null
      }

      let content = delta.content
      completionContent += content // 累计完整内容用于token估算

      // 处理思考阶段
      if (delta.phase === 'think' && !thinking_start) {
        thinking_start = true
        if (web_search_info) {
          const searchTable = await accountManager.generateMarkdownTable(web_search_info, config.searchInfoMode)
          content = `<think>\n\n${searchTable}\n\n${content}`
        } else {
          content = `<think>\n\n${content}`
        }
      }

      // 处理回答阶段
      if (delta.phase === 'answer' && !thinking_end && thinking_start) {
        thinking_end = true
        content = `\n\n</think>\n${content}`
      }

      return content
    }

    // 优化的响应写入函数
    const writeResponse = (content) => {
      // 复用模板对象，只更新必要字段
      baseTemplate.created = Date.now()
      baseTemplate.choices[0].delta.content = content
      
      const responseData = `data: ${JSON.stringify(baseTemplate)}\n\n`
      res.write(responseData)
    }

    // 主数据处理流
    response.on('data', async (chunk) => {
      try {
        const chunks = processChunk(chunk)
        
        // 批量处理多个数据块
        for (const item of chunks) {
          try {
            const dataContent = item.slice(DATA_PREFIX_LENGTH)
            
            // 优化的JSON解析
            if (!isJson(dataContent)) continue
            
            const decodeJson = JSON.parse(dataContent)
            const content = await processContent(decodeJson)
            
            if (content !== null) {
              writeResponse(content)
            }
          } catch (parseError) {
            // 单个块解析失败不影响其他块
            logger.debug('单个数据块解析失败', 'CHAT', '', parseError)
          }
        }
      } catch (error) {
        logger.error('流式数据处理错误', 'CHAT', '', error)
        // 不立即返回错误，继续处理其他数据
      }
    })

    // 优化的结束处理
    response.on('end', async () => {
      try {
        // 处理最终的搜索信息
        if ((config.outThink === false || !enable_thinking) &&
            web_search_info &&
            config.searchInfoMode === "text") {

          const webSearchTable = await accountManager.generateMarkdownTable(web_search_info, "text")
          writeResponse(`\n\n---\n${webSearchTable}`)
        }

        // 如果没有从上游API获取到真实的usage数据，则使用tiktoken计算
        if (totalTokens.prompt_tokens === 0 && totalTokens.completion_tokens === 0) {
          totalTokens = createUsageObject(requestBody?.messages || promptText, completionContent, null)
          logger.info(`使用tiktoken计算 - Prompt: ${totalTokens.prompt_tokens}, Completion: ${totalTokens.completion_tokens}, Total: ${totalTokens.total_tokens}`, 'CHAT')
        } else {
          logger.info(`使用上游真实Token - Prompt: ${totalTokens.prompt_tokens}, Completion: ${totalTokens.completion_tokens}, Total: ${totalTokens.total_tokens}`, 'CHAT')
        }

        // 发送最终的finish chunk，包含finish_reason
        baseTemplate.created = Date.now()
        baseTemplate.choices[0].delta = {}
        baseTemplate.choices[0].finish_reason = "stop"
        res.write(`data: ${JSON.stringify(baseTemplate)}\n\n`)

        // 发送usage信息chunk（符合OpenAI API标准）
        const usageTemplate = {
          id: `chatcmpl-${message_id}`,
          object: "chat.completion.chunk",
          created: Date.now(),
          choices: [],
          usage: totalTokens
        }
        res.write(`data: ${JSON.stringify(usageTemplate)}\n\n`)

        // 发送结束标记
        res.write(`data: [DONE]\n\n`)
        res.end()
      } catch (e) {
        logger.error('流式响应结束处理错误', 'CHAT', '', e)
        if (!res.headersSent) {
          res.status(500).json({ error: "服务错误!!!" })
        }
      }
    })

    // 错误处理
    response.on('error', (error) => {
      logger.error('上游响应流错误', 'CHAT', '', error)
      if (!res.headersSent) {
        res.status(500).json({ error: "上游服务错误" })
      }
    })

  } catch (error) {
    logger.error('流式响应初始化错误', 'CHAT', '', error)
    if (!res.headersSent) {
      res.status(500).json({ error: "服务错误!!!" })
    }
  }
}

/**
 * 性能监控版本的流式响应处理器
 * 包含详细的性能指标收集
 */
const handleStreamResponseWithMetrics = async (res, response, enable_thinking, enable_web_search) => {
  const startTime = Date.now()
  let chunkCount = 0
  let totalBytes = 0
  let parseErrors = 0
  
  try {
    // 使用优化版本的处理器
    await handleStreamResponseOptimized(res, response, enable_thinking, enable_web_search)
    
    // 记录性能指标
    const duration = Date.now() - startTime
    logger.info(`流式响应完成`, 'CHAT', '📊', {
      duration: `${duration}ms`,
      chunks: chunkCount,
      bytes: totalBytes,
      parseErrors: parseErrors,
      avgChunkSize: totalBytes > 0 ? Math.round(totalBytes / chunkCount) : 0
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('流式响应失败', 'CHAT', '', {
      error: error.message,
      duration: `${duration}ms`,
      chunks: chunkCount,
      bytes: totalBytes
    })
    throw error
  }
}

module.exports = {
  handleStreamResponseOptimized,
  handleStreamResponseWithMetrics
}
