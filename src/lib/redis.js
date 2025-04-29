const Redis = require('ioredis')
const config = require('../config.js')

class RedisManager {
  constructor() {
    if (!RedisManager.instance) {
      this.client = this.createConnection()
      RedisManager.instance = this
    }
    return RedisManager.instance
  }

  createConnection() {
    const redisConfig = this.parseRedisUrl(config.redisURL)
    const client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      username: redisConfig.username,
      password: redisConfig.password,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      }
    })

    client.on('connect', () => {
      console.log('✅ Redis 连接成功！')
    })

    client.on('error', (err) => {
      console.error('❌ Redis 连接错误:', err)
    })

    return client
  }

  parseRedisUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return {
        protocol: parsedUrl.protocol.replace(':', ''),
        username: parsedUrl.username || 'default',
        password: parsedUrl.password,
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 6379
      };
    } catch (error) {
      throw new Error('无效的 Redis URL 格式');
    }
  }

  async getAllAccountKeys() {
    try {
      const keys = await this.client.keys('user:*')
      console.log('✅ 所有账户键:', keys)
      return keys
    } catch (err) {
      console.error('❌ 获取键时出错:', err)
      return []
    }
  }

  async setAccount(key, value) {
    try {
      const { password, token, expires } = value;
      await this.client.hset(`user:${key}`, {
        password,
        token: token || '',
        expires: expires || ''
      });
      console.log('✅ 账户设置成功！')
      return true;
    } catch (err) {
      console.error('❌ 账户设置失败:', err)
      return false
    }
  }

  async deleteAccount(key) {
    try {
      await this.client.del(`user:${key}`)
      console.log('✅ 账户删除成功！')
      return true
    } catch (err) {
      console.error('❌ 账户删除失败:', err)
      return false
    }
  }

  async checkKeyExists(key = 'headers') {
    try {
      const exists = await this.client.exists(key)
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
  async hset(key, ...args) {
    return this.client.hset(key, ...args)
  }

  async hget(key, field) {
    return this.client.hget(key, field)
  }

  async hgetall(key) {
    return this.client.hgetall(key)
  }

  async exists(key) {
    return this.client.exists(key)
  }

  async keys(pattern) {
    return this.client.keys(pattern)
  }

  async del(key) {
    return this.client.del(key)
  }
}

// 创建单例实例
const redisManager = new RedisManager()

// 导出单例实例
module.exports = redisManager
