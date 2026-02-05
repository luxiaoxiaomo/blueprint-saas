/**
 * ModuleRepository - 模块数据访问层
 */

import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository.js';
import { ModuleObject } from '../ontology/types.js';

/**
 * 模块 Repository
 */
export class ModuleRepository extends BaseRepository<ModuleObject> {
  constructor(pool: Pool) {
    super(pool, 'modules');
  }
  
  /**
   * 根据项目ID查找模块
   */
  async findByProjectId(projectId: string): Promise<ModuleObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据项目ID和模块名称查找模块
   */
  async findByProjectIdAndName(projectId: string, name: string): Promise<ModuleObject | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = $1 AND name = $2
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [projectId, name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 更新模块排序
   */
  async updateSortOrder(id: string, sortOrder: number): Promise<ModuleObject> {
    const query = `
      UPDATE ${this.tableName}
      SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [sortOrder, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Module with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 批量更新模块排序
   */
  async batchUpdateSortOrder(updates: Array<{ id: string; sortOrder: number }>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const update of updates) {
        await client.query(
          `UPDATE ${this.tableName} SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [update.sortOrder, update.id]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 将数据库行映射为 ModuleObject
   */
  protected mapRowToObject(row: any): ModuleObject {
    return {
      id: row.id,
      type: 'Module',
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      functionalPoints: row.functional_points || [],
      children: row.children,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
