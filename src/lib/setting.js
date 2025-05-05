const config = require('../config')
const redisClient = require('./redis')
const fs = require('fs').promises
const path = require('path')
const accountManager = require('./account')

const getDefaultHeaders = async () => {
  if (config.dataSaveMode === "redis") {
    try {
      const headers = await redisClient.checkKeyExists('defaultHeaders')
      if (headers) {
        return JSON.parse(redisClient.get('defaultHeaders'))
      } else {
        await redisClient.set('defaultHeaders', JSON.stringify(config.defaultHeaders))
        return config.defaultHeaders
      }
    } catch (error) {
      return config.defaultHeaders
    }
  } else if (config.dataSaveMode === "file") {
    try {
      const Setting = JSON.parse(await fs.readFile(path.join(__dirname, '../../data/data.json'), 'utf-8'))
      if (Setting.defaultHeaders) {
        return JSON.parse(Setting.defaultHeaders)
      } else {
        Setting.defaultHeaders = config.defaultHeaders
        await fs.writeFile(path.join(__dirname, '../../data/data.json'), JSON.stringify(Setting, null, 2))
        return config.defaultHeaders
      }
    } catch (error) {
      return config.defaultHeaders
    }
  } else {
    return config.defaultHeaders
  }
}

const getDefaultCookie = async () => {
  if (config.dataSaveMode === "redis") {
    try {
      const cookie = await redisClient.checkKeyExists('defaultCookie')
      if (cookie) {
        return JSON.parse(redisClient.get('defaultCookie'))
      } else {
        await redisClient.set('defaultCookie', JSON.stringify(config.defaultCookie))
        return config.defaultCookie
      }
    } catch (error) {
      return config.defaultCookie
    }
  } else if (config.dataSaveMode === "file") {
    try {
      const Setting = JSON.parse(await fs.readFile(path.join(__dirname, '../../data/data.json'), 'utf-8'))
      if (Setting.defaultCookie) {
        return Setting.defaultCookie
      } else {
        Setting.defaultCookie = config.defaultCookie
        await fs.writeFile(path.join(__dirname, '../../data/data.json'), JSON.stringify(Setting, null, 2))
        return config.defaultCookie
      }
    } catch (error) {
      return config.defaultCookie
    }
  } else {
    return config.defaultCookie
  }
}

const saveAccounts = async (email, password, token, expires) => {
  if (config.dataSaveMode === "redis") {
    try {
      const success = await redisClient.setAccount(email, {
        password,
        token: token,
        expires: expires
      })
      if (success) {
        await accountManager.loadAccountTokens()
        return true
      } else {
        return false
      }
    } catch (error) {
      console.log(error)
      return false
    }
  } else if (config.dataSaveMode === "file") {
    try {
      const Setting = JSON.parse(await fs.readFile(path.join(__dirname, '../../data/data.json'), 'utf-8'))
      if (Setting.accounts) {
        Setting.accounts.push({
          email,
          password,
          token,
          expires
        })
        await fs.writeFile(path.join(__dirname, '../../data/data.json'), JSON.stringify(Setting, null, 2))
        await accountManager.loadAccountTokens()
        return true
      } else {
        return false
      }
    } catch (error) {
      console.log(error)
      return false
    }
  } else {
    try {
      accountManager.accountTokens.push({
        email,
        password,
        token,
        expires
      })
      return true
    } catch (error) {
      return false
    }
  }
}

const deleteAccount = async (email) => {
  if (config.dataSaveMode === "redis") {
    try {
      await redisClient.deleteAccount(email)
      await accountManager.loadAccountTokens()
      return true
    } catch (error) {
      return false
    }
  } else if (config.dataSaveMode === "file") {
    try {
      const Setting = JSON.parse(await fs.readFile(path.join(__dirname, '../../data/data.json'), 'utf-8'))
      Setting.accounts = Setting.accounts.filter(item => item.email !== email)
      await fs.writeFile(path.join(__dirname, '../../data/data.json'), JSON.stringify(Setting, null, 2))
      await accountManager.loadAccountTokens()
      return true
    } catch (error) {
      return false
    }
  } else {
    try {
      accountManager.accountTokens = accountManager.accountTokens.filter(item => item.email !== email)
      return true
    } catch (error) {
      return false
    }
  }
}

const saveDefaultHeaders = async (headers) => {
  if (config.dataSaveMode === "redis") {
    try {
      await redisClient.set('defaultHeaders', JSON.stringify(headers))
      config.defaultHeaders = headers
      return true
    } catch (error) {
      return false
    }
  } else if (config.dataSaveMode === "file") {
    try {
      const Setting = JSON.parse(await fs.readFile(path.join(__dirname, '../../data/data.json'), 'utf-8'))
      Setting.defaultHeaders = headers
      await fs.writeFile(path.join(__dirname, '../../data/data.json'), JSON.stringify(Setting, null, 2))
      config.defaultHeaders = headers
      return true
    } catch (error) {
      return false
    }
  } else {
    config.defaultHeaders = headers
    return true
  }
}

const saveDefaultCookie = async (cookie) => {
  if (config.dataSaveMode === "redis") {
    try {
      await redisClient.set('defaultCookie', JSON.stringify(cookie))
      config.defaultCookie = cookie
      return true
    } catch (error) {
      return false
    }
  } else if (config.dataSaveMode === "file") {
    try {
      const Setting = JSON.parse(await fs.readFile(path.join(__dirname, '../../data/data.json'), 'utf-8'))
      if (Setting.defaultCookie) {
        Setting.defaultCookie = cookie
        await fs.writeFile(path.join(__dirname, '../../data/data.json'), JSON.stringify(Setting, null, 2))
        config.defaultCookie = cookie
        return true
      } else {
        return false
      }
    } catch (error) {
      return false
    }
  } else {
    config.defaultCookie = cookie
    return true
  }
}

module.exports = {
  getDefaultHeaders,
  getDefaultCookie,
  saveAccounts,
  deleteAccount,
  saveDefaultHeaders,
  saveDefaultCookie
}