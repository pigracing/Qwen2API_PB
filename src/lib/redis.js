const Redis = require('ioredis')
const config = require('../config.js')

function parseRedisUrl(url) {
  try {
    const parsedUrl = new URL(url)

    return {
      protocol: parsedUrl.protocol.replace(':', ''),
      username: parsedUrl.username || 'default',
      password: parsedUrl.password,
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port) || 6379
    }
  } catch (error) {
    throw new Error('无效的 Redis URL 格式')
  }
}

const redisConfig = parseRedisUrl(config.redisURL)

const redisClient = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  username: redisConfig.username,
  password: redisConfig.password
})

redisClient.on('connect', () => {
  console.log('✅ Redis 连接成功！')
})

redisClient.on('error', (err) => {
  console.error('❌ Redis 连接错误:', err)
  process.exit(1)
})


/**
 * @description: 获取所有账户键
 * @returns {array} - 所有账户键
 */
redisClient.prototype.getAllAccountKeys = async () => {
  try {
    let keys = []
    let cursor = '0'

    do {
      const result = await redisClient.scan(cursor, 'MATCH', 'user:*')
      cursor = result[0]
      keys = keys.concat(result[1])
    } while (cursor !== '0')

    console.log('✅ 所有账户键:', keys)
    return keys
  } catch (err) {
    console.error('❌ 获取键时出错:', err)
  }
}

/**
 * @description: 设置账户
 * @param {string} key - 键名
 * @param {object} value - 账户信息
 * @returns {boolean} - 如果设置成功返回 true，否则返回 false
 */
redisClient.prototype.setAccount = async (key, value) => {
  try {
    const { password, token, expires } = value
    await redisClient.hset(`user:${key}`, 'password', password)
    await redisClient.hset(`user:${key}`, 'token', token)
    await redisClient.hset(`user:${key}`, 'expires', expires)
    console.log('✅ 账户设置成功！')
    return true
  } catch (err) {
    console.error('❌ 账户设置失败:', err)
    return false
  }
}


/**
 * @description: 删除账户
 * @param {string} key - 键名
 * @returns {boolean} - 如果删除成功返回 true，否则返回 false
 */
redisClient.prototype.deleteAccount = async (key) => {
  try {
    await redisClient.del(`user:${key}`)
    console.log('✅ 账户删除成功！')
    return true
  } catch (err) {
    console.error('❌ 账户删除失败:', err)
    return false
  }
}


/**
 * @description: 检查键是否存在
 * @param {string} key - 键名
 * @returns {boolean} - 如果键存在返回 true，否则返回 false
 */
redisClient.prototype.checkKeyExists = async (key = 'headers') => {
  try {
    const exists = await redisClient.exists(key)
    if (exists === 1) {
      console.log(`✅ 键 "${key}" 存在！`)
      return true
    } else {
      console.log(`❌ 键 "${key}" 不存在。`)
      return false
    }
  } catch (err) {
    console.error(`❌ 检查键 "${key}" 时出错:`, err)
    return false
  }
}



module.exports = redisClient
