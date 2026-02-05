/**
 * OrganizationRepository - 组织数据访问层
 */

import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository.js';
import { OrganizationObject } from '../ontology/types.js';

/**
 * 组织 Repository
 */
export class OrganizationRepository extends BaseRepository<OrganizationObject> {
  constructor(pool: Pool) {
    super(pool, 'organizations');
  }
  
  /**
   * 根据所有者 ID 查找组织
   */
  async findByOwnerId(ownerId: string): Promise<OrganizationObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE owner_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [ownerId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据标识符查找组织
   */
  async findByIdentifier(identifier: string): Promise<OrganizationObject | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE identifier = $1
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [identifier]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 根据套餐类型查找组织
   */
  async findByPlan(plan: string): Promise<OrganizationObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE plan = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [plan]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 更新组织套餐
   */
  async updatePlan(id: string, plan: string): Promise<OrganizationObject> {
    const query = `
      UPDATE ${this.tableName}
      SET plan = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [plan, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Organization with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 更新组织设置
   */
  async updateSettings(id: string, settings: any): Promise<OrganizationObject> {
    const query = `
      UPDATE ${this.tableName}
      SET settings = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [JSON.stringify(settings), id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Organization with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 获取组织统计
   */
  async getStats(): Promise<{
    total: number;
    byPlan: Record<string, number>;
  }> {
    const queries = [
      `SELECT COUNT(*) as total FROM ${this.tableName}`,
      `SELECT plan, COUNT(*) as count FROM ${this.tableName} GROUP BY plan`,
    ];
    
    const [totalResult, planResult] = await Promise.all(
      queries.map(q => this.pool.query(q))
    );
    
    const byPlan: Record<string, number> = {};
    planResult.rows.forEach(row => {
      byPlan[row.plan] = parseInt(row.count);
    });
    
    return {
      total: parseInt(totalResult.rows[0].total),
      byPlan,
    };
  }
  
  /**
   * 将数据库行映射为 OrganizationObject
   */
  protected mapRowToObject(row: any): OrganizationObject {
    return {
      id: row.id,
      type: 'Organization',
      name: row.name,
      identifier: row.identifier,
      description: row.description,
      plan: row.plan,
      settings: row.settings || {},
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
