const express = require('express')
const router = express.Router()
const redisClient = require('../lib/redis')
const accountManager = require('../lib/account')

// 获取所有账号（分页）
router.get('/getAllAccounts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const pageSize = parseInt(req.query.pageSize) || 10
        const start = (page - 1) * pageSize

        // 获取所有账号键
        const allKeys = await redisClient.getAllAccountKeys()
        const total = allKeys.length
        
        // 分页处理
        const paginatedKeys = allKeys.slice(start, start + pageSize)
        
        // 获取每个账号的详细信息
        const accounts = await accountManager.acc(paginatedKeys)

        res.json({
            total,
            page,
            pageSize,
            data: accounts
        })
    } catch (error) {
        console.error('获取账号列表失败:', error);
        res.status(500).json({ error: error.message })
    }
})

// 添加账号
router.post('/setAccount', async (req, res) => {
    try {
        const { username, password, token, expires } = req.body
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' })
        }

        // 检查账号是否已存在
        const exists = await redisClient.exists(`user:${username}`)
        if (exists) {
            return res.status(409).json({ error: '账号已存在' })
        }

        // 设置账号信息
        const success = await redisClient.setAccount(username, {
            password,
            token: token || '',
            expires: expires || ''
        });

        if (success) {
            res.status(201).json({
                username,
                message: '账号创建成功'
            });
        } else {
            res.status(500).json({ error: '账号创建失败' })
        }
    } catch (error) {
        console.error('创建账号失败:', error)
        res.status(500).json({ error: error.message })
    }
})

// 删除账号
router.delete('/deleteAccount', async (req, res) => {
    try {
        const { username } = req.body
        
        // 检查账号是否存在
        const exists = await redisClient.exists(`user:${username}`)
        if (!exists) {
            return res.status(404).json({ error: '账号不存在' })
        }

        // 删除账号
        const success = await redisClient.deleteAccount(username)
        
        if (success) {
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