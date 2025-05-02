const axios = require('axios')
const { sha256Encrypt } = require('./tools')
const { JwtDecode } = require('./tools')
const config = require('../config.js')
const redisClient = require('./redis')


class Account {
  constructor() {

    this.accountTokens = []

    // 加载账户信息
    this.loadAccountTokens()

    // 设置定期刷新令牌 (每6小时刷新一次)
    this.refreshInterval = setInterval(() => config.autoRefresh && this.autoRefreshTokens(), config.autoRefreshInterval * 1000)

    this.currentIndex = 0
    this.models = [
      "qwen3-235b-a22b",
      "qwen3-30b-a3b",
      "qwen3-32b",
      "qwen-max-latest",
      "qwen-plus-2025-01-25",
      "qwq-32b",
      "qwen-turbo-2025-02-11",
      "qwen2.5-omni-7b",
      "qvq-72b-preview-0310",
      "qwen2.5-vl-32b-instruct",
      "qwen2.5-14b-instruct-1m",
      "qwen2.5-coder-32b-instruct",
      "qwen2.5-72b-instruct"
    ]

    this.defaultHeaders = config.defaultHeaders
  }

  async loadAccountTokens() {
    try {
      const accountTokens = await redisClient.getAllAccounts()
      if (accountTokens.length > 0) {
        this.accountTokens = accountTokens
      } else {
        this.accountTokens = []
      }
    } catch (error) {
      console.error('加载账户数据失败:', error)
      this.accountTokens = []
    }
  }


  // 添加自动刷新令牌的方法
  async autoRefreshTokens() {
    console.log('开始自动刷新令牌...')

    // 找出即将过期的令牌 (24小时内过期)
    const now = Math.floor(Date.now() / 1000)
    const expirationThreshold = now + 24 * 60 * 60

    const needsRefresh = this.accountTokens.filter(token => token.expiresAt < expirationThreshold)

    if (needsRefresh.length === 0) {
      console.log('没有需要刷新的令牌')
      return 0
    }

    console.log(`发现 ${needsRefresh.length} 个令牌需要刷新`)
    let refreshedCount = 0
    for (const token of needsRefresh) {
      const refreshed = await this.refreshSingleToken(token)
      if (refreshed) refreshedCount++
    }

    console.log(`成功刷新了 ${refreshedCount} 个令牌`)
    return refreshedCount
  }

  // 添加检查令牌是否即将过期的方法
  isTokenExpiringSoon(token, thresholdHours = 6) {
    const now = Math.floor(Date.now() / 1000)
    const thresholdSeconds = thresholdHours * 60 * 60
    return token.expiresAt - now < thresholdSeconds
  }

  getAccountToken() {

    if (this.accountTokens.length === 0) {
      console.error('没有可用的账户令牌')
      return null
    }

    if (this.currentIndex >= this.accountTokens.length) {
      this.currentIndex = 0
    }

    const token = this.accountTokens[this.currentIndex]
    this.currentIndex++

    if (token.token) {
      return token.token
    } else {
      // 尝试下一个令牌
      return this.getAccountToken()
    }
  }

  // 刷新单个令牌的方法
  async refreshSingleToken(token) {

    try {
      const newToken = await this.login(token.email, token.password)
      if (newToken) {
        const decoded = JwtDecode(newToken)
        const now = Math.floor(Date.now() / 1000)

        // 找到并更新令牌
        const index = this.accountTokens.findIndex(t => t.email === token.email)
        if (index !== -1) {
          this.accountTokens[index] = {
            ...token,
            token: newToken,
            expires: decoded.exp,
          }
          console.log(`刷新令牌成功: ${token.email} (还有${Math.round((decoded.exp - now) / 3600)}小时过期)`)
          return true
        }
      }
    } catch (error) {
      console.error(`刷新令牌失败 (${token.email}):`, error.message)
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

  async getModelList() {
    const modelsList = []
    for (const item of this.models) {
      modelsList.push(item)
      modelsList.push(item + '-thinking')
      modelsList.push(item + '-search')
      modelsList.push(item + '-thinking-search')
      // modelsList.push(item + '-draw')
    }

    const models = {
      "object": "list",
      "data": modelsList.map(item => ({
        "id": item,
        "object": "model",
        "created": new Date().getTime(),
        "owned_by": "qwen"
      })),
      "object": "list"
    }
    return models
  }

  async generateMarkdownTable(websites, mode) {
    // 输入校验
    if (!Array.isArray(websites) || websites.length === 0) {
      return ""
    }

    let markdown = ""
    if (mode === "table") {
      markdown += "| **序号** | **网站URL** | **来源** |\n"
      markdown += "|:---|:---|:---|\n"
    }
    // 默认值
    const DEFAULT_TITLE = "未知标题"
    const DEFAULT_URL = "https://www.baidu.com"
    const DEFAULT_HOSTNAME = "未知来源"

    // 表格内容
    websites.forEach((site, index) => {
      const { title, url, hostname } = site
      // 处理字段值，若为空则使用默认值
      const urlCell = `[${title || DEFAULT_TITLE}](${url || DEFAULT_URL})`
      const hostnameCell = hostname || DEFAULT_HOSTNAME
      if (mode === "table") {
        markdown += `| ${index + 1} | ${urlCell} | ${hostnameCell} |\n`
      } else {
        markdown += `[${index + 1}] ${urlCell} | 来源: ${hostnameCell}\n`
      }
    })

    return markdown
  }

  async setDefaultModels(models) {
    this.models = models
  }

  /**
   * @description: 获取原始模型列表
   * @returns {array} - 模型列表
   */
  async getModels() {
    return this.models
  }

  getAllAccountKeys() {
    return this.accountTokens
  }

  getHeaders() {
    const token = this.getAccountToken()
    const headers = {
      ...this.defaultHeaders,
      "authorization": `Bearer ${token}`,
      "cookie": this.getCookie(token)
    }

    return headers
  }

  getCookie(token) {
    return `token=${token}; ${config.defaultCookie}`
  }

  async login(email, password) {
    try {
      const response = await axios.post('https://chat.qwen.ai/api/v1/auths/signin', {
        email: email,
        password: sha256Encrypt(password)
      }, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0"
        }
      })

      if (response.data && response.data.token) {
        console.log(`${email} 登录成功`)
        return response.data.token
      } else {
        console.error(`${email} 登录响应缺少令牌`)
        return false
      }
    } catch (e) {
      console.error(`${email} 登录失败:`, e.message)
      return false
    }
  }

  deleteAccount(email) {
    const index = this.accountTokens.findIndex(t => t.email === email)
    if (index !== -1) {
      this.accountTokens.splice(index, 1)
      return true
    }
    return false
  }

}

if (!process.env.REDIS_URL && !process.env.API_KEY) {
  console.log('请务必设置 REDIS_URL 或 API_KEY 环境变量')
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
