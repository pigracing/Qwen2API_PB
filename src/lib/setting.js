const config = require('../config')
const redisClient = require('./redis')

const getDefaultHeaders = async () => {
  const headers = await redisClient.get('defaultHeaders')
  if (!headers) {
    redisClient.set('defaultHeaders', JSON.stringify(config.defaultHeaders))
    return config.defaultHeaders
  }
  console.log(headers)
  return JSON.parse(headers)
}

const getDefaultCookie = async () => {
  const cookie = await redisClient.get('defaultCookie')
  if (!cookie) {
    redisClient.set('defaultCookie', JSON.stringify(config.defaultCookie))
    return config.defaultCookie
  }
  return JSON.parse(cookie)
}


module.exports = {
  getDefaultHeaders,
  getDefaultCookie
}