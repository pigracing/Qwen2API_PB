const dotenv = require('dotenv')
dotenv.config()

const config = {
  apiKey: process.env.API_KEY || null,
  listenAddress: process.env.LISTEN_ADDRESS || null,
  listenPort: process.env.LISTEN_PORT || 3000,
  apiPrefix: process.env.API_PREFIX || '',
  searchInfoMode: process.env.SEARCH_INFO_MODE === 'true' ? "table" : "text",
  outThink: process.env.OUTPUT_THINK === 'true' ? true : false,
}

module.exports = config
