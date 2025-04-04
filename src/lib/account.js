const axios = require('axios')
const { sha256Encrypt } = require('./tools')
const fs = require('fs')
const path = require('path')
const { JwtDecode } = require('./tools')

// 定义账户类型枚举
const AccountType = {
  UserName: 'username_password',  // 简化名称，但保持值不变
  Token: 'token'
}

class Account {
  constructor(accountTokens) {
    this.accountTokensPath = path.join(__dirname, '../../data/accountTokens.json')
    this.dataDir = path.dirname(this.accountTokensPath)
    
    // 确保数据目录存在
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true })
      } catch (error) {
        console.error('创建数据目录失败:', error)
        process.exit(1)
      }
    }
    
    // 加载账户信息
    this.loadAccountTokens()
    
    // 设置定期保存
    this.saveInterval = setInterval(() => this.saveAccountTokens(), 60000) // 每分钟保存一次
    
    // 设置定期刷新令牌 (每6小时刷新一次)
    this.refreshInterval = setInterval(() => this.autoRefreshTokens(), 6 * 60 * 60 * 1000)
    
    this.init(accountTokens)
    this.currentIndex = 0
    this.models = [
      "qwen-max-latest",
      "qwen-plus-latest",
      "qwen-turbo-latest",
      "qwq-32b",
      "qvq-72b-preview-0310",
      "qwen2.5-omni-7b",
      "qwen2.5-72b-instruct",
      "qwen2.5-coder-32b-instruct",
      "qwen2.5-14b-instruct-1m",
      "qwen2.5-vl-32b-instruct"
    ]

    this.defaultHeaders = {
      "Host": "chat.qwen.ai",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0",
      "Connection": "keep-alive",
      "Accept": "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
      "x-request-id": "647cb70a-cba5-4c36-b2b6-24ffd1cd9ddd",
      "bx-umidtoken": "T2gANtcYZT9YXfuoIZSNG3a6XIXekUQTnHdkm89EvfK4PlAHce3PTY7P2uXFuSyOUD0=",
      "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Microsoft Edge\";v=\"133\", \"Chromium\";v=\"133\"",
      "bx-ua": "231!HfE3n4mU6XD+joD+2A3qn9GjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEkXiDXjNoMrUTUrD8F60zRopdw4q1VCXXb6a3OcTO0aNraYN7OvMJaMSPZflmanlUyoCu/53Ob3Z2axxzeocMRAZBbLWmN5pACia0pqOo32MEW8R00WUQ8Eh/x/9FF9Wsw51YBfIx0BNoJOn3iv7H4JNd4Pn7Fc3kjC0Q3oyE+jlN0WmBO0lGIGHkE+++3+qCS4+ItM2+6yoj2Co+4oHoHrYllvGajKNtZP0VnAemzey5L2aDafscJnytDA0CU9Lr2fBdtUJ05wM85zMV1K82dLiIIwrx7R2j2RhroyQJVkNGvMrbggEB9jwafW9HB4ZSUHvT2o3dfd2ttMeoYcE8eRZaEfwAJaPh4OQH9JOxqVSs4hkFD9V2/l3lDylss7J9hBsENAc8XpkC3H42Vd7Bd3nOh6i2804/kS4sOVefHFQr6uuAKNEN0VgW1lTVHPx6J+v6EsUX5Pia1jhfxu7hrX9M13Xx66nvCmYVqhPLC3khh8T/9iSqWL2Hz923Ah1dYM86HVfctlWbq+Gpz150IcktLUpfZOh+rmO26G34RyjOzKiaqroI0G7TVSS0wRNpTYwwSRhx4XLlTCovLEAeKV9FOdRg7PmqId30ad0Q6pa05uGljSAhW0nhfhQ3hUX7xWM08rUkZdFY77emjkWOMgKoPJ9MGcpbSsosUgT8nY0UDNgJrKZukRbMsmHGcwPfxhlnhTBb792FAmGwIFVauUINI8Rs6iJpp2pOMOTkKFIVp3jtPuSrdXskdpCUAcuVHttIHQlQe4ZBkQwxOd6KTNla89AkF8imVObsEwS2jnygnPJxYFh+XJ5q9p5HsvCf/6lxFzc+x+JLRfEE7vshRemUjRAf58jfCxArX7K2WZtIUrvgW6b6lGYgJmDfpSnNNIzEoixI7SQtdYo0oF49r5yMTeF6Z9X8Tv9a8tGPnc73lcaITtouRfkBiWRJdCg9I8ycMDqJbwUkMjMpF/+c+A0o/inaz4ehRlTxI0upr/OtzdbVkwWcFYbmJuDrZLTlt+MsyE2KmNfVjNccAw4f5OWcjLtKGjX3FUvxpfCobuYKqcOP1q8ku5xQrEQgDXxBSrckylc4qGlzD0b+ykDbkQHec99V6stxgWsT2yGM04ODEqomDk+CkRcKKXzjET5DPA0kJ2j0+XErTyYwP3uwhbNtjcXmo/dCCSC7t1HRp9E+/o0fDMtv2is6aIMBFO4Pq5K5MQ0ESl2Q1/lrQseYqgQbQpKLAaKhmldVJFGCMOlH82qXOnwgQ8RlUlwAbVAYansCMgyrNQASS3Wdj+mjPRjubbT436s5UT2/Tv4+9IaI2fwE1BAGlw2ip8YXZsgfkDI1R7XZpSxiUWx85zfbbcMdqXyOyPM68k4rVksmS5eDb2e2ZJEesRRDo3KLLnGanGlYkMFMpAuBVx",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "bx-v": "2.5.28",
      "origin": "https://chat.qwen.ai",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "referer": "https://chat.qwen.ai/",
      "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      "priority": "u=1, i"
    }
  }

  loadAccountTokens() {
    try {
      if (!fs.existsSync(this.accountTokensPath)) {
        this.accountTokens = []
        this.saveAccountTokens()
      } else {
        const data = fs.readFileSync(this.accountTokensPath, 'utf-8')
        try {
          this.accountTokens = JSON.parse(data)
          // 验证数据格式
          if (!Array.isArray(this.accountTokens)) {
            console.error('账户数据格式错误，重置为空数组')
            this.accountTokens = []
          }
        } catch (jsonError) {
          console.error('解析账户数据失败，创建备份并重置:', jsonError)
          // 创建备份
          const backupPath = `${this.accountTokensPath}.bak.${Date.now()}`
          fs.copyFileSync(this.accountTokensPath, backupPath)
          this.accountTokens = []
        }
      }
    } catch (error) {
      console.error('加载账户数据失败:', error)
      this.accountTokens = []
    }
    
    // 添加自定义方法到数组
    this.accountTokens = this.extendTokensArray(this.accountTokens)
  }
  
  extendTokensArray(array) {
    // 创建代理来拦截修改操作，实现自动保存
    return new Proxy(array, {
      set: (target, prop, value) => {
        target[prop] = value
        this.saveAccountTokens()
        return true
      },
      deleteProperty: (target, prop) => {
        delete target[prop]
        this.saveAccountTokens()
        return true
      }
    })
  }
  
  saveAccountTokens() {
    try {
      fs.writeFileSync(this.accountTokensPath, JSON.stringify(this.accountTokens, null, 2))
    } catch (error) {
      console.error('保存账户数据失败:', error)
    }
  }
  
  // 添加一个方法来清理过期的令牌
  cleanExpiredTokens() {
    const now = Math.floor(Date.now() / 1000)
    const validTokens = this.accountTokens.filter(token => {
      const isValid = token.expiresAt > now
      if (!isValid) {
        console.log(`令牌已过期: ${token.username || token.id}`)
      }
      return isValid
    })
    
    if (validTokens.length !== this.accountTokens.length) {
      this.accountTokens.length = 0 // 清空原数组
      validTokens.forEach(token => this.accountTokens.push(token)) // 添加有效令牌
    }
  }
  
  // 添加自动刷新令牌的方法
  async autoRefreshTokens() {
    console.log('开始自动刷新令牌...')
    
    // 找出即将过期的令牌 (24小时内过期)
    const now = Math.floor(Date.now() / 1000)
    const expirationThreshold = now + 24 * 60 * 60
    
    const needsRefresh = this.accountTokens.filter(token => 
      token.type === AccountType.UserName && token.expiresAt < expirationThreshold
    )
    
    if (needsRefresh.length === 0) {
      console.log('没有需要刷新的令牌')
      return 0
    }
    
    console.log(`发现 ${needsRefresh.length} 个令牌需要刷新`)
    let refreshedCount = 0
    for (let i = 0; i < this.accountTokens.length; i++) {
      const token = this.accountTokens[i]
      // 只刷新类型为username_password且即将过期的令牌
      if (token.type === AccountType.UserName && token.expiresAt < expirationThreshold) {
        const refreshed = await this.refreshSingleToken(token)
        if (refreshed) refreshedCount++
      }
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

  // 修改getAccountToken方法，处理即将过期的令牌
  getAccountToken() {
    this.cleanExpiredTokens() // 每次获取前清理过期令牌
    
    if (this.accountTokens.length === 0) {
      console.error('没有可用的账户令牌')
      return null
    }
    
    if (this.currentIndex >= this.accountTokens.length) {
      this.currentIndex = 0
    }
    
    const token = this.accountTokens[this.currentIndex]
    this.currentIndex++
    
    // 检查令牌是否即将过期
    if (token.type === AccountType.UserName && this.isTokenExpiringSoon(token)) {
      console.log(`令牌即将过期，尝试刷新: ${token.username}`)
      // 异步刷新令牌，不阻塞当前请求
      this.refreshSingleToken(token).catch(err => 
        console.error(`刷新令牌失败 (${token.username}):`, err.message)
      )
    }
    
    // 更新请求计数
    token.requestNumber = (token.requestNumber || 0) + 1
    token.lastUsed = new Date().toISOString()
    
    if (token.token) {
      return token.token
    } else {
      // 尝试下一个令牌
      return this.getAccountToken()
    }
  }

  // 刷新单个令牌的方法
  async refreshSingleToken(token) {
    if (token.type !== AccountType.UserName) {
      return false
    }
    
    try {
      const newToken = await this.login(token.username, token.password)
      if (newToken) {
        const decoded = JwtDecode(newToken)
        const now = Math.floor(Date.now() / 1000)
        
        // 找到并更新令牌
        const index = this.accountTokens.findIndex(t => t.username === token.username)
        if (index !== -1) {
          this.accountTokens[index] = {
            ...token,
            token: newToken,
            expiresAt: decoded.exp,
            lastRefreshed: new Date().toISOString()
          }
          console.log(`刷新令牌成功: ${token.username} (还有${Math.round((decoded.exp - now) / 3600)}小时过期)`)
          return true
        }
      }
    } catch (error) {
      console.error(`刷新令牌失败 (${token.username}):`, error.message)
    }
    
    return false
  }

  init(accountTokens) {
    if (!accountTokens) return
    
    const accountTokensArray = accountTokens.split(',')
    accountTokensArray.forEach(async (token) => {
      if (token.includes(';')) {
        const account = token.split(';')
        const username = account[0]
        const password = account[1]

        // 检查是否已存在该用户的有效令牌
        const existingAccount = this.accountTokens.find(item => item.username === username)
        if (existingAccount) {
          // 检查令牌是否过期
          const now = Math.floor(Date.now() / 1000)
          if (existingAccount.expiresAt > now) {
            console.log(`${username} 令牌有效，跳过登录`)
            return
          }
          console.log(`${username} 令牌已过期，重新登录`)
        }

        const accountToken = await this.login(username, password)
        if (accountToken) {
          const decoded = JwtDecode(accountToken)
          
          // 如果用户已存在，更新令牌信息
          if (existingAccount) {
            const index = this.accountTokens.findIndex(item => item.username === username)
            if (index !== -1) {
              this.accountTokens[index] = {
                ...existingAccount,
                token: accountToken,
                expiresAt: decoded.exp,
                lastRefreshed: new Date().toISOString()
              }
              return
            }
          }
          
          // 添加新用户
          this.accountTokens.push({
            type: AccountType.UserName,
            id: decoded.id,
            username: username,
            password: password,
            token: accountToken,
            requestNumber: 0,
            expiresAt: decoded.exp,
            addedAt: new Date().toISOString()
          })
        }
      } else {
        // 处理直接提供的token
        // 检查是否已存在该token
        if (this.accountTokens.find(item => item.token === token)) {
          return
        }

        try {
          const decoded = JwtDecode(token)
          // 检查令牌是否已过期
          const now = Math.floor(Date.now() / 1000)
          if (decoded.exp <= now) {
            console.log(`令牌已过期: ${decoded.id || token.substring(0, 10)}...`)
            return
          }
          
          this.accountTokens.push({
            type: AccountType.Token,
            id: decoded.id,
            username: '未设置',
            password: '未设置',
            token: token,
            requestNumber: 0,
            expiresAt: decoded.exp,
            addedAt: new Date().toISOString()
          })
        } catch (error) {
          console.error('无效令牌:', token.substring(0, 10) + '...')
        }
      }
    })
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

  async checkAccountToken(token) {
    try {
      await axios.get('https://chat.qwen.ai/api/chat/completions', {
        "model": "qwq-32b",
        "messages": [
          {
            "role": "user",
            "content": "你好"
          }
        ],
        "stream": false,
        "chat_type": "t2t",
        "id": uuid.v4()
      }, {
        headers: this.getHeaders(token)
      })
      return response.status === 200
    } catch (error) {
      console.error('验证令牌失败:', error.message)
      return false
    }
  }

  async getModelList() {
    const modelsList = []
    for (const item of this.models) {
      modelsList.push(item)
      modelsList.push(item + '-thinking')
      modelsList.push(item + '-search')
      modelsList.push(item + '-thinking-search')
      modelsList.push(item + '-draw')
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

  async getModels() {
    return this.models
  }

  getHeaders(authToken) {
    const headers = {
      ...this.defaultHeaders,
      "authorization": `Bearer ${authToken}`,
      "cookie": `_gcl_au=1.1.828597960.1740456102;cna=qS5EIEcjlH0BASQOBGAZfs5p;acw_tc=13b5be1680f7cde2106f40ee928d097af327aba086a9228880897a73ecb3aafb;token=${authToken};xlly_s=1;ssxmod_itna=mqUxRDBDnD00I4eKYIxAK0QD2W3nDAQDRDl4Bti=GgexFqAPqDHIa3vY8i0W0DjObNem07GneDl=24oDSxD6HDK4GTmzgh2rse77ObPpKYQ7R2xK7Amx4cTilPo+gY=GEUPn3rMI6FwDCPDExGkPrmrDeeaDCeDQxirDD4DADibe4D1GDDkD0+m7UovW4GWDm+mDWPDYxDrbRYDRPxD0ZmGDQI3aRDDBgGqob0CESfGR4bUO+hLGooD9E4DsO2nQYO6Wk=qGS8uG13bQ40kmq0OC4bAeILQa38vvb4ecEDoV=mxYamN10DOK0ZIGNjGN0DK02kt+4j0xRG4lhrQwFfYoDDWmAq8es8mGmACAT1ju1m7YTi=eDofhpY847DtKYxIO+gG=lDqeDpFidgOD/MhKhx4D;ssxmod_itna2=mqUxRDBDnD00I4eKYIxAK0QD2W3nDAQDRDl4Bti=GgexFqAPqDHIa3vY8i0W0DjObNem07GeDAYg25EoK0Gx03K+UeDsXWBk3hA77G1R5XFltYQ0EqlfYj5XW2iYjxf3l4tdco06thrWXGiW+cFHXQrO7QxF/CydRcHQsPA4LxPFc=AxoKpPD1F1bEPz/O283eHkOiYG/7DFLZbOozFFbZbH/BwaKjcF7Sn1r/psVBEWv9MP69pCFgqGiScCq/406p8WDwrXDtjP7hDaYUP4updgT0HrO/Y0god6QnKGD8DqhqYsqGDwYtP9Yt4oPQhAZDYqbPD=DzhYE26QPARiDKo6BGGzaoXn6dKPemrM2PKZYfAQ/DiN7PE2vV0DbiDGQmVepx7GUBhxPT2B5/1ufDRN4d8/hM7E6emvnuNtDwRjdi4blREb4wGq10qgl5dicH8eQnexD;SERVERID=0a3251b1bff13a18b856bcf1852f8829|1740834371|1740834361;SERVERCORSID=0a3251b1bff13a18b856bcf1852f8829|1740834371|1740834361;tfstk=gPzmGd62kooXVyepH8ufvlDQWTIRGIgsxRLtBVHN4Yk7kRIjBu0aTJmtbiZYEIauKFLAhiNwSV3Np9QdJSNo5VWp4f9awKGjiF7tQn-rlfUww0dFJSNXauNajS_pIvg355kaQmor4jHrgno4Q4RrMY8q_ElwU_csUVlq0m-zafh6gfkaQ75o1YkZ7Vl09Fk37zaPUrRE4Yhm4zcmmvPlAF8MojJKpSkJ7FkmimqYgYYw7zqRLJ-s3MO-CqHbZj21REgqjlzxzrWP72rQEPmE-GCj05quCqUP_nkUD-3zukAw77000caZxKXoLrNzR4oR86VzP-Fbr5dN7beKUSaqSw5IoqkqrbaOFEkg4lzxcV9VIAauarrG4RtyYw1y53D94hts0bGopKGwPsvDzz35Z_xCcmlSM9ClZhOq0bGIJ_fkYeoqNjel.;isg=BPz8BdNVt0zUyoPuxsZIFaJNzZqu9aAfdEJYtdZ9jOfKoZ4r_gYOroLXhcnZ6dh3`
    }

    return headers
  }

  async login(username, password) {
    try {
      const response = await axios.post('https://chat.qwen.ai/api/v1/auths/signin', {
        email: username,
        password: sha256Encrypt(password)
      }, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0"
        }
      })
      
      if (response.data && response.data.token) {
        console.log(`${username} 登录成功`)
        return response.data.token
      } else {
        console.error(`${username} 登录响应缺少令牌`)
        return false
      }
    } catch (e) {
      console.error(`${username} 登录失败:`, e.message)
      return false
    }
  }
}

if ((!process.env.ACCOUNT_TOKENS && process.env.API_KEY) || (process.env.ACCOUNT_TOKENS && !process.env.API_KEY)) {
  console.log('如果需要使用多账户，请设置ACCOUNT_TOKENS和API_KEY')
  process.exit(1)
}

const accountTokens = process.env.ACCOUNT_TOKENS
let accountManager = null

if (accountTokens) {
  accountManager = new Account(accountTokens)
  
  // 添加进程退出时的清理
  process.on('exit', () => {
    if (accountManager) {
      accountManager.destroy()
    }
  })
  
  // 处理意外退出
  process.on('SIGINT', () => {
    console.log('正在保存账户数据...')
    if (accountManager) {
      accountManager.saveAccountTokens()
      accountManager.destroy()
    }
    process.exit(0)
  })
}

module.exports = accountManager
