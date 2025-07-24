const express = require('express')
const router = express.Router()
const config = require('../config/index.js')

router.post('/verify', (req, res) => {
  const apiKey = req.body.apiKey
  if (!apiKey || apiKey != config.apiKey) {
    return res.status(401).json({
      status: 401,
      message: 'Unauthorized'
    })
  }
  res.status(200).json({
    status: 200,
    message: 'success'
  })
})

module.exports = router
