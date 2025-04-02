const express = require('express')
const router = express.Router()

router.post('/verify', (req, res) => {
  const apiKey = req.body.apiKey
  if (!apiKey || apiKey != process.env.API_KEY) {
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
