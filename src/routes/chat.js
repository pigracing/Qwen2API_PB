const express = require('express')
const router = express.Router()
const config = require('../config/index.js')
const { apiKeyVerify } = require('../middlewares/authorization.js')
const { processRequestBody } = require('../middlewares/chat-middleware.js')
const { handleChatCompletion } = require('../controllers/chat.js')

router.post(`${config.apiPrefix ? config.apiPrefix : ''}/v1/chat/completions`,
  apiKeyVerify,
  processRequestBody,
  handleChatCompletion
)

module.exports = router