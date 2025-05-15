const express = require('express')
const router = express.Router()
const uuid = require('uuid')
const { uploadFileToQwenOss } = require('../lib/upload.js')
const { isJson, sha256Encrypt } = require('../lib/tools.js')
const { sendChatRequest } = require('../lib/request.js')
const accountManager = require('../lib/account.js')
const config = require('../config.js')
const { apiKeyVerify } = require('../router/index.js')
const CacheManager = require('../lib/imgCaches.js')
const imgCacheManager = new CacheManager()

const isChatType = (model, search) => {
  if (model.includes('-search') || search) {
    return 'search'
  } else {
    return 't2t'
  }
}

const isThinkingEnabled = (model, enable_thinking, thinking_budget) => {

  const thinking_config = {
    "output_schema": "phase",
    "thinking_enabled": false,
    "thinking_budget": 38912
  }

  if (model.includes('-thinking') || enable_thinking) {
    thinking_config.thinking_enabled = true
  }

  if (thinking_budget && Number(thinking_budget) !== Number.NaN && Number(thinking_budget) > 0 && Number(thinking_budget) < 38912) {
    thinking_config.budget = Number(thinking_budget)
  }

  return thinking_config
}

const parserModel = (model) => {
  if (!model) return 'qwen3-235b-a22b'

  try {
    model = String(model)
    model = model.replace('-search', '')
    model = model.replace('-thinking', '')
    return model
  } catch (e) {
    return 'qwen3-235b-a22b'
  }
}

const parserMessages = async (messages, thinking_config, chat_type) => {
  try {
    const feature_config = thinking_config

    for (let message of messages) {
      if (message.role === 'user' || message.role === 'assistant') {
        message.chat_type = "t2t"
        message.extra = {}
        message.feature_config = {
          "output_schema": "phase",
          "thinking_enabled": false,
        }
        if (!Array.isArray(message.content)) continue
        for (let item of message.content) {
          if (item.type === 'image' || item.type === 'image_url') {
            let base64 = null
            if (item.type === 'image_url') {
              base64 = item.image_url.url
            }
            if (base64) {
              const regex = /data:(.+);base64,/
              // 截取文本
              const fileType = base64.match(regex)
              const fileExtension = fileType && fileType[1] ? fileType[1].split('/')[1] || 'png' : 'png'
              const filename = `${uuid.v4()}.${fileExtension}`
              base64 = base64.replace(regex, '')
              const signature = sha256Encrypt(base64)
              try {
                const buffer = Buffer.from(base64, 'base64')
                const cacheIsExist = imgCacheManager.cacheIsExist(signature)
                if (cacheIsExist) {
                  delete item.image_url
                  item.type = 'image'
                  item.image = imgCacheManager.getCache(signature).url
                } else {
                  const uploadResult = await uploadFileToQwenOss(buffer, filename, accountManager.getAccountToken())
                  if (uploadResult && uploadResult.status === 200) {
                    delete item.image_url
                    item.type = 'image'
                    item.image = uploadResult.file_url
                     imgCacheManager.addCache(signature, uploadResult.file_url)
                  }
                }
              } catch (error) {
                console.error('图片上传失败:', error)
              }
            }
          } else if (item.type === 'text') {
            item.chat_type = 't2t'
            item.feature_config = {
              "output_schema": "phase",
              "thinking_enabled": false,
            }
          } else if (item.type === 'file') {

          }

        }
      }
    }

    messages[messages.length - 1].feature_config = feature_config
    messages[messages.length - 1].chat_type = chat_type

    return messages
  } catch (e) {
    return [
      {
        "role": "user",
        "content": "直接返回字符串： '聊天历史处理有误...'",
        "chat_type": "t2t",
        "extra": {},
        "feature_config": {
          "output_schema": "phase",
          "enabled": false,
        }
      }
    ]
  }
}

const markBody = async (req, res, next) => {
  try {

    // 构建请求体
    const body = {
      "stream": true,
      "incremental_output": true,
      "chat_type": "t2t",
      "model": "qwen3-235b-a22b",
      "messages": [],
      "session_id": uuid.v4(),
      "chat_id": uuid.v4(),
      "id": uuid.v4(),
      "sub_chat_type": "t2t",
      "chat_mode": "normal"
    }

    // 获取请求体原始数据
    let {
      messages,            // 消息历史
      model,               // 模型
      stream,              // 流式输出
      search,              // 搜索模式
      enable_thinking,     // 是否启用思考
      thinking_budget      // 思考预算
    } = req.body

    // 处理 stream 参数
    if (stream === true || stream === 'true') {
      body.stream = true
    } else {
      body.stream = false
    }
    // 处理 incremental_output 参数 : 是否增量输出
    body.incremental_output = true
    // 处理 chat_type 参数 : 聊天类型
    body.chat_type = isChatType(model, search)
    req.enable_web_search = body.chat_type === 'search' ? true : false
    // 处理 model 参数 : 模型
    body.model = parserModel(model)
    // 处理 messages 参数 : 消息历史
    body.messages = await parserMessages(messages, isThinkingEnabled(model, enable_thinking, thinking_budget), body.chat_type)
    // 处理 enable_thinking 参数 : 是否启用思考
    req.enable_thinking = isThinkingEnabled(model, enable_thinking, thinking_budget).enabled
    // 处理 sub_chat_type 参数 : 子聊天类型
    body.sub_chat_type = body.chat_type

    req.body = body

    next()
  } catch (e) {
    console.log(e)
    res.status(500)
      .json({
        status: 500,
        message: "在处理请求体时发生错误 ~ ~ ~"
      })
  }
}

const streamResponse = async (res, response, enable_thinking, enable_web_search) => {
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
            // console.log(web_search_info)
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
          console.log(error)
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
        console.log(e)
        res.status(500).json({ error: "服务错误!!!" })
      }
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "服务错误!!!" })
  }
}

const notStreamResponse = async (res, response, enable_thinking, enable_web_search, model) => {
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
    console.log(error)
    res.status(500)
      .json({
        error: "服务错误!!!"
      })
  }
}

router.post(`${config.apiPrefix ? config.apiPrefix : ''}/v1/chat/completions`, apiKeyVerify, markBody, async (req, res) => {
  const { stream, enable_thinking, enable_web_search, model } = req.body
  let setResHeaderStatus = false

  const setResHeader = (stream) => {
    if (setResHeaderStatus) return
    try {
      if (stream) {
        res.set({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        })
        setResHeaderStatus = true
      } else {
        res.set({
          'Content-Type': 'application/json',
        })
        setResHeaderStatus = true
      }
    } catch (e) {
      console.log(e)
    }
  }

  try {
    const response_data = await sendChatRequest(req.body)

    if (response_data.status === !200 || !response_data.response) {
      res.status(500)
        .json({
          error: "请求发送失败！！！"
        })
      return
    }

    if (stream) {
      setResHeader(true)
      streamResponse(res, response_data.response, enable_thinking, enable_web_search)
    } else {
      setResHeader(false)
      notStreamResponse(res, response_data.response, enable_thinking, enable_web_search, model)
    }

  } catch (error) {
    // console.log(error)
    res.status(500)
      .json({
        error: "token无效,请求发送失败！！！"
      })
  }

})

module.exports = router