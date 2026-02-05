/**
 * 租户感知的基础仓库
 * 自动在所有查询中添加 organizationId 过滤
 * 确保数据隔离
 */

import { Pool, QueryResult } from 'pg';
import { tenantContext } from '../services/TenantContext';

export abstract class TenantAwareRepository<T> {
  protected pool: Pool;
  protected tableName: string;
  protected organizationIdColumn: string;

  constructor(pool: Pool, tableName: string, organizationIdColumn: string = 'organization_id') {
    this.pool = pool;
    this.tableName = tableName;
    this.organizationIdColumn = organizationIdColumn;
  }

  /**
   * 获取当前租户的组织ID
   */
  protected getCurrentOrganizationId(): string {
    return tenantContext.getOrganizationId();
  }

  /**
   * 添加租户过滤条件到 WHERE 子句
   */
  protected addTenantFilter(whereClause: string = ''): string {
    const orgId = this.getCurrentOrganizationId();
    const tenantFilter = `${this.organizationIdColumn} = '${orgId}'`;
    
    if (!whereClause || whereClause.trim() === '') {
      return `WHERE ${tenantFilter}`;
    }
    
    // 如果已有 WHERE，添加 AND
    if (whereClause.trim().toUpperCase().startsWith('WHERE')) {
      return `${whereClause} AND ${tenantFilter}`;
    }
    
    return `WHERE ${tenantFilter} AND (${whereClause})`;
  }

  /**
   * 验证实体是否属于当前租户
   */
  protected async validateTenantAccess(id: string): Promise<void> {
    const orgId = this.getCurrentOrganizationId();
    const result = await this.pool.query(
      `SELECT ${this.organizationIdColumn} FROM ${this.tableName} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error(`资源不存在: ${id}`);
    }

    const resourceOrgId = result.rows[0][this.organizationIdColumn];
    if (resourceOrgId !== orgId) {
      throw new Error(
        `访问被拒绝：资源属于组织 ${resourceOrgId}，但当前上下文是组织 ${orgId}`
      );
    }
  }

  /**
   * 查找所有记录（自动添加租户过滤）
   */
  async findAll(): Promise<T[]> {
    const orgId = this.getCurrentOrganizationId();
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE ${this.organizationIdColumn} = $1`,
      [orgId]
    );
    return result.rows as T[];
  }

  /**
   * 根据ID查找记录（自动验证租户）
   */
  async findById(id: string): Promise<T | null> {
    await this.validateTenantAccess(id);
    const result = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] as T || null;
  }

  /**
   * 根据条件查找记录（自动添加租户过滤）
   */
  async findWhere(whereClause: string, params: any[] = []): Promise<T[]> {
    const orgId = this.getCurrentOrganizationId();
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE ${this.organizationIdColumn} = $1 AND (${whereClause})
    `;
    const result = await this.pool.query(query, [orgId, ...params]);
    return result.rows as T[];
  }

  /**
   * 创建记录（自动添加 organizationId）
   */
  async create(data: Partial<T>): Promise<T> {
    const orgId = this.getCurrentOrganizationId();
    const dataWithOrg = {
      ...data,
      [this.organizationIdColumn]: orgId
    };

    const columns = Object.keys(dataWithOrg);
    const values = Object.values(dataWithOrg);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] as T;
  }

  /**
   * 更新记录（自动验证租户）
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    await this.validateTenantAccess(id);

    // 移除 organizationId，防止被修改
    const { [this.organizationIdColumn]: _, ...updateData } = data as any;

    const entries = Object.entries(updateData);
    const setClause = entries.map(([key], i) => `${key} = $${i + 2}`).join(', ');
    const values = entries.map(([, value]) => value);

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...values]);
    return result.rows[0] as T;
  }

  /**
   * 删除记录（自动验证租户）
   */
  async delete(id: string): Promise<boolean> {
    await this.validateTenantAccess(id);
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * 计数（自动添加租户过滤）
   */
  async count(whereClause: string = '', params: any[] = []): Promise<number> {
    const orgId = this.getCurrentOrganizationId();
    let query = `SELECT COUNT(*) FROM ${this.tableName} WHERE ${this.organizationIdColumn} = $1`;
    const queryParams = [orgId];

    if (whereClause) {
      query += ` AND (${whereClause})`;
      queryParams.push(...params);
    }

    const result = await this.pool.query(query, queryParams);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * 执行原始查询（需要手动添加租户过滤）
   * 警告：使用此方法时必须确保查询包含租户过滤
   */
  protected async executeQuery(query: string, params: any[] = []): Promise<QueryResult> {
    // 检查查询是否包含租户过滤（简单检查）
    if (!query.toLowerCase().includes(this.organizationIdColumn.toLowerCase())) {
      console.warn(
        `警告：查询可能缺少租户过滤。表: ${this.tableName}, 查询: ${query.substring(0, 100)}...`
      );
    }
    return this.pool.query(query, params);
  }
}
