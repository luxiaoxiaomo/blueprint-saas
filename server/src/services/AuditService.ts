/**
 * AuditService - 审计日志服务
 * 负责记录和查询系统操作日志
 */

import { Pool } from 'pg';

/**
 * 审计日志条目
 */
export interface AuditLogEntry {
  id?: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

/**
 * 审计日志查询选项
 */
export interface AuditLogQueryOptions {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * 审计日志服务
 */
export class AuditService {
  constructor(private pool: Pool) {}

  /**
   * 记录审计日志
   */
  async log(entry: AuditLogEntry): Promise<AuditLogEntry> {
    const query = `
      INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      entry.userAgent || null,
    ];

    try {
      const result = await this.pool.query(query, values);
      return this.mapRowToEntry(result.rows[0]);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      throw error;
    }
  }

  /**
   * 查询审计日志
   */
  async query(options: AuditLogQueryOptions = {}): Promise<AuditLogEntry[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 构建查询条件
    if (options.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(options.userId);
    }

    if (options.action) {
      conditions.push(`action = $${paramIndex++}`);
      values.push(options.action);
    }

    if (options.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`);
      values.push(options.resourceType);
    }

    if (options.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`);
      values.push(options.resourceId);
    }

    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    // 构建查询语句
    let query = `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY al.created_at DESC`;

    // 添加分页
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapRowToEntry(row));
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取审计日志
   */
  async getById(id: string): Promise<AuditLogEntry | null> {
    const query = `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToEntry(result.rows[0]);
    } catch (error) {
      console.error('Failed to get audit log by id:', error);
      throw error;
    }
  }

  /**
   * 获取审计日志统计
   */
  async getStats(userId?: string): Promise<{
    total: number;
    byAction: Record<string, number>;
    byResourceType: Record<string, number>;
  }> {
    const userCondition = userId ? 'WHERE user_id = $1' : '';
    const values = userId ? [userId] : [];

    const queries = [
      // 总数
      `SELECT COUNT(*) as total FROM audit_logs ${userCondition}`,
      // 按操作分组
      `SELECT action, COUNT(*) as count FROM audit_logs ${userCondition} GROUP BY action`,
      // 按资源类型分组
      `SELECT resource_type, COUNT(*) as count FROM audit_logs ${userCondition} GROUP BY resource_type`,
    ];

    try {
      const [totalResult, actionResult, resourceResult] = await Promise.all(
        queries.map(q => this.pool.query(q, values))
      );

      const byAction: Record<string, number> = {};
      actionResult.rows.forEach(row => {
        byAction[row.action] = parseInt(row.count);
      });

      const byResourceType: Record<string, number> = {};
      resourceResult.rows.forEach(row => {
        byResourceType[row.resource_type] = parseInt(row.count);
      });

      return {
        total: parseInt(totalResult.rows[0].total),
        byAction,
        byResourceType,
      };
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      throw error;
    }
  }

  /**
   * 清理旧的审计日志
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    const query = `
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
    `;

    try {
      const result = await this.pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
      throw error;
    }
  }

  /**
   * 将数据库行映射为审计日志条目
   */
  private mapRowToEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      // 额外的用户信息（如果有）
      ...(row.user_name && { userName: row.user_name }),
      ...(row.user_email && { userEmail: row.user_email }),
    };
  }
}
