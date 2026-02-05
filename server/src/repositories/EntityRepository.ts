/**
 * EntityRepository - 实体数据访问层
 */

import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository.js';
import { EntityObject } from '../ontology/types.js';

/**
 * 实体 Repository
 */
export class EntityRepository extends BaseRepository<EntityObject> {
  constructor(pool: Pool) {
    super(pool, 'entities');
  }
  
  /**
   * 根据项目ID查找实体
   */
  async findByProjectId(projectId: string): Promise<EntityObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据模块ID查找实体
   */
  async findByModuleId(moduleId: string): Promise<EntityObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE module_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await this.pool.query(query, [moduleId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据项目ID和实体名称查找实体
   */
  async findByProjectIdAndName(projectId: string, name: string): Promise<EntityObject | null> {
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
   * 查找没有关联模块的实体
   */
  async findUnassigned(projectId: string): Promise<EntityObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = $1 AND module_id IS NULL
      ORDER BY created_at ASC
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 将实体分配给模块
   */
  async assignToModule(id: string, moduleId: string): Promise<EntityObject> {
    const query = `
      UPDATE ${this.tableName}
      SET module_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [moduleId, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Entity with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 取消实体的模块分配
   */
  async unassignFromModule(id: string): Promise<EntityObject> {
    const query = `
      UPDATE ${this.tableName}
      SET module_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Entity with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 批量删除模块的所有实体
   */
  async deleteByModuleId(moduleId: string): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE module_id = $1
    `;
    
    const result = await this.pool.query(query, [moduleId]);
    return result.rowCount || 0;
  }
  
  /**
   * 将数据库行映射为 EntityObject
   */
  protected mapRowToObject(row: any): EntityObject {
    return {
      id: row.id,
      type: 'Entity',
      projectId: row.project_id,
      moduleId: row.module_id,
      name: row.name,
      description: row.description,
      attributes: row.attributes || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
