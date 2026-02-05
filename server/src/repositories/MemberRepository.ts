/**
 * MemberRepository - 成员数据访问层
 */

import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository.js';
import { MemberObject } from '../ontology/types.js';

/**
 * 成员 Repository
 */
export class MemberRepository extends BaseRepository<MemberObject> {
  constructor(pool: Pool) {
    super(pool, 'members');
  }
  
  /**
   * 根据组织 ID 查找成员
   */
  async findByOrganizationId(organizationId: string): Promise<MemberObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据用户 ID 查找成员
   */
  async findByUserId(userId: string): Promise<MemberObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据组织 ID 和用户 ID 查找成员
   */
  async findByOrganizationIdAndUserId(
    organizationId: string,
    userId: string
  ): Promise<MemberObject | null> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1 AND user_id = $2
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [organizationId, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 根据角色查找成员
   */
  async findByRole(organizationId: string, role: string): Promise<MemberObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1 AND role = $2
      ORDER BY created_at ASC
    `;
    
    const result = await this.pool.query(query, [organizationId, role]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据状态查找成员
   */
  async findByStatus(organizationId: string, status: string): Promise<MemberObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1 AND status = $2
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [organizationId, status]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 更新成员角色
   */
  async updateRole(id: string, role: string): Promise<MemberObject> {
    const query = `
      UPDATE ${this.tableName}
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [role, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Member with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 更新成员状态
   */
  async updateStatus(id: string, status: string): Promise<MemberObject> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Member with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 接受邀请
   */
  async acceptInvitation(id: string): Promise<MemberObject> {
    const query = `
      UPDATE ${this.tableName}
      SET status = 'active', joined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Member with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 根据部门 ID 查找成员
   */
  async findByDepartmentId(departmentId: string): Promise<MemberObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE department_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await this.pool.query(query, [departmentId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 更新成员部门
   */
  async updateDepartment(id: string, departmentId: string | null): Promise<MemberObject> {
    const query = `
      UPDATE ${this.tableName}
      SET department_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [departmentId, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Member with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 批量更新成员部门
   */
  async batchUpdateDepartment(memberIds: string[], departmentId: string | null): Promise<number> {
    const query = `
      UPDATE ${this.tableName}
      SET department_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    
    const result = await this.pool.query(query, [departmentId, memberIds]);
    return result.rowCount || 0;
  }
  
  /**
   * 获取成员统计
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const queries = [
      `SELECT COUNT(*) as total FROM ${this.tableName} WHERE organization_id = $1`,
      `SELECT role, COUNT(*) as count FROM ${this.tableName} WHERE organization_id = $1 GROUP BY role`,
      `SELECT status, COUNT(*) as count FROM ${this.tableName} WHERE organization_id = $1 GROUP BY status`,
    ];
    
    const [totalResult, roleResult, statusResult] = await Promise.all(
      queries.map(q => this.pool.query(q, [organizationId]))
    );
    
    const byRole: Record<string, number> = {};
    roleResult.rows.forEach(row => {
      byRole[row.role] = parseInt(row.count);
    });
    
    const byStatus: Record<string, number> = {};
    statusResult.rows.forEach(row => {
      byStatus[row.status] = parseInt(row.count);
    });
    
    return {
      total: parseInt(totalResult.rows[0].total),
      byRole,
      byStatus,
    };
  }
  
  /**
   * 将数据库行映射为 MemberObject
   */
  protected mapRowToObject(row: any): MemberObject {
    return {
      id: row.id,
      type: 'Member',
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      departmentId: row.department_id,
      status: row.status,
      invitedBy: row.invited_by,
      invitedAt: row.invited_at,
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
