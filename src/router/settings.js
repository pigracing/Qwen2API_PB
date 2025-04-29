const express = require('express')
const router = express.Router()
const redisClient = require('../lib/redis')
const config = require('../config')
const { apiKeyVerify } = require('./index')


// 更新API Key
router.post('/setApiKey', apiKeyVerify, async (req, res) => {
  try {
    const { apiKey } = req.body
    if (!apiKey) {
      return res.status(400).json({ error: 'API Key不能为空' })
    }
    config.apiKey = apiKey
    res.json({ message: 'API Key更新成功' })
  } catch (error) {
    console.error('更新API Key失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// 更新默认请求头
router.post('/setHeaders', apiKeyVerify, async (req, res) => {
  try {
    const { headers } = req.body
    if (!headers || typeof headers !== 'object') {
      return res.status(400).json({ error: '无效的请求头格式' })
    }

    const success = await redisClient.set('defaultHeaders', JSON.stringify(headers))
    if (success) {
      config.defaultHeaders = headers
      res.json({ message: '默认请求头更新成功', headers })
    } else {
      res.status(500).json({ error: '默认请求头更新失败' })
    }
  } catch (error) {
    console.error('更新默认请求头失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// 更新默认Cookie
router.post('/setCookie', apiKeyVerify, async (req, res) => {
  try {
    const { cookie } = req.body
    if (!cookie) {
      return res.status(400).json({ error: 'Cookie不能为空' })
    }

    const success = await redisClient.set('defaultCookie', cookie)
    if (success) {
      config.defaultCookie = cookie
      res.json({ message: '默认Cookie更新成功', cookie })
    } else {
      res.status(500).json({ error: '默认Cookie更新失败' })
    }
  } catch (error) {
    console.error('更新默认Cookie失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// 更新自动刷新设置
router.post('/setAutoRefresh', apiKeyVerify, async (req, res) => {
  try {
    const { autoRefresh, autoRefreshInterval } = req.body

    if (typeof autoRefresh !== 'boolean') {
      return res.status(400).json({ error: '无效的自动刷新设置' })
    }

    if (autoRefreshInterval !== undefined) {
      const interval = parseInt(autoRefreshInterval)
      if (isNaN(interval) || interval < 0) {
        return res.status(400).json({ error: '无效的自动刷新间隔' })
      }
    }
    config.autoRefresh = autoRefresh
    config.autoRefreshInterval = autoRefreshInterval || 6 * 60 * 60
    res.json({
      status: true,
      message: '自动刷新设置更新成功'
    })
  } catch (error) {
    console.error('更新自动刷新设置失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// 更新思考输出设置
router.post('/setOutThink', apiKeyVerify, async (req, res) => {
  try {
    const { outThink } = req.body;
    if (typeof outThink !== 'boolean') {
      return res.status(400).json({ error: '无效的思考输出设置' })
    }

    config.outThink = outThink
    res.json({
      status: true,
      message: '思考输出设置更新成功'
    })
  } catch (error) {
    console.error('更新思考输出设置失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// 更新搜索信息模式
router.post('/search-info-mode', apiKeyVerify, async (req, res) => {
  try {
    const { searchInfoMode } = req.body
    if (!['table', 'text'].includes(searchInfoMode)) {
      return res.status(400).json({ error: '无效的搜索信息模式' })
    }

    config.searchInfoMode = searchInfoMode
    res.json({
      status: true,
      message: '搜索信息模式更新成功'
    })
  } catch (error) {
    console.error('更新搜索信息模式失败:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router