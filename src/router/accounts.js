const express = require('express')
const router = express.Router()
const redisClient = require('../lib/redis')
const accountManager = require('../lib/account')
const { JwtDecode } = require('../lib/tools')
const { apiKeyVerify } = require('./index')

// 获取所有账号（分页）
router.get('/getAllAccounts', apiKeyVerify, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const pageSize = parseInt(req.query.pageSize) || 10
        const start = (page - 1) * pageSize

        // 获取所有账号键
        const allAccounts = accountManager.getAllAccountKeys()
        const total = allAccounts.length
        
        // 分页处理
        const paginatedAccounts = allAccounts.slice(start, start + pageSize)
        
        // 获取每个账号的详细信息
        const accounts = paginatedAccounts.map(account => {
            return {
                email: account.email,
                password: account.password,
                token: `${account.token.slice(0, Math.floor(Math.random() * account.token.length)/2)}...`,
                expires: account.expires
            }
        })

        res.json({
            total,
            page,
            pageSize,
            data: accounts
        })
    } catch (error) {
        console.error('获取账号列表失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 添加账号
router.post('/setAccount', apiKeyVerify, async (req, res) => {
    try {
        const { email, password } = req.body
        
        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码不能为空' })
        }

        // 检查账号是否已存在
        const exists = await redisClient.exists(`user:${email}`)
        if (exists) {
            return res.status(409).json({ error: '账号已存在' })
        }

        const authToken = await accountManager.login(email, password)
        if (!authToken) {
            return res.status(401).json({ error: '登录失败' })
        }
        // 解析JWT
        const decoded = JwtDecode(authToken)
        const expires = decoded.exp

        // 设置账号信息
        const success = await redisClient.setAccount(email, {
            password,
            token: authToken,
            expires: expires
        })

        if (success) {
            accountManager.accountTokens.push({
                email,
                password,
                token: authToken,
                expires: expires
            })
            res.status(200).json({
                email,
                message: '账号创建成功'
            })
        } else {
            res.status(500).json({ error: '账号创建失败' })
        }
    } catch (error) {
        console.error('创建账号失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 删除账号
router.delete('/deleteAccount', apiKeyVerify, async (req, res) => {
    try {
        const { email } = req.body
        
        // 检查账号是否存在
        const exists = await redisClient.exists(`user:${email}`)
        if (!exists) {
            return res.status(404).json({ error: '账号不存在' })
        }

        // 删除账号
        const success = await redisClient.deleteAccount(email)
        
        if (success) {
            accountManager.deleteAccount(email)
            res.json({ message: '账号删除成功' })
        } else {
            res.status(500).json({ error: '账号删除失败' })
        }
    } catch (error) {
        console.error('删除账号失败:', error)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router