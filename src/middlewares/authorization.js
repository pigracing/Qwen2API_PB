const config = require('../config')
const apiKeyVerify = (req, res, next) => {
  // console.log(JSON.stringify(req.body))
  const apiKey = req.headers['authorization'] || req.headers['Authorization'] || req.headers['x-api-key']
  if (!apiKey || (apiKey !== config.apiKey && apiKey !== `Bearer ${config.apiKey}`)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

module.exports = {
  apiKeyVerify
}

