const dotenv = require('dotenv')
dotenv.config()

const config = {
  dataSaveMode: process.env.DATA_SAVE_MODE || "none",
  apiKey: process.env.API_KEY || null,
  listenAddress: process.env.LISTEN_ADDRESS || null,
  listenPort: process.env.SERVICE_PORT || 3000,
  apiPrefix: process.env.API_PREFIX || '',
  searchInfoMode: process.env.SEARCH_INFO_MODE === 'table' ? "table" : "text",
  outThink: process.env.OUTPUT_THINK === 'true' ? true : false,
  redisURL: process.env.REDIS_URL || null,
  autoRefresh: false,
  autoRefreshInterval: 6 * 60 * 60,
  cacheMode: process.env.CACHE_MODE || "default",
  ssxmodItna: process.env.SSXMOD_ITNA || "mqUxRDBDnD00I4eKYIxAK0QD2W3nDAQDRDl4Bti=GgexFqAPqDHI63vYWtiiY0DjOxqbVji84D/I7eGzDiMPGhDBeEHzKtg5xKFIWrEx4qICCGxK3OGYZeqK0Ge2Nq3vwn0XX3NyzZiPYxGLDY=DCqqqYorbDYAEDBYD74G+DDeDixGmQeDSDxD9DGPdglTi2eDEDYPdxA3Di4D+jebDmd4DGuo4x7QaRmxD0ux58mDz8aF46PmzMeqOVRbDjTPD/R+LO0RC2FkKYa9AV8amGeGyi5GuDPmb=jHORnniHpeY0d0hbGedW4qTBq=DYx+DP24FGDBirCht5B5QYipOYameDD3bWD+GNbADKpt9gtBoNbGGwiDmmIafRPx2Uem2i44Gb1mGz0pNlqV=Gxlqk8xP2DxD"
}

module.exports = config
