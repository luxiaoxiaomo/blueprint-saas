import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// 创建 Redis 客户端
export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || '0'),
});

// 错误处理
redisClient.on('error', (err) => {
  console.error('❌ Redis 客户端错误:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis 连接成功');
});

redisClient.on('ready', () => {
  console.log('✅ Redis 客户端就绪');
});

// 初始化 Redis 连接
export async function initRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('✅ Redis 初始化成功');
    }
  } catch (error) {
    console.error('❌ Redis 初始化失败:', error);
    console.warn('⚠️  系统将在没有 Redis 的情况下运行（缓存功能将被禁用）');
  }
}

// 优雅关闭
export async function closeRedis() {
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('✅ Redis 连接已关闭');
    }
  } catch (error) {
    console.error('❌ Redis 关闭失败:', error);
  }
}
