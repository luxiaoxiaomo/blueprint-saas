import { Pool } from 'pg';
import { ProjectMemberObject } from '../ontology/types.js';
import { TenantAwareRepository } from './TenantAwareRepository.js';

/**
 * ProjectMemberRepository - 项目成员数据访问层
 * 管理项目与成员的关系
 */
export class ProjectMemberRepository extends TenantAwareRepository<ProjectMemberObject> {
  constructor(pool: Pool) {
    super(pool, 'project_members');
  }

  /**
   * 添加项目成员
   */
  async addMember(
    projectId: string,
    organizationId: string,
    memberId: string,
    role: 'owner' | 'editor' | 'viewer',
    addedBy: string
  ): Promise<ProjectMemberObject> {
    const query = `
      INSERT INTO project_members (project_id, organization_id, member_id, role, added_by, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, project_id, organization_id, member_id, role, added_at, added_by, last_accessed_at, is_active, created_at, updated_at
    `;

    const result = await this.pool.query(query, [projectId, organizationId, memberId, role, addedBy]);

    if (result.rows.length === 0) {
      throw new Error('Failed to add project member');
    }

    return this.mapRowToObject(result.rows[0]);
  }

  /**
   * 更新项目成员角色
   */
  async updateMemberRole(
    projectMemberId: string,
    newRole: 'owner' | 'editor' | 'viewer'
  ): Promise<ProjectMemberObject> {
    const query = `
      UPDATE project_members
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, project_id, organization_id, member_id, role, added_at, added_by, last_accessed_at, is_active, created_at, updated_at
    `;

    const result = await this.pool.query(query, [newRole, projectMemberId]);

    if (result.rows.length === 0) {
      throw new Error('Project member not found');
    }

    return this.mapRowToObject(result.rows[0]);
  }

  /**
   * 移除项目成员
   */
  async removeMember(projectMemberId: string): Promise<void> {
    const query = `
      DELETE FROM project_members
      WHERE id = $1
    `;

    await this.pool.query(query, [projectMemberId]);
  }

  /**
   * 获取项目的所有成员
   */
  async getProjectMembers(projectId: string, organizationId: string): Promise<ProjectMemberObject[]> {
    const query = `
      SELECT id, project_id, organization_id, member_id, role, added_at, added_by, last_accessed_at, is_active, created_at, updated_at
      FROM project_members
      WHERE project_id = $1 AND organization_id = $2 AND is_active = true
      ORDER BY added_at ASC
    `;

    const result = await this.pool.query(query, [projectId, organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }

  /**
   * 获取成员的所有项目
   */
  async getMemberProjects(memberId: string, organizationId: string): Promise<ProjectMemberObject[]> {
    const query = `
      SELECT id, project_id, organization_id, member_id, role, added_at, added_by, last_accessed_at, is_active, created_at, updated_at
      FROM project_members
      WHERE member_id = $1 AND organization_id = $2 AND is_active = true
      ORDER BY added_at DESC
    `;

    const result = await this.pool.query(query, [memberId, organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }

  /**
   * 检查成员是否是项目所有者
   */
  async isProjectOwner(projectId: string, memberId: string, organizationId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM project_members
      WHERE project_id = $1 AND member_id = $2 AND organization_id = $3 AND role = 'owner' AND is_active = true
      LIMIT 1
    `;

    const result = await this.pool.query(query, [projectId, memberId, organizationId]);
    return result.rows.length > 0;
  }

  /**
   * 获取项目成员详情
   */
  async getProjectMember(
    projectId: string,
    memberId: string,
    organizationId: string
  ): Promise<ProjectMemberObject | null> {
    const query = `
      SELECT id, project_id, organization_id, member_id, role, added_at, added_by, last_accessed_at, is_active, created_at, updated_at
      FROM project_members
      WHERE project_id = $1 AND member_id = $2 AND organization_id = $3 AND is_active = true
      LIMIT 1
    `;

    const result = await this.pool.query(query, [projectId, memberId, organizationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToObject(result.rows[0]);
  }

  /**
   * 获取项目的所有所有者
   */
  async getProjectOwners(projectId: string, organizationId: string): Promise<ProjectMemberObject[]> {
    const query = `
      SELECT id, project_id, organization_id, member_id, role, added_at, added_by, last_accessed_at, is_active, created_at, updated_at
      FROM project_members
      WHERE project_id = $1 AND organization_id = $2 AND role = 'owner' AND is_active = true
      ORDER BY added_at ASC
    `;

    const result = await this.pool.query(query, [projectId, organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }

  /**
   * 获取项目成员数量
   */
  async getProjectMemberCount(projectId: string, organizationId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM project_members
      WHERE project_id = $1 AND organization_id = $2 AND is_active = true
    `;

    const result = await this.pool.query(query, [projectId, organizationId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * 更新最后访问时间
   */
  async updateLastAccessedAt(projectMemberId: string): Promise<void> {
    const query = `
      UPDATE project_members
      SET last_accessed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [projectMemberId]);
  }

  /**
   * 从组织中移除成员时，级联删除项目成员
   */
  async removeMemberFromAllProjects(memberId: string, organizationId: string): Promise<void> {
    const query = `
      UPDATE project_members
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE member_id = $1 AND organization_id = $2
    `;

    await this.pool.query(query, [memberId, organizationId]);
  }

  /**
   * 将行数据映射到 ProjectMemberObject
   */
  private mapRowToObject(row: any): ProjectMemberObject {
    return {
      id: row.id,
      type: 'ProjectMember',
      projectId: row.project_id,
      organizationId: row.organization_id,
      memberId: row.member_id,
      role: row.role,
      addedAt: new Date(row.added_at),
      addedBy: row.added_by,
      lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
