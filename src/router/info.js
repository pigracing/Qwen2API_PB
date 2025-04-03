const router = require('express').Router()
const accountManager = require('../lib/account')

router.get('/info/getTokens', (req, res) => {
  const tokens = accountManager.accountTokens
  res.json({
    status: 200,
    data: tokens.map(token => {
      return {
        id: token.id,
        type: token.type,
        username: token.username,
        token: token.token.slice(0, Math.floor(token.token.length / 2)) + '...',
        expiresAt: new Date(token.expiresAt * 1000).toLocaleString(),
        requestNumber: token.requestNumber,
      }
    })
  })
})

router.post('/info/deleteToken', (req, res) => {
  res.json(config)
})

router.post('/info/addToken', (req, res) => {
  res.json(config)
})

router.post('/info/checkToken', (req, res) => {
  res.json(config)
})

router.post('/info/checkAllToken', (req, res) => {
  res.json(config)
})

module.exports = router
