const config = require('../config/index.js')
const DataPersistence = require('./data-persistence')
const TokenManager = require('./token-manager')
const AccountRotator = require('./account-rotator')
const { generateApiModelList, getBaseModels } = require('./model-utils')
const { logger } = require('./logger')
/**
 * 账户管理器
 * 统一管理账户、令牌、模型等功能
 */
class Account {
  constructor() {
    // 初始化各个管理器
    this.dataPersistence = new DataPersistence()
    this.tokenManager = new TokenManager()
    this.accountRotator = new AccountRotator()

    // 账户数据
    this.accountTokens = []
    this.isInitialized = false

    // 配置信息
    this.defaultHeaders = config.defaultHeaders || {}

    // 初始化
    this._initialize()
  }

  /**
   * 异步初始化
   * @private
   */
  async _initialize() {
    try {
      // 加载账户信息
      await this.loadAccountTokens()

      // 设置定期刷新令牌
      if (config.autoRefresh) {
        this.refreshInterval = setInterval(
          () => this.autoRefreshTokens(),
          (config.autoRefreshInterval || 21600) * 1000 // 默认6小时
        )
      }

      this.isInitialized = true
      logger.success(`账户管理器初始化完成，共加载 ${this.accountTokens.length} 个账户`, 'ACCOUNT')
    } catch (error) {
      logger.error('账户管理器初始化失败', 'ACCOUNT', '', error)
    }
  }

  /**
   * 加载账户令牌数据
   * @returns {Promise<void>}
   */
  async loadAccountTokens() {
    try {
      this.accountTokens = await this.dataPersistence.loadAccounts()

      // 如果是环境变量模式，需要进行登录获取令牌
      if (config.dataSaveMode === 'env' && this.accountTokens.length > 0) {
        await this._loginEnvironmentAccounts()
      }

      // 验证和清理无效令牌
      await this._validateAndCleanTokens()

      // 更新账户轮询器
      this.accountRotator.setAccounts(this.accountTokens)

      logger.success(`成功加载 ${this.accountTokens.length} 个账户`, 'ACCOUNT')
    } catch (error) {
      logger.error('加载账户令牌失败', 'ACCOUNT', '', error)
      this.accountTokens = []
    }
  }

  /**
   * 为环境变量模式的账户进行登录
   * @private
   */
  async _loginEnvironmentAccounts() {
    const loginPromises = this.accountTokens.map(async (account) => {
      if (!account.token && account.email && account.password) {
        const token = await this.tokenManager.login(account.email, account.password)
        if (token) {
          const decoded = this.tokenManager.validateToken(token)
          if (decoded) {
            account.token = token
            account.expires = decoded.exp
          }
        }
      }
      return account
    })

    this.accountTokens = await Promise.all(loginPromises)
  }

  /**
   * 验证和清理无效令牌
   * @private
   */
  async _validateAndCleanTokens() {
    const validAccounts = []

    for (const account of this.accountTokens) {
      if (account.token && this.tokenManager.validateToken(account.token)) {
        validAccounts.push(account)
      } else if (account.email && account.password) {
        // 尝试重新登录
        logger.info(`令牌无效，尝试重新登录: ${account.email}`, 'TOKEN', '🔄')
        const newToken = await this.tokenManager.login(account.email, account.password)
        if (newToken) {
          const decoded = this.tokenManager.validateToken(newToken)
          if (decoded) {
            account.token = newToken
            account.expires = decoded.exp
            validAccounts.push(account)
          }
        }
      }
    }

    this.accountTokens = validAccounts
  }


  /**
   * 自动刷新即将过期的令牌
   * @param {number} thresholdHours - 过期阈值（小时）
   * @returns {Promise<number>} 成功刷新的令牌数量
   */
  async autoRefreshTokens(thresholdHours = 24) {
    if (!this.isInitialized) {
      logger.warn('账户管理器尚未初始化，跳过自动刷新', 'TOKEN')
      return 0
    }

    logger.info('开始自动刷新令牌...', 'TOKEN', '🔄')

    const result = await this.tokenManager.batchRefreshTokens(this.accountTokens, thresholdHours)

    // 更新内存中的账户数据
    result.refreshed.forEach(updatedAccount => {
      const index = this.accountTokens.findIndex(acc => acc.email === updatedAccount.email)
      if (index !== -1) {
        this.accountTokens[index] = updatedAccount
      }
    })

    // 保存更新后的数据
    if (result.refreshed.length > 0) {
      await this._saveUpdatedAccounts(result.refreshed)
      this.accountRotator.setAccounts(this.accountTokens)
    }

    // 处理失败的账户
    result.failed.forEach(account => {
      this.accountRotator.recordFailure(account.email)
    })

    return result.refreshed.length
  }

