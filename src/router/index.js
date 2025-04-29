const config = require('../config')
const apiKeyVerify = (req, res, next) => {
    const apiKey = req.headers['authorization'] || req.headers['Authorization']
    if (!apiKey || apiKey !== config.apiKey) {
        return res.status(401).json({ error: 'Unauthorized' })
    }
    next()
}

module.exports = {
    apiKeyVerify
}

