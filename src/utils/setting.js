const config = require('../config')
const redisClient = require('./redis')
const fs = require('fs').promises
const path = require('path')
const accountManager = require('./account')

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
        const isExist = Setting.accounts.find(item => item.email === email)
        if (isExist) {
          const index = Setting.accounts.findIndex(item => item.email === email)
          Setting.accounts.splice(index, 1)
        }
        // 无论是否存在，都要添加新的账户信息
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
      const isExist = accountManager.accountTokens.find(item => item.email === email)
      if (isExist) {
        const index = accountManager.accountTokens.findIndex(item => item.email === email)
        accountManager.accountTokens.splice(index, 1)
      }
      // 无论是否存在，都要添加新的账户信息
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

module.exports = {
  saveAccounts,
  deleteAccount
}