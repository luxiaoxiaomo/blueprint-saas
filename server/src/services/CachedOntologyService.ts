/**
 * CachedOntologyService - 带缓存的本体服务
 * 在 OntologyService 基础上添加缓存层
 */

import { OntologyService } from '../ontology/OntologyService.js';
import { CacheService } from './CacheService.js';
import { OntologyObject, QueryOptions, LinkType, OntologyLink } from '../ontology/types.js';

/**
 * 带缓存的本体服务
 */
export class CachedOntologyService {
  constructor(
    private ontologyService: OntologyService,
    private cacheService: CacheService
  ) {}
  
  /**
   * 获取对象（带缓存）
   */
  async getObject<T extends OntologyObject>(type: string, id: string): Promise<T | null> {
    const cacheKey = CacheService.objectKey(type, id);
    
    // 尝试从缓存获取
    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 从数据库获取
    const object = await this.ontologyService.getObject<T>(type, id);
    
    // 存入缓存
    if (object) {
      await this.cacheService.set(cacheKey, object);
    }
    
    return object;
  }
  
  /**
   * 查询对象列表（带缓存）
   */
  async queryObjects<T extends OntologyObject>(
    type: string,
    options?: QueryOptions
  ): Promise<T[]> {
    const cacheKey = CacheService.queryKey(type, options || {});
    
    // 尝试从缓存获取
    const cached = await this.cacheService.get<T[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 从数据库获取
    const objects = await this.ontologyService.queryObjects<T>(type, options);
    
    // 存入缓存（较短的 TTL，因为查询结果可能变化）
    await this.cacheService.set(cacheKey, objects, 60); // 1 分钟
    
    return objects;
  }
  
  /**
   * 创建对象（清除相关缓存）
   */
  async createObject<T extends OntologyObject>(type: string, data: Partial<T>): Promise<T> {
    const object = await this.ontologyService.createObject<T>(type, data);
    
    // 清除查询缓存
    await this.cacheService.deletePattern(`query:${type}:*`);
    
    // 缓存新对象
    const cacheKey = CacheService.objectKey(type, object.id);
    await this.cacheService.set(cacheKey, object);
    
    return object;
  }
  
  /**
   * 更新对象（清除相关缓存）
   */
  async updateObject<T extends OntologyObject>(
    type: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    const object = await this.ontologyService.updateObject<T>(type, id, data);
    
    // 清除对象缓存
    const cacheKey = CacheService.objectKey(type, id);
    await this.cacheService.delete(cacheKey);
    
    // 清除查询缓存
    await this.cacheService.deletePattern(`query:${type}:*`);
    
    // 缓存更新后的对象
    await this.cacheService.set(cacheKey, object);
    
    return object;
  }
  
  /**
   * 删除对象（清除相关缓存）
   */
  async deleteObject(type: string, id: string): Promise<void> {
    await this.ontologyService.deleteObject(type, id);
    
    // 清除对象缓存
    const cacheKey = CacheService.objectKey(type, id);
    await this.cacheService.delete(cacheKey);
    
    // 清除查询缓存
    await this.cacheService.deletePattern(`query:${type}:*`);
    
    // 清除相关链接缓存
    await this.cacheService.deletePattern(`link:${id}:*`);
  }
  
  /**
   * 获取链接对象（带缓存）
   */
  async getLinkedObjects<T extends OntologyObject>(
    objectId: string,
    linkType: LinkType
  ): Promise<T[]> {
    const cacheKey = CacheService.linkKey(objectId, linkType);
    
    // 尝试从缓存获取
    const cached = await this.cacheService.get<T[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 从数据库获取
    const objects = await this.ontologyService.getLinkedObjects<T>(objectId, linkType);
    
    // 存入缓存
    await this.cacheService.set(cacheKey, objects, 120); // 2 分钟
    
    return objects;
  }
  
  /**
   * 创建链接（清除相关缓存）
   */
  async createLink(
    sourceId: string,
    targetId: string,
    linkType: LinkType,
    metadata?: any
  ): Promise<OntologyLink> {
    const link = await this.ontologyService.createLink(sourceId, targetId, linkType, metadata);
    
    // 清除链接缓存
    await this.cacheService.deletePattern(`link:${sourceId}:*`);
    await this.cacheService.deletePattern(`link:${targetId}:*`);
    
    return link;
  }
  
  /**
   * 删除链接（清除相关缓存）
   */
  async deleteLink(linkId: string): Promise<void> {
    await this.ontologyService.deleteLink(linkId);
    
    // 清除所有链接缓存（因为不知道具体的 sourceId 和 targetId）
    await this.cacheService.deletePattern('link:*');
  }
  
  /**
   * 批量查询（带缓存）
   */
  async batchQuery<T extends OntologyObject>(queries: Array<{
    type: string;
    options?: QueryOptions;
  }>): Promise<T[][]> {
    // 尝试从缓存获取每个查询
    const results: T[][] = [];
    const uncachedQueries: Array<{ index: number; query: typeof queries[0] }> = [];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const cacheKey = CacheService.queryKey(query.type, query.options || {});
      const cached = await this.cacheService.get<T[]>(cacheKey);
      
      if (cached) {
        results[i] = cached;
      } else {
        uncachedQueries.push({ index: i, query });
      }
    }
    
    // 批量查询未缓存的数据
    if (uncachedQueries.length > 0) {
      const uncachedResults = await this.ontologyService.batchQuery<T>(
        uncachedQueries.map(q => q.query)
      );
      
      // 存入缓存并填充结果
      for (let i = 0; i < uncachedQueries.length; i++) {
        const { index, query } = uncachedQueries[i];
        const result = uncachedResults[i];
        results[index] = result;
        
        const cacheKey = CacheService.queryKey(query.type, query.options || {});
        await this.cacheService.set(cacheKey, result, 60);
      }
    }
    
    return results;
  }
  
  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }
  
  /**
   * 清空缓存
   */
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
  }
}
