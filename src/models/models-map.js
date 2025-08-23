const axios = require('axios')
const accountManager = require('../utils/account.js')

let cachedModels = null
let fetchPromise = null

const getLatestModels = async (force = false) => {
    // 如果有缓存且不强制刷新，直接返回
    if (cachedModels && !force) {
        return cachedModels
    }
    
    // 如果正在获取，返回当前的 Promise
    if (fetchPromise) {
        return fetchPromise
    }
    
    fetchPromise = axios.get('https://chat.qwen.ai/api/models', {
        headers: {
            'Authorization': `Bearer ${accountManager.getAccountToken()}`
        }
    }).then(response => {
        cachedModels = response.data.data
        fetchPromise = null
        return cachedModels
    }).catch(error => {
        console.error('Error fetching latest models:', error)
        fetchPromise = null
        return []
    })
    
    return fetchPromise
}

module.exports = { getLatestModels }