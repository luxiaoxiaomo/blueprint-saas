/**
 * BatchQueryOptimizer - 批量查询优化器
 * 将多个单独的查询合并为批量查询，减少数据库往返次数
 */

import { Pool } from 'pg';

/**
 * 查询请求
 */
interface QueryRequest {
  sql: string;
  values: any[];
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

/**
 * 批量查询优化器
 * 
 * 工作原理：
 * 1. 收集一段时间内的所有查询请求
 * 2. 将相同类型的查询合并为批量查询
 * 3. 一次性执行所有查询
 * 4. 将结果分发给各个请求
 */
export class BatchQueryOptimizer {
  private pool: Pool;
  private queue: QueryRequest[] = [];
  private timer: NodeJS.Timeout | null = null;
  private batchDelay: number;
  private maxBatchSize: number;
  
  constructor(pool: Pool, options: {
    batchDelay?: number; // 批量延迟（毫秒）
    maxBatchSize?: number; // 最大批量大小
  } = {}) {
    this.pool = pool;
    this.batchDelay = options.batchDelay || 10; // 默认 10ms
    this.maxBatchSize = options.maxBatchSize || 100; // 默认最多 100 个查询
  }
  
  /**
   * 添加查询到队列
   */
  query(sql: string, values: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ sql, values, resolve, reject });
      
      // 如果队列达到最大大小，立即执行
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else {
        // 否则等待批量延迟
        this.scheduleBatch();
      }
    });
  }
  
  /**
   * 调度批量执行
   */
  private scheduleBatch(): void {
    if (this.timer) {
      return; // 已经调度了
    }
    
    this.timer = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }
  
  /**
   * 执行批量查询
   */
  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.queue.length === 0) {
      return;
    }
    
    const batch = this.queue.splice(0, this.maxBatchSize);
    
    // 按查询类型分组
    const groups = this.groupQueries(batch);
    
    // 执行每组查询
    for (const group of groups) {
      await this.executeBatch(group);
    }
  }
  
  /**
   * 将查询按类型分组
   */
  private groupQueries(batch: QueryRequest[]): QueryRequest[][] {
    const groups = new Map<string, QueryRequest[]>();
    
    for (const request of batch) {
      // 提取查询类型（SELECT、INSERT、UPDATE、DELETE）
      const type = this.getQueryType(request.sql);
      const key = `${type}:${this.getTableName(request.sql)}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(request);
    }
    
    return Array.from(groups.values());
  }
  
  /**
   * 获取查询类型
   */
  private getQueryType(sql: string): string {
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('SELECT')) return 'SELECT';
    if (normalized.startsWith('INSERT')) return 'INSERT';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }
  
  /**
   * 获取表名
   */
  private getTableName(sql: string): string {
    const match = sql.match(/FROM\s+(\w+)|INTO\s+(\w+)|UPDATE\s+(\w+)/i);
    return match ? (match[1] || match[2] || match[3]) : 'unknown';
  }
  
  /**
   * 执行批量查询
   */
  private async executeBatch(batch: QueryRequest[]): Promise<void> {
    if (batch.length === 0) {
      return;
    }
    
    // 如果只有一个查询，直接执行
    if (batch.length === 1) {
      const request = batch[0];
      try {
        const result = await this.pool.query(request.sql, request.values);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
      return;
    }
    
    // 尝试合并查询
    const type = this.getQueryType(batch[0].sql);
    
    if (type === 'SELECT' && this.canMergeSelects(batch)) {
      await this.executeMergedSelects(batch);
    } else if (type === 'INSERT' && this.canMergeInserts(batch)) {
      await this.executeMergedInserts(batch);
    } else {
      // 无法合并，逐个执行
      for (const request of batch) {
        try {
          const result = await this.pool.query(request.sql, request.values);
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    }
  }
  
  /**
   * 检查是否可以合并 SELECT 查询
   */
  private canMergeSelects(batch: QueryRequest[]): boolean {
    // 检查是否都是简单的 WHERE id = ? 查询
    const pattern = /SELECT\s+\*\s+FROM\s+(\w+)\s+WHERE\s+id\s*=\s*\$1/i;
    return batch.every(req => pattern.test(req.sql));
  }
  
  /**
   * 执行合并的 SELECT 查询
   */
  private async executeMergedSelects(batch: QueryRequest[]): Promise<void> {
    const tableName = this.getTableName(batch[0].sql);
    const ids = batch.map(req => req.values[0]);
    
    try {
      // 使用 IN 查询
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `SELECT * FROM ${tableName} WHERE id IN (${placeholders})`;
      const result = await this.pool.query(sql, ids);
      
      // 将结果分发给各个请求
      const resultMap = new Map(result.rows.map(row => [row.id, row]));
      for (const request of batch) {
        const id = request.values[0];
        const row = resultMap.get(id);
        request.resolve({ rows: row ? [row] : [] });
      }
    } catch (error) {
      // 如果合并查询失败，回退到逐个执行
      for (const request of batch) {
        request.reject(error);
      }
    }
  }
  
  /**
   * 检查是否可以合并 INSERT 查询
   */
  private canMergeInserts(batch: QueryRequest[]): boolean {
    // 检查是否都是相同表的插入
    const tableName = this.getTableName(batch[0].sql);
    return batch.every(req => this.getTableName(req.sql) === tableName);
  }
  
  /**
   * 执行合并的 INSERT 查询
   */
  private async executeMergedInserts(batch: QueryRequest[]): Promise<void> {
    const tableName = this.getTableName(batch[0].sql);
    
    try {
      // 构建批量插入 SQL
      const valueGroups: string[] = [];
      const allValues: any[] = [];
      let paramIndex = 1;
      
      for (const request of batch) {
        const valueCount = request.values.length;
        const placeholders = Array.from(
          { length: valueCount },
          (_, i) => `$${paramIndex + i}`
        ).join(', ');
        valueGroups.push(`(${placeholders})`);
        allValues.push(...request.values);
        paramIndex += valueCount;
      }
      
      // 假设所有插入都有相同的列
      const sql = `INSERT INTO ${tableName} VALUES ${valueGroups.join(', ')} RETURNING *`;
      const result = await this.pool.query(sql, allValues);
      
      // 将结果分发给各个请求
      for (let i = 0; i < batch.length; i++) {
        batch[i].resolve({ rows: [result.rows[i]] });
      }
    } catch (error) {
      // 如果合并查询失败，回退到逐个执行
      for (const request of batch) {
        request.reject(error);
      }
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats(): {
    queueSize: number;
    batchDelay: number;
    maxBatchSize: number;
  } {
    return {
      queueSize: this.queue.length,
      batchDelay: this.batchDelay,
      maxBatchSize: this.maxBatchSize,
    };
  }
}
