/**
 * ProjectRepository - 项目数据访问层
 */

import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository.js';
import { ProjectObject } from '../ontology/types.js';

/**
 * 项目 Repository
 * 注意：项目现在属于组织，需要通过组织成员关系验证访问权限
 */
export class ProjectRepository extends BaseRepository<ProjectObject> {
  constructor(pool: Pool) {
    super(pool, 'projects');
  }
  
  /**
   * 根据组织ID查找项目
   */
  async findByOrganizationId(organizationId: string): Promise<ProjectObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据用户ID查找项目（通过组织成员关系）
   * @deprecated 使用 findByOrganizationId 替代
   */
  async findByUserId(userId: string): Promise<ProjectObject[]> {
    const query = `
      SELECT DISTINCT p.* FROM ${this.tableName} p
      INNER JOIN members m ON m.organization_id = p.organization_id
      WHERE m.user_id = $1 AND m.status = 'active'
      ORDER BY p.created_at DESC
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 查找未归档的项目
   */
  async findActive(organizationId: string): Promise<ProjectObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1 AND is_archived = false
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 归档/取消归档项目
   */
  async archive(id: string, archived: boolean): Promise<ProjectObject> {
    const query = `
      UPDATE ${this.tableName}
      SET is_archived = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [archived, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 验证用户是否有权访问项目
   */
  async validateUserAccess(projectId: string, userId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM ${this.tableName} p
      INNER JOIN members m ON m.organization_id = p.organization_id
      WHERE p.id = $1 AND m.user_id = $2 AND m.status = 'active'
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [projectId, userId]);
    return result.rows.length > 0;
  }
  
  /**
   * 将数据库行映射为 ProjectObject
   */
  protected mapRowToObject(row: any): ProjectObject {
    return {
      id: row.id,
      type: 'Project',
      userId: row.user_id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      model: row.model,
      isArchived: row.is_archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
