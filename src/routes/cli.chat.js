const express = require('express')
const router = express.Router()
const config = require('../config/index.js')
const { apiKeyVerify } = require('../middlewares/authorization.js')
const { handleCliChatCompletion } = require('../controllers/cli.chat.js')
const accountManager = require('../utils/account.js')
const cliManager = require('../utils/cli.manager.js')

router.post(`${config.apiPrefix ? config.apiPrefix : ''}/cli/v1/chat/completions`,
    apiKeyVerify,
    async (req, res, next) => {
        const account = accountManager.accountTokens.filter(account => account.cli_info && account.cli_info.request_number < 2000)
        if (account.length === 0) {
            const noCliAccount = accountManager.accountTokens.filter(account => !account.cli_info)
            const randomAccount = noCliAccount[Math.floor(Math.random() * noCliAccount.length)]
            if (randomAccount) {
                randomAccount.cli_info = {
                    access_token: randomAccount.token,
                    refresh_token: randomAccount.token,
                    expiry_date: Date.now() + 3600 * 1000,
                    request_number: 0,
                    refresh_token_interval: setInterval(async () => {
                        const refreshToken = await cliManager.refreshAccessToken({
                            access_token: randomAccount.cli_info.access_token,
                            refresh_token: randomAccount.cli_info.refresh_token,
                            expiry_date: randomAccount.cli_info.expiry_date
                        })

                        if (refreshToken.access_token && refreshToken.refresh_token && refreshToken.expiry_date) {
                            randomAccount.cli_info.access_token = refreshToken.access_token
                            randomAccount.cli_info.refresh_token = refreshToken.refresh_token
                            randomAccount.cli_info.expiry_date = refreshToken.expiry_date
                        }
                    }, 1000 * 60 * 60 * 24)
                }
                req.account = randomAccount
                next()
            }
        }

        const randomAccount = account[Math.floor(Math.random() * account.length)]
        if (randomAccount) {
            req.account = randomAccount
            next()
        }
    },
    handleCliChatCompletion
)

module.exports = router