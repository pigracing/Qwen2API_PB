const crypto = require('crypto')
const { jwtDecode } = require('jwt-decode')


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

const sha256Encrypt = (text) => {
  if (typeof text !== 'string') {
    throw new Error('输入必须是字符串类型')
  }
  const hash = crypto.createHash('sha256')
  hash.update(text, 'utf-8')
  return hash.digest('hex')
}

const JwtDecode = (token) => {
  try {
    const decoded = jwtDecode(token, { complete: true })
    return decoded
  } catch (error) {
    console.error('解析JWT失败:', error.message)
    return null
  }
}

module.exports = {
  isJson,
  sleep,
  sha256Encrypt,
  JwtDecode
}
