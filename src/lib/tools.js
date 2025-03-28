const crypto = require('crypto')

const isJson = (str) => {
  try {
    JSON.parse(str)
    return true
  } catch (error) {
    return false
  }
}

const sleep = async (ms) => {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

function sha256Encrypt(text) {
  if (typeof text !== 'string') {
    throw new Error('输入必须是字符串类型')
  }
  const hash = crypto.createHash('sha256')
  hash.update(text, 'utf-8')
  return hash.digest('hex')
}

module.exports = {
  isJson,
  sleep,
  sha256Encrypt
}
