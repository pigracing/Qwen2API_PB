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

// 创建单个Redis连接实例
const redis = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  username: redisConfig.username,
  password: redisConfig.password,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  disconnectTimeout: 2000,
  keepAlive: 10000,
  noDelay: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true,
  lazyConnect: true  // 延迟连接，直到第一次使用时才连接
})

// 连接事件处理
redis.on('connect', () => {
  console.log('✅ Redis 连接成功！')
})

redis.on('ready', () => {
  console.log('✅ Redis 准备就绪！')
})

redis.on('error', (err) => {
  console.error('❌ Redis 连接错误:', err)
})

redis.on('close', () => {
  console.log('Redis 连接关闭')
})

redis.on('reconnecting', () => {
  console.log('Redis 正在重新连接...')
})

/**
 * @description: 获取所有账户键
 * @returns {array} - 所有账户键
 */
redis.getAllAccountKeys = async function() {
  try {
    const keys = await this.keys('user:*')
    console.log('✅ 所有账户键:', keys)
    return keys
  } catch (err) {
    console.error('❌ 获取键时出错:', err)
    return []
  }
}

/**
 * @description: 设置账户
 * @param {string} key - 键名
 * @param {object} value - 账户信息
 * @returns {boolean} - 如果设置成功返回 true，否则返回 false
 */
redis.setAccount = async function(key, value) {
  try {
    const { password, token, expires } = value
    await this.hset(`user:${key}`, {
      password,
      token: token || '',
      expires: expires || ''
    })
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
redis.deleteAccount = async function(key) {
  try {
    await this.del(`user:${key}`)
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
redis.checkKeyExists = async function(key = 'headers') {
  try {
    const exists = await this.exists(key)
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

// 添加代理方法，使实例可以直接调用Redis命令
redis.hset = redis.hset.bind(redis)
redis.hget = redis.hget.bind(redis)
redis.hgetall = redis.hgetall.bind(redis)
redis.exists = redis.exists.bind(redis)
redis.keys = redis.keys.bind(redis)
redis.del = redis.del.bind(redis)

// 导出Redis实例
module.exports = redis
