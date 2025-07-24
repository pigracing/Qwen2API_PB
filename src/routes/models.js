const express = require('express')
const router = express.Router()
const config = require('../config/index.js')
const { apiKeyVerify } = require('../middlewares/authorization')
const { handleGetModels } = require('../controllers/models.js')

router.get(`${config.apiPrefix ? config.apiPrefix : ''}/v1/models`, apiKeyVerify, handleGetModels)

router.get(`${config.apiPrefix ? config.apiPrefix : ''}/models`, handleGetModels)


module.exports = router
