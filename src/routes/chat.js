const express = require('express')
const router = express.Router()
const { apiKeyVerify } = require('../middlewares/authorization.js')
const { processRequestBody } = require('../middlewares/chat-middleware.js')
const { handleChatCompletion } = require('../controllers/chat.js')

router.post('/v1/chat/completions',
  apiKeyVerify,
  processRequestBody,
  handleChatCompletion
)

module.exports = router