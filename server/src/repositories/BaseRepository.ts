/**
 * BaseRepository - 基础 Repository 类
 * 封装通用的数据库操作
 */

import { Pool } from 'pg';
import { QueryOptions, QueryFilter } from '../ontology/types.js';

/**
 * Repository 接口
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  find(options?: QueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

/**
 * 基础 Repository 实现
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  constructor(
    protected pool: Pool,
    protected tableName: string
  ) {}
  
  /**
   * 根据 ID 查找
   */
  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 查找多个对象
   */
  async find(options?: QueryOptions): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];
    let paramIndex = 1;
    
    // 添加过滤条件
    if (options?.filters && options.filters.length > 0) {
      const whereClauses = options.filters.map(filter => {
        params.push(filter.value);
        return `${filter.field} ${this.getOperatorSQL(filter.operator)} $${paramIndex++}`;
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    // 添加排序
    if (options?.orderBy && options.orderBy.length > 0) {
      const orderClauses = options.orderBy.map(
        order => `${order.field} ${order.direction.toUpperCase()}`
      );
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    // 添加分页
    if (options?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }
    
    if (options?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }
    
    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 创建对象
   */
  async create(data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await this.pool.query(query, values);
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 更新对象
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    const setClauses = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [...values, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Object with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 删除对象
   */
  async delete(id: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    await this.pool.query(query, [id]);
  }
  
  /**
   * 将数据库行映射为对象（子类可以覆盖）
   */
  protected mapRowToObject(row: any): T {
    return row as T;
  }
  
  /**
   * 获取 SQL 操作符
   */
  private getOperatorSQL(operator: QueryFilter['operator']): string {
    switch (operator) {
      case 'eq': return '=';
      case 'ne': return '!=';
      case 'gt': return '>';
      case 'lt': return '<';
      case 'gte': return '>=';
      case 'lte': return '<=';
      case 'in': return 'IN';
      case 'like': return 'LIKE';
      default: return '=';
    }
  }
}
