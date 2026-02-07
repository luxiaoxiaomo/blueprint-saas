import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// 创建 Redis 客户端（仅在配置了 Redis 时）
let redisClient: ReturnType<typeof createClient> | null = null;

if (process.env.REDIS_HOST) {
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      connectTimeout: 5000, // 5秒超时
      reconnectStrategy: () => {
        // 不自动重连
        return false;
      }
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '0'),
  });

  // 错误处理
  redisClient.on('error', (err) => {
    console.warn('⚠️  Redis 错误（已忽略）:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis 连接成功');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis 客户端就绪');
  });
} else {
  console.log('ℹ️  未配置 Redis，跳过 Redis 初始化');
}

export { redisClient };

// 初始化 Redis 连接
export async function initRedis() {
  if (!redisClient) {
    console.log('ℹ️  Redis 未配置，跳过初始化');
    return;
  }
  
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('✅ Redis 初始化成功');
    }
  } catch (error) {
    console.warn('⚠️  Redis 初始化失败，系统将在没有 Redis 的情况下运行');
    throw error; // 抛出错误让调用者知道失败了
  }
}

// 优雅关闭
export async function closeRedis() {
  if (!redisClient) {
    return;
  }
  
  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('✅ Redis 连接已关闭');
    }
  } catch (error) {
    console.error('❌ Redis 关闭失败:', error);
  }
}