  /**
   * 获取可用的账户令牌
   * @returns {string|null} 账户令牌或null
   */
  getAccountToken() {
    if (!this.isInitialized) {
      logger.warn('账户管理器尚未初始化完成', 'ACCOUNT')
      return null
    }

    if (this.accountTokens.length === 0) {
      logger.error('没有可用的账户令牌', 'ACCOUNT')
      return null
    }

    const token = this.accountRotator.getNextToken()
    if (!token) {
      logger.error('所有账户令牌都不可用', 'ACCOUNT')
    }

    return token
  }

  /**
   * 根据邮箱获取特定账户的令牌
   * @param {string} email - 邮箱地址
   * @returns {string|null} 账户令牌或null
   */
  getTokenByEmail(email) {
    return this.accountRotator.getTokenByEmail(email)
  }

  /**
   * 保存更新后的账户数据
   * @param {Array} updatedAccounts - 更新后的账户列表
   * @private
   */
  async _saveUpdatedAccounts(updatedAccounts) {
    try {
      for (const account of updatedAccounts) {
        await this.dataPersistence.saveAccount(account.email, {
          password: account.password,
          token: account.token,
          expires: account.expires
        })
      }
    } catch (error) {
      logger.error('保存更新后的账户数据失败', 'ACCOUNT', '', error)
    }
  }

  /**
   * 手动刷新指定账户的令牌
   * @param {string} email - 邮箱地址
   * @returns {Promise<boolean>} 刷新是否成功
   */
  async refreshAccountToken(email) {
    const account = this.accountTokens.find(acc => acc.email === email)
    if (!account) {
      logger.error(`未找到邮箱为 ${email} 的账户`, 'ACCOUNT')
      return false
    }

    const updatedAccount = await this.tokenManager.refreshToken(account)
    if (updatedAccount) {
      // 更新内存中的数据
      const index = this.accountTokens.findIndex(acc => acc.email === email)
      if (index !== -1) {
        this.accountTokens[index] = updatedAccount
      }

      // 保存到持久化存储
      await this.dataPersistence.saveAccount(email, {
        password: updatedAccount.password,
        token: updatedAccount.token,
        expires: updatedAccount.expires
      })

      // 重置失败计数
      this.accountRotator.resetFailures(email)

      return true
    }

    return false
  }

