/**
 * 解析 Redis URL 字符串
 * @param {string} url - Redis URL
 * @returns {Object} 包含解析后的 Redis 连接信息
 */
function parseRedisUrl(url) {
  try {
    // 使用 URL 对象解析
    const parsedUrl = new URL(url);
    
    return {
      protocol: parsedUrl.protocol.replace(':', ''),
      username: parsedUrl.username || 'default',
      password: parsedUrl.password,
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port) || 6379
    };
  } catch (error) {
    throw new Error('无效的 Redis URL 格式');
  }
}

// 使用示例
const redisUrl = 'redis://default:AVACAAIjcDFiNDQ3N2JjMTkxNGU0NWJjODBjZmIxZWI1NjQwMzc2NXAxMA@rational-bass-20482.upstash.io:6379';
const config = parseRedisUrl(redisUrl);
console.log(config);

module.exports = parseRedisUrl; 