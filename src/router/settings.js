const express = require('express');
const router = express.Router();
const redisClient = require('../lib/redis');
const config = require('../config');

const SETTINGS_KEY = 'settings';

// 初始化设置
async function initializeSettings() {
    const exists = await redisClient.exists(SETTINGS_KEY);
    if (!exists) {
        const defaultSettings = {
            apiKey: config.apiKey,
            defaultHeaders: config.defaultHeaders,
            defaultCookie: config.defaultCookie,
            autoRefresh: config.autoRefresh,
            autoRefreshInterval: config.autoRefreshInterval,
            outThink: config.outThink,
            searchInfoMode: config.searchInfoMode
        };
        await redisClient.hset(SETTINGS_KEY, defaultSettings);
    }
}

// 获取所有设置
router.get('/', async (req, res) => {
    try {
        await initializeSettings();
        const settings = await redisClient.hgetall(SETTINGS_KEY);
        
        // 解析JSON字符串字段
        if (settings.defaultHeaders) {
            settings.defaultHeaders = JSON.parse(settings.defaultHeaders);
        }
        
        res.json(settings);
    } catch (error) {
        console.error('获取设置失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 更新API Key
router.post('/api-key', async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ error: 'API Key不能为空' });
        }

        await redisClient.hset(SETTINGS_KEY, 'apiKey', apiKey);
        res.json({ message: 'API Key更新成功', apiKey });
    } catch (error) {
        console.error('更新API Key失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 更新默认请求头
router.post('/headers', async (req, res) => {
    try {
        const { headers } = req.body;
        if (!headers || typeof headers !== 'object') {
            return res.status(400).json({ error: '无效的请求头格式' });
        }

        await redisClient.hset(SETTINGS_KEY, 'defaultHeaders', JSON.stringify(headers));
        res.json({ message: '默认请求头更新成功', headers });
    } catch (error) {
        console.error('更新默认请求头失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 更新默认Cookie
router.post('/cookie', async (req, res) => {
    try {
        const { cookie } = req.body;
        if (!cookie) {
            return res.status(400).json({ error: 'Cookie不能为空' });
        }

        await redisClient.hset(SETTINGS_KEY, 'defaultCookie', cookie);
        res.json({ message: '默认Cookie更新成功', cookie });
    } catch (error) {
        console.error('更新默认Cookie失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 更新自动刷新设置
router.post('/auto-refresh', async (req, res) => {
    try {
        const { autoRefresh, autoRefreshInterval } = req.body;
        
        if (typeof autoRefresh !== 'boolean') {
            return res.status(400).json({ error: '无效的自动刷新设置' });
        }

        if (autoRefreshInterval !== undefined) {
            const interval = parseInt(autoRefreshInterval);
            if (isNaN(interval) || interval < 0) {
                return res.status(400).json({ error: '无效的自动刷新间隔' });
            }
            await redisClient.hset(SETTINGS_KEY, 'autoRefreshInterval', interval);
        }

        await redisClient.hset(SETTINGS_KEY, 'autoRefresh', autoRefresh);
        res.json({ 
            message: '自动刷新设置更新成功',
            autoRefresh,
            ...(autoRefreshInterval && { autoRefreshInterval })
        });
    } catch (error) {
        console.error('更新自动刷新设置失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 更新思考输出设置
router.post('/out-think', async (req, res) => {
    try {
        const { outThink } = req.body;
        if (typeof outThink !== 'boolean') {
            return res.status(400).json({ error: '无效的思考输出设置' });
        }

        await redisClient.hset(SETTINGS_KEY, 'outThink', outThink);
        res.json({ message: '思考输出设置更新成功', outThink });
    } catch (error) {
        console.error('更新思考输出设置失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 更新搜索信息模式
router.post('/search-info-mode', async (req, res) => {
    try {
        const { searchInfoMode } = req.body;
        if (!['table', 'text'].includes(searchInfoMode)) {
            return res.status(400).json({ error: '无效的搜索信息模式' });
        }

        await redisClient.hset(SETTINGS_KEY, 'searchInfoMode', searchInfoMode);
        res.json({ message: '搜索信息模式更新成功', searchInfoMode });
    } catch (error) {
        console.error('更新搜索信息模式失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 批量更新设置
router.patch('/', async (req, res) => {
    try {
        const updates = req.body;
        const validKeys = [
            'apiKey',
            'defaultHeaders',
            'defaultCookie',
            'autoRefresh',
            'autoRefreshInterval',
            'outThink',
            'searchInfoMode'
        ];

        // 验证更新字段
        for (const key of Object.keys(updates)) {
            if (!validKeys.includes(key)) {
                return res.status(400).json({ error: `无效的设置字段: ${key}` });
            }
        }

        // 特殊处理需要验证的字段
        if (updates.autoRefreshInterval !== undefined) {
            const interval = parseInt(updates.autoRefreshInterval);
            if (isNaN(interval) || interval < 0) {
                return res.status(400).json({ error: '无效的自动刷新间隔' });
            }
            updates.autoRefreshInterval = interval;
        }

        if (updates.searchInfoMode !== undefined && !['table', 'text'].includes(updates.searchInfoMode)) {
            return res.status(400).json({ error: '无效的搜索信息模式' });
        }

        if (updates.defaultHeaders) {
            updates.defaultHeaders = JSON.stringify(updates.defaultHeaders);
        }

        // 更新设置
        await redisClient.hset(SETTINGS_KEY, updates);
        
        // 获取更新后的所有设置
        const settings = await redisClient.hgetall(SETTINGS_KEY);
        if (settings.defaultHeaders) {
            settings.defaultHeaders = JSON.parse(settings.defaultHeaders);
        }

        res.json({
            message: '设置更新成功',
            settings
        });
    } catch (error) {
        console.error('更新设置失败:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 