const uuid = require('uuid')
const { isJson } = require('../utils/tools.js')
const { sendChatRequest } = require('../utils/request.js')
const accountManager = require('../utils/account.js')
const config = require('../config/index.js')
const { logger } = require('../utils/logger')

/**
 * 设置响应头
 * @param {object} res - Express 响应对象
 * @param {boolean} stream - 是否流式响应
 */
const setResponseHeaders = (res, stream) => {
  try {
    if (stream) {
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
    } else {
      res.set({
        'Content-Type': 'application/json',
      })
    }
  } catch (e) {
    logger.error('处理聊天请求时发生错误', 'CHAT', '', e)
  }
}

/**
 * 处理流式响应
 * @param {object} res - Express 响应对象
 * @param {object} response - 上游响应流
 * @param {boolean} enable_thinking - 是否启用思考模式
 * @param {boolean} enable_web_search - 是否启用网络搜索
 */
const handleStreamResponse = async (res, response, enable_thinking, enable_web_search) => {
  try {
    const message_id = uuid.v4()
    const decoder = new TextDecoder('utf-8')
    let web_search_info = null
    let thinking_start = false
    let thinking_end = false
    let buffer = ''

    response.on('data', async (chunk) => {
      const decodeText = decoder.decode(chunk, { stream: true })
      buffer += decodeText

      const chunks = []
      let startIndex = 0

      while (true) {
        const dataStart = buffer.indexOf('data: ', startIndex)
        if (dataStart === -1) break

        const dataEnd = buffer.indexOf('\n\n', dataStart)
        if (dataEnd === -1) break

        const dataChunk = buffer.substring(dataStart, dataEnd).trim()
        chunks.push(dataChunk)

        startIndex = dataEnd + 2
      }

      if (startIndex > 0) {
        buffer = buffer.substring(startIndex)
      }

      for (const item of chunks) {
        try {
          let dataContent = item.replace("data: ", '')
          let decodeJson = isJson(dataContent) ? JSON.parse(dataContent) : null
          if (decodeJson === null || !decodeJson.choices || decodeJson.choices.length === 0) {
            continue
          }

          // 处理 web_search 信息
          if (decodeJson.choices[0].delta.name === 'web_search') {
            web_search_info = decodeJson.choices[0].delta.extra.web_search_info
          }

          if (!decodeJson.choices[0].delta.content || (decodeJson.choices[0].delta.phase !== 'think' && decodeJson.choices[0].delta.phase !== 'answer')) return

          let content = decodeJson.choices[0].delta.content

          if (decodeJson.choices[0].delta.phase === 'think' && !thinking_start) {
            thinking_start = true
            if (web_search_info) {
              content = `<think>\n\n${await accountManager.generateMarkdownTable(web_search_info, config.searchInfoMode)}\n\n${content}`
            } else {
              content = `<think>\n\n${content}`
            }
          }
          if (decodeJson.choices[0].delta.phase === 'answer' && !thinking_end && thinking_start) {
            thinking_end = true
            content = `\n\n</think>\n${content}`
          }

          const StreamTemplate = {
            "id": `chatcmpl-${message_id}`,
            "object": "chat.completion.chunk",
            "created": new Date().getTime(),
            "choices": [
              {
                "index": 0,
                "delta": {
                  "content": content
                },
                "finish_reason": null
              }
            ]
          }

          res.write(`data: ${JSON.stringify(StreamTemplate)}\n\n`)
        } catch (error) {
          logger.error('流式数据处理错误', 'CHAT', '', error)
          res.status(500).json({ error: "服务错误!!!" })
        }
      }
    })

    response.on('end', async () => {
      try {
        if ((config.outThink === false || !enable_thinking) && web_search_info && config.searchInfoMode === "text") {
          const webSearchTable = await accountManager.generateMarkdownTable(web_search_info, "text")
          res.write(`data: ${JSON.stringify({
            "id": `chatcmpl-${message_id}`,
            "object": "chat.completion.chunk",
            "created": new Date().getTime(),
            "choices": [
              {
                "index": 0,
                "delta": {
                  "content": `\n\n---\n${webSearchTable}`
                }
              }
            ]
          })}\n\n`)
        }
        res.write(`data: [DONE]\n\n`)
        res.end()
      } catch (e) {
        logger.error('流式响应处理错误', 'CHAT', '', e)
        res.status(500).json({ error: "服务错误!!!" })
      }
    })
  } catch (error) {
    logger.error('聊天处理错误', 'CHAT', '', error)
    res.status(500).json({ error: "服务错误!!!" })
  }
}

/**
 * 处理非流式响应
 * @param {object} res - Express 响应对象
 * @param {object} response - 上游响应数据
 * @param {boolean} enable_thinking - 是否启用思考模式
 * @param {boolean} enable_web_search - 是否启用网络搜索
 * @param {string} model - 模型名称
 */
const handleNonStreamResponse = async (res, response, enable_thinking, enable_web_search, model) => {
  try {
    const bodyTemplate = {
      "id": `chatcmpl-${uuid.v4()}`,
      "object": "chat.completion",
      "created": new Date().getTime(),
      "model": model,
      "choices": [
        {
          "index": 0,
          "message": {
            "role": "assistant",
            "content": response.choices[0].message.content
          },
          "finish_reason": "stop"
        }
      ],
      "usage": {
        "prompt_tokens": 512,
        "completion_tokens": response.choices[0].message.content.length,
        "total_tokens": 512 + response.choices[0].message.content.length
      }
    }
    res.json(bodyTemplate)
  } catch (error) {
    logger.error('非流式聊天处理错误', 'CHAT', '', error)
    res.status(500)
      .json({
        error: "服务错误!!!"
      })
  }
}

/**
 * 主要的聊天完成处理函数
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 */
const handleChatCompletion = async (req, res) => {
  const { stream, model } = req.body
  const enable_thinking = req.enable_thinking
  const enable_web_search = req.enable_web_search
  let setResHeaderStatus = false

  const setResHeader = (stream) => {
    if (setResHeaderStatus) return
    setResponseHeaders(res, stream)
    setResHeaderStatus = true
  }

  try {
    const response_data = await sendChatRequest(req.body)

    if (response_data.status !== 200 || !response_data.response) {
      res.status(500)
        .json({
          error: "请求发送失败！！！"
        })
      return
    }

    if (stream) {
      setResHeader(true)
      await handleStreamResponse(res, response_data.response, enable_thinking, enable_web_search)
    } else {
      setResHeader(false)
      await handleNonStreamResponse(res, response_data.response, enable_thinking, enable_web_search, model)
    }

  } catch (error) {
    res.status(500)
      .json({
        error: "token无效,请求发送失败！！！"
      })
  }
}

module.exports = {
  handleChatCompletion,
  handleStreamResponse,
  handleNonStreamResponse,
  setResponseHeaders
}
