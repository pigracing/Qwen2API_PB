const Redis = require('ioredis')
const config = require('../config.js')

// 创建单个Redis连接实例
const redis = new Redis(config.redisURL, {
  // TLS配置
  tls: {
    rejectUnauthorized: true
  },
  
  // 重试策略优化
  retryStrategy(times) {
    const maxDelay = 5000 // 最大延迟5秒
    const minDelay = 100  // 最小延迟100ms
    const factor = 2      // 指数退避因子
    
    let delay = Math.min(minDelay * Math.pow(factor, times), maxDelay)
    console.log(`重试次数: ${times}, 延迟: ${delay}ms`)
    return delay
  },
  
  // 连接配置
  maxRetriesPerRequest: 5,        // 每个请求的最大重试次数
  enableOfflineQueue: true,       // 离线时将命令加入队列
  connectTimeout: 15000,          // 连接超时时间
  disconnectTimeout: 3000,        // 断开连接超时时间
  keepAlive: 30000,              // 保持连接的时间
  noDelay: true,                 // 禁用Nagle算法
  autoResubscribe: true,         // 自动重新订阅
  autoResendUnfulfilledCommands: true,
  
  // 错误重连策略
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET']
    if (targetErrors.some(e => err.message.includes(e))) {
      return true
    }
    return false
  },
  
  // 集群和故障转移配置
  retryDelayOnFailover: 200,
  retryDelayOnClusterDown: 1000,
  retryDelayOnTryAgain: 200,
  slotsRefreshTimeout: 2000,
  maxLoadingRetryTime: 15000,
  
  // 连接池配置
  connectionName: 'qwen2api_client',
  db: 0,
  password: config.redisPassword,
  lazyConnect: true
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
  // 添加错误详细信息
  console.error('错误堆栈:', err.stack)
})

redis.on('close', () => {
  console.log('Redis 连接关闭')
})

redis.on('reconnecting', (delay) => {
  console.log(`Redis 正在重新连接...延迟: ${delay}ms, 重试次数: ${redis.retryAttempts}`)
})

redis.on('end', () => {
  console.log('Redis 连接已终止')
})

// 添加新的监控事件
redis.on('wait', () => {
  console.log('等待可用连接...')
})

redis.on('select', (dbIndex) => {
  console.log(`已选择数据库 ${dbIndex}`)
})

/**
 * @description: 获取所有账户
 * @returns {array} - 所有账户信息数组，格式为[{email, password, token, expires}]
 */
redis.getAllAccounts = async function () {
  try {
    const keys = await this.keys('user:*')
    if (!keys.length) {
      console.log('✅ 没有找到任何账户')
      return []
    }

    // 使用pipeline一次性获取所有账户数据
    const pipeline = this.pipeline()
    keys.forEach(key => {
      pipeline.hgetall(key)
    })
    
    const results = await pipeline.exec()
    if (!results) {
      console.log('❌ 获取账户数据失败')
      return []
    }

    const accounts = results.map((result, index) => {
      // result格式为[err, value]
      const [err, accountData] = result
      if (err) {
        console.error(`❌ 获取账户 ${keys[index]} 数据失败:`, err)
        return null
      }
      if (!accountData) {
        console.error(`❌ 账户 ${keys[index]} 数据为空`)
        return null
      }
      return {
        email: keys[index].replace('user:', ''),
        password: accountData.password || '',
        token: accountData.token || '',
        expires: accountData.expires || ''
      }
    }).filter(Boolean) // 过滤掉null值
    
    console.log('✅ 获取所有账户成功，共', accounts.length, '个账户')
    return accounts
  } catch (err) {
    console.error('❌ 获取账户时出错:', err)
    return []
  }
}

/**
 * @description: 设置账户
 * @param {string} key - 键名
 * @param {object} value - 账户信息
 * @returns {boolean} - 如果设置成功返回 true，否则返回 false
 */
redis.setAccount = async function (key, value) {
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
redis.deleteAccount = async function (key) {
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
redis.checkKeyExists = async function (key = 'headers') {
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
