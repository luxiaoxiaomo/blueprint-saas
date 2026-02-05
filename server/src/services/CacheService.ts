/**
 * CacheService - 缓存服务
 * 提供内存缓存和 Redis 缓存支持
 */

import { OntologyObject } from '../ontology/types.js';

/**
 * 缓存配置
 */
export interface CacheConfig {
  ttl?: number; // 默认过期时间（秒）
  maxSize?: number; // 最大缓存条目数
  enableRedis?: boolean; // 是否启用 Redis
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * 缓存服务
 * 
 * 支持两种缓存模式：
 * 1. 内存缓存（默认）- 快速但有容量限制
 * 2. Redis 缓存（可选）- 持久化且支持分布式
 */
export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private config: Required<CacheConfig>;
  private redis: any; // Redis 客户端（可选）
  
  constructor(config: CacheConfig = {}) {
    this.cache = new Map();
    this.config = {
      ttl: config.ttl || 300, // 默认 5 分钟
      maxSize: config.maxSize || 1000, // 默认最多 1000 条
      enableRedis: config.enableRedis || false,
    };
    
    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
  }
  
  /**
   * 设置 Redis 客户端
   */
  setRedisClient(redis: any): void {
    this.redis = redis;
  }
  
  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    // 优先从内存缓存获取
    const entry = this.cache.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.value as T;
      } else {
        // 过期，删除
        this.cache.delete(key);
      }
    }
    
    // 如果启用了 Redis，尝试从 Redis 获取
    if (this.config.enableRedis && this.redis) {
      try {
        const value = await this.redis.get(key);
        if (value) {
          const parsed = JSON.parse(value);
          // 同步到内存缓存
          this.set(key, parsed, this.config.ttl);
          return parsed as T;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }
    
    return null;
  }
  
  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.config.ttl) * 1000;
    
    // 检查缓存大小限制
    if (this.cache.size >= this.config.maxSize) {
      // 删除最旧的条目
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    // 设置内存缓存
    this.cache.set(key, { value, expiresAt });
    
    // 如果启用了 Redis，同步到 Redis
    if (this.config.enableRedis && this.redis) {
      try {
        await this.redis.setex(
          key,
          ttl || this.config.ttl,
          JSON.stringify(value)
        );
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }
  }
  
  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    
    if (this.config.enableRedis && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }
  }
  
  /**
   * 批量删除缓存（支持模式匹配）
   */
  async deletePattern(pattern: string): Promise<void> {
    // 删除内存缓存中匹配的键
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    
    // 如果启用了 Redis，删除 Redis 中匹配的键
    if (this.config.enableRedis && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('Redis deletePattern error:', error);
      }
    }
  }
  
  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.cache.clear();
    
    if (this.config.enableRedis && this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
  }
  
  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
    };
  }
  
  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 生成对象缓存键
   */
  static objectKey(type: string, id: string): string {
    return `obj:${type}:${id}`;
  }
  
  /**
   * 生成查询缓存键
   */
  static queryKey(type: string, filters: any): string {
    const filterStr = JSON.stringify(filters);
    return `query:${type}:${filterStr}`;
  }
  
  /**
   * 生成链接缓存键
   */
  static linkKey(sourceId: string, linkType: string): string {
    return `link:${sourceId}:${linkType}`;
  }
}

/**
 * 全局缓存实例
 */
export const cacheService = new CacheService({
  ttl: 300, // 5 分钟
  maxSize: 1000,
  enableRedis: false, // 默认不启用 Redis
});
