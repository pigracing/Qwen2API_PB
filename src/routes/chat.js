const express = require('express')
const router = express.Router()
const { apiKeyVerify } = require('../middlewares/authorization.js')
const { processRequestBody } = require('../middlewares/chat-middleware.js')
const { handleChatCompletion } = require('../controllers/chat.js')
const { handleImageCompletion } = require('../controllers/chat.image.js')

const selectChatCompletion = (req, res, next) => {
    const ChatCompletionMap = {
        't2i': handleImageCompletion,
        't2t': handleChatCompletion,
        'search': handleChatCompletion,
        //   't2v': handleVideoCompletion,
        'image_edit': handleImageCompletion,
        //   'deep_research': handleDeepResearchCompletion
    }

    const chatType = req.body.chat_type
    const chatCompletion = ChatCompletionMap[chatType]
    if (chatCompletion) {
        chatCompletion(req, res, next)
    } else {
        handleImageCompletion(req, res, next)
    }
}

router.post('/v1/chat/completions',
    apiKeyVerify,
    processRequestBody,
    selectChatCompletion
)


module.exports = router