  // 更新销毁方法，清除定时器
  destroy() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  }

  /**
   * 获取模型列表（OpenAI API 格式）
   * @returns {Promise<Object>} 模型列表
   */
  async getModelList() {
    return generateApiModelList()
  }

  /**
   * 生成 Markdown 表格
   * @param {Array} websites - 网站信息数组
   * @param {string} mode - 模式 ('table' 或 'text')
   * @returns {Promise<string>} Markdown 字符串
   */
  async generateMarkdownTable(websites, mode) {
    // 输入校验
    if (!Array.isArray(websites) || websites.length === 0) {
      return ''
    }

    let markdown = ''
    if (mode === 'table') {
      markdown += '| **序号** | **网站URL** | **来源** |\n'
      markdown += '|:---|:---|:---|\n'
    }

    // 默认值
    const DEFAULT_TITLE = '未知标题'
    const DEFAULT_URL = 'https://www.baidu.com'
    const DEFAULT_HOSTNAME = '未知来源'

    // 表格内容
    websites.forEach((site, index) => {
      const { title, url, hostname } = site
      // 处理字段值，若为空则使用默认值
      const urlCell = `[${title || DEFAULT_TITLE}](${url || DEFAULT_URL})`
      const hostnameCell = hostname || DEFAULT_HOSTNAME
      if (mode === 'table') {
        markdown += `| ${index + 1} | ${urlCell} | ${hostnameCell} |\n`
      } else {
        markdown += `[${index + 1}] ${urlCell} | 来源: ${hostnameCell}\n`
      }
    })

    return markdown
  }

  /**
   * 设置默认模型列表（已废弃，模型列表由 models-map.js 管理）
   * @param {Array<string>} models - 模型列表
   * @deprecated 模型列表现在由 models-map.js 统一管理
   */
  async setDefaultModels(models) {
    logger.warn('setDefaultModels 方法已废弃，模型列表由 models-map.js 统一管理', 'ACCOUNT')
  }

  /**
   * 获取基础模型列表
   * @returns {Promise<Array<string>>} 基础模型列表
   */
  async getModels() {
    return getBaseModels()
  }

  /**
   * 获取所有账户信息
   * @returns {Array} 账户列表
   */
  getAllAccountKeys() {
    return this.accountTokens
  }

  /**
   * 用户登录（委托给 TokenManager）
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @returns {Promise<string|null>} 令牌或null
   */
  async login(email, password) {
    return await this.tokenManager.login(email, password)
  }

  /**
   * 获取账户健康状态统计
   * @returns {Object} 健康状态统计
   */
  getHealthStats() {
    const tokenStats = this.tokenManager.getTokenHealthStats(this.accountTokens)
    const rotatorStats = this.accountRotator.getStats()

    return {
      accounts: tokenStats,
      rotation: rotatorStats,
      initialized: this.isInitialized
    }
  }

  /**
   * 记录账户使用失败
   * @param {string} email - 邮箱地址
   */
  recordAccountFailure(email) {
    this.accountRotator.recordFailure(email)
  }

  /**
   * 重置账户失败计数
   * @param {string} email - 邮箱地址
   */
  resetAccountFailures(email) {
    this.accountRotator.resetFailures(email)
  }

  /**
   * 添加新账户
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @returns {Promise<boolean>} 添加是否成功
   */
  async addAccount(email, password) {
    try {
      // 检查账户是否已存在
      const existingAccount = this.accountTokens.find(acc => acc.email === email)
      if (existingAccount) {
        logger.warn(`账户 ${email} 已存在`, 'ACCOUNT')
        return false
      }

      // 尝试登录获取令牌
      const token = await this.tokenManager.login(email, password)
      if (!token) {
        logger.error(`账户 ${email} 登录失败，无法添加`, 'ACCOUNT')
        return false
      }

      const decoded = this.tokenManager.validateToken(token)
      if (!decoded) {
        logger.error(`账户 ${email} 令牌无效，无法添加`, 'ACCOUNT')
        return false
      }

      const newAccount = {
        email,
        password,
        token,
        expires: decoded.exp
      }

      // 添加到内存
      this.accountTokens.push(newAccount)

      // 保存到持久化存储
      await this.dataPersistence.saveAccount(email, newAccount)

      // 更新轮询器
      this.accountRotator.setAccounts(this.accountTokens)

      logger.success(`成功添加账户: ${email}`, 'ACCOUNT')
      return true
    } catch (error) {
      logger.error(`添加账户失败 (${email})`, 'ACCOUNT', '', error)
      return false
    }
  }

  /**
   * 移除账户
   * @param {string} email - 邮箱地址
   * @returns {Promise<boolean>} 移除是否成功
   */
  async removeAccount(email) {
    try {
      const index = this.accountTokens.findIndex(acc => acc.email === email)
      if (index === -1) {
        logger.warn(`账户 ${email} 不存在`, 'ACCOUNT')
        return false
      }

      // 从内存中移除
      this.accountTokens.splice(index, 1)

      // 更新轮询器
      this.accountRotator.setAccounts(this.accountTokens)

      logger.success(`成功移除账户: ${email}`, 'ACCOUNT')
      return true
    } catch (error) {
      logger.error(`移除账户失败 (${email})`, 'ACCOUNT', '', error)
      return false
    }
  }

  /**
   * 删除账户（向后兼容）
   * @param {string} email - 邮箱地址
   * @returns {boolean} 删除是否成功
   */
  deleteAccount(email) {
    const index = this.accountTokens.findIndex(t => t.email === email)
    if (index !== -1) {
      this.accountTokens.splice(index, 1)
      this.accountRotator.setAccounts(this.accountTokens)
      return true
    }
    return false
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }

    this.accountRotator.reset()
    logger.info('账户管理器已清理资源', 'ACCOUNT', '🧹')
  }

}

if (!(process.env.API_KEY || config.apiKey)) {
  logger.error('请务必设置 API_KEY 环境变量', 'CONFIG', '⚙️')
  process.exit(1)
}

const accountManager = new Account()

// 添加进程退出时的清理
process.on('exit', () => {
  if (accountManager) {
    accountManager.destroy()
  }
})

// 处理意外退出
process.on('SIGINT', () => {
  if (accountManager) {
    accountManager.destroy()
  }
  process.exit(0)
})


module.exports = accountManager