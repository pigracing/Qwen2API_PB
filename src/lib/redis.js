const Redis = require('ioredis');
const redisClient = new Redis({
  host: 'rational-bass-20482.upstash.io',
  port: 6379,
  password: 'AVACAAIjcDFiNDQ3N2JjMTkxNGU0NWJjODBjZmIxZWI1NjQwMzc2NXAxMA'
})

redisClient.on('connect', () => {
  console.log('✅ Redis 连接成功！')
})

redisClient.on('error', (err) => {
  console.error('❌ Redis 连接错误:', err)
  process.exit(1)
})

module.exports = redisClient
