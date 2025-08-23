const axios = require('axios')
const { logger } = require('../utils/logger')
const { setResponseHeaders } = require('./chat.js')
const accountManager = require('../utils/account.js')
const { uploadFileToQwenOss } = require('../utils/upload.js')

/**
 * 主要的聊天完成处理函数
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 */
const handleImageCompletion = async (req, res) => {
    const { model, messages, size, chat_type } = req.body
    console.log(JSON.stringify(req.body.messages.filter(item => item.role == "user" || item.role == "assistant")))
    const token = accountManager.getAccountToken()

    try {

        // 请求体模板
        const reqBody = {
            "stream": false,
            "chat_id": null,
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": "",
                    "files": [],
                    "chat_type": chat_type,
                    "feature_config": {
                        "output_schema": "phase"
                    }
                }
            ]
        }

        const chat_id = await generateChatID(token)

        if (!chat_id) {
            // 如果生成chat_id失败，则返回错误
            throw new Error()
        } else {
            reqBody.chat_id = chat_id
        }

        // 拿到用户最后一句消息
        const _userPrompt = messages[messages.length - 1].content
        if (!_userPrompt) {
            throw new Error()
        }

        //分情况处理
        if (chat_type == 't2i') {
            if (Array.isArray(_userPrompt)) {
                reqBody.messages[0].content = _userPrompt.map(item => item.type == "text" ? item.text : "").join("\n\n")
            } else {
                reqBody.messages[0].content = _userPrompt
            }
        } else if (chat_type == 'image_edit') {
            if (!Array.isArray(_userPrompt)) {
                const select_image_list = []
                const image_url_regex = /!\[image\]\((.*?)\)/g

                const ChatMessages = messages.filter(item => item.role == "user" || item.role == "assistant")
                if (ChatMessages.length === 0) {
                    throw new Error()
                }

                // 遍历模型回复消息，拿到所有图片
                ChatMessages.forEach(item => {
                    if (item.role == "assistant") {
                        // 匹配图片url
                        const image_url = image_url_regex.test(item.content)
                        // 如果匹配到图片url，则添加到图片列表
                        if (image_url) {
                            select_image_list.push(item.content.replace("![image](", "").replace(")", ""))
                        }
                    } else {
                        if (Array.isArray(item.content) && item.content.length > 0) {
                            for (const content of item.content) {
                                if (content.type == "image") {
                                    select_image_list.push(content.image)
                                }
                            }
                        }
                    }
                })

                if (select_image_list.length >= 1) {
                    console.log(select_image_list)
                    reqBody.messages[0].files.push({
                        "type": "image",
                        "url": select_image_list[select_image_list.length - 1]
                    })
                    reqBody.messages[0].content += _userPrompt
                } else {
                    throw new Error()
                }

            } else {
                const texts = _userPrompt.filter(item => item.type == "text")
                if (texts.length === 0) {
                    throw new Error()
                }
                // 拼接提示词
                for (const item of texts) {
                    reqBody.messages[0].content += item.text
                }
                const files = _userPrompt.filter(item => item.type == "image")
                // 遍历图片
                for (const item of files) {
                    reqBody.messages[0].files.push({
                        "type": "image",
                        "url": item.image
                    })
                }

            }
        }


        // 处理图片尺寸
        if (chat_type == 't2i') {
            // 获取图片尺寸，优先级 参数 > 提示词 > 默认
            if (size != undefined && size != null) {
                reqBody.size = size
            } else if (_userPrompt.indexOf("@4:3") != -1) {
                reqBody.size = "4:3"//"1024*768"
            } else if (_userPrompt.indexOf("@3:4") != -1) {
                reqBody.size = "3:4"//"768*1024"
            } else if (_userPrompt.indexOf("@16:9") != -1) {
                reqBody.size = "16:9"//"1280*720"
            } else if (_userPrompt.indexOf("@9:16") != -1) {
                reqBody.size = "9:16"//"720*1280"
            }
        }

        logger.info('发送图片请求', 'CHAT')
        console.log(JSON.stringify(reqBody))
        const response_data = await axios.post(`https://chat.qwen.ai/api/v2/chat/completions?chat_id=${chat_id}`, reqBody, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            responseType: chat_type == 't2i' ? 'stream' : 'json',
            timeout: 1000 * 60 * 5
        })

        try {
            let contentUrl = null
            if (chat_type == 't2i') {
                const decoder = new TextDecoder('utf-8')
                response_data.data.on('data', async (chunk) => {
                    const data = decoder.decode(chunk, { stream: true }).split('\n').filter(item => item.trim() != "")
                    for (const item of data) {
                        const jsonObj = JSON.parse(item.replace("data:", '').trim())
                        if (jsonObj && jsonObj.choices && jsonObj.choices[0] && jsonObj.choices[0].delta && jsonObj.choices[0].delta.content.trim() != "" && contentUrl == null) {
                            contentUrl = jsonObj.choices[0].delta.content
                        }
                    }
                })

                response_data.data.on('end', () => {
                    return returnResponse(res, model, contentUrl, req.body.stream)
                })
            } else if (chat_type == 'image_edit') {
                contentUrl = response_data.data?.data?.choices[0]?.message?.content[0]?.image
                return returnResponse(res, model, contentUrl, req.body.stream)
            }

        } catch (error) {
            logger.error('图片处理错误', 'CHAT', error)
            res.status(500).json({ error: "服务错误!!!" })
        }

    } catch (error) {
        res.status(500).json({
            error: "服务错误，请稍后再试"
        })
    }
}

/**
 * 生成chat_id
 * @param {*} token 
 * @returns {Promise<string|null>} 返回生成的chat_id，如果失败则返回null
 */
const generateChatID = async (token) => {
    try {
        const response_data = await axios.post("https://chat.qwen.ai/api/v2/chats/new", {
            "title": "New Chat",
            "models": [
                "qwen3-235b-a22b"
            ],
            "chat_mode": "normal",
            "chat_type": "t2i",
            "timestamp": new Date().getTime()
        }, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        })

        return response_data.data?.data?.id || null

    } catch (error) {
        logger.error('生成chat_id失败', 'CHAT', '', error.message)
        return null
    }
}

/**
 * 返回响应
 * @param {*} res 
 * @param {*} model 
 * @param {*} contentUrl 
 */
const returnResponse = (res, model, contentUrl, stream) => {
    setResponseHeaders(res, stream)

    const returnBody = {
        "created": new Date().getTime(),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": `![image](${contentUrl})`
                },
                "finish_reason": "stop"
            }
        ]
    }

    if (stream) {
        res.write(`data: ${JSON.stringify(returnBody)}\n\n`)
        res.write(`data: [DONE]\n\n`)
        res.end()
    } else {
        res.json(returnBody)
    }
}

module.exports = {
    handleImageCompletion
}