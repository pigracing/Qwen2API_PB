const express = require('express')
const router = express.Router()
const accountManager = require('../lib/account.js')
const config = require('../config.js')

router.get(`${config.apiPrefix ? config.apiPrefix : ''}/v1/models`, async (req, res) => {
  try {
    let authToken = req.headers.authorization

    if (authToken) {
      // 如果提供了 Authorization header，验证是否与 API_KEY 匹配
      if (authToken === `Bearer ${config.apiKey}`) {
        authToken = accountManager.getAccountToken()
      }
    } else if (accountManager) {
      // 如果没有 Authorization  且有账户管理，使用账户 token
      authToken = accountManager.getAccountToken()
    } else {
      res.json(await accountManager.getModelList())
      return
    }

    const response = await axios.get('https://chat.qwen.ai/api/models',
      {
        headers: accountManager.getHeaders(authToken)
      })
    const modelsList_response = response.data.data
    const defaultModels = []
    const modelsList = []
    for (const item of modelsList_response) {
      defaultModels.push(item.id)
      modelsList.push(item.id)
      modelsList.push(item.id + '-thinking')
      modelsList.push(item.id + '-search')
      modelsList.push(item.id + '-thinking-search')
      modelsList.push(item.id + '-draw')
    }

    const models = {
      "object": "list",
      "data": modelsList.map(item => ({
        "id": item,
        "object": "model",
        "created": new Date().getTime(),
        "owned_by": "qwen"
      })),
      "object": "list"
    }

    if (defaultModels.length > 0) {
      accountManager.setDefaultModels(defaultModels)
    }

    res.json(models)
  } catch (error) {
    res.json(await accountManager.getModelList())
    return
  }
})

module.exports = router
