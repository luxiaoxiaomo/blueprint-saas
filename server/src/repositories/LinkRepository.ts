/**
 * LinkRepository - 链接数据访问层
 */

import { Pool } from 'pg';
import { OntologyLink, LinkType } from '../ontology/types.js';

/**
 * 链接 Repository
 */
export class LinkRepository {
  constructor(private pool: Pool) {}
  
  /**
   * 根据 ID 查找链接
   */
  async findById(id: string): Promise<OntologyLink | null> {
    const query = `
      SELECT * FROM ontology_links
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToLink(result.rows[0]);
  }
  
  /**
   * 根据源对象 ID 查找链接
   */
  async findBySourceId(sourceId: string, linkType?: LinkType): Promise<OntologyLink[]> {
    let query = `
      SELECT * FROM ontology_links
      WHERE source_id = $1
    `;
    const params: any[] = [sourceId];
    
    if (linkType) {
      query += ` AND link_type = $2`;
      params.push(linkType);
    }
    
    query += ` ORDER BY created_at ASC`;
    
    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToLink(row));
  }
  
  /**
   * 根据目标对象 ID 查找链接
   */
  async findByTargetId(targetId: string, linkType?: LinkType): Promise<OntologyLink[]> {
    let query = `
      SELECT * FROM ontology_links
      WHERE target_id = $1
    `;
    const params: any[] = [targetId];
    
    if (linkType) {
      query += ` AND link_type = $2`;
      params.push(linkType);
    }
    
    query += ` ORDER BY created_at ASC`;
    
    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToLink(row));
  }
  
  /**
   * 查找特定的链接
   */
  async findLink(
    sourceId: string,
    targetId: string,
    linkType: LinkType
  ): Promise<OntologyLink | null> {
    const query = `
      SELECT * FROM ontology_links
      WHERE source_id = $1 AND target_id = $2 AND link_type = $3
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [sourceId, targetId, linkType]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToLink(result.rows[0]);
  }
  
  /**
   * 创建链接
   */
  async create(
    sourceId: string,
    targetId: string,
    linkType: LinkType,
    metadata?: any
  ): Promise<OntologyLink> {
    const query = `
      INSERT INTO ontology_links (source_id, target_id, link_type, metadata)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (source_id, target_id, link_type)
      DO UPDATE SET metadata = $4, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      sourceId,
      targetId,
      linkType,
      metadata ? JSON.stringify(metadata) : '{}',
    ]);
    
    return this.mapRowToLink(result.rows[0]);
  }
  
  /**
   * 删除链接
   */
  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM ontology_links
      WHERE id = $1
    `;
    
    await this.pool.query(query, [id]);
  }
  
  /**
   * 删除特定的链接
   */
  async deleteLink(
    sourceId: string,
    targetId: string,
    linkType: LinkType
  ): Promise<void> {
    const query = `
      DELETE FROM ontology_links
      WHERE source_id = $1 AND target_id = $2 AND link_type = $3
    `;
    
    await this.pool.query(query, [sourceId, targetId, linkType]);
  }
  
  /**
   * 删除源对象的所有链接
   */
  async deleteBySourceId(sourceId: string, linkType?: LinkType): Promise<number> {
    let query = `
      DELETE FROM ontology_links
      WHERE source_id = $1
    `;
    const params: any[] = [sourceId];
    
    if (linkType) {
      query += ` AND link_type = $2`;
      params.push(linkType);
    }
    
    const result = await this.pool.query(query, params);
    return result.rowCount || 0;
  }
  
  /**
   * 删除目标对象的所有链接
   */
  async deleteByTargetId(targetId: string, linkType?: LinkType): Promise<number> {
    let query = `
      DELETE FROM ontology_links
      WHERE target_id = $1
    `;
    const params: any[] = [targetId];
    
    if (linkType) {
      query += ` AND link_type = $2`;
      params.push(linkType);
    }
    
    const result = await this.pool.query(query, params);
    return result.rowCount || 0;
  }
  
  /**
   * 批量创建链接
   */
  async batchCreate(links: Array<{
    sourceId: string;
    targetId: string;
    linkType: LinkType;
    metadata?: any;
  }>): Promise<OntologyLink[]> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results: OntologyLink[] = [];
      
      for (const link of links) {
        const query = `
          INSERT INTO ontology_links (source_id, target_id, link_type, metadata)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (source_id, target_id, link_type)
          DO UPDATE SET metadata = $4, created_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
        
        const result = await client.query(query, [
          link.sourceId,
          link.targetId,
          link.linkType,
          link.metadata ? JSON.stringify(link.metadata) : '{}',
        ]);
        
        results.push(this.mapRowToLink(result.rows[0]));
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * 获取链接统计
   */
  async getStats(sourceId?: string): Promise<{
    total: number;
    byType: Record<string, number>;
  }> {
    const sourceCondition = sourceId ? 'WHERE source_id = $1' : '';
    const values = sourceId ? [sourceId] : [];
    
    const queries = [
      `SELECT COUNT(*) as total FROM ontology_links ${sourceCondition}`,
      `SELECT link_type, COUNT(*) as count FROM ontology_links ${sourceCondition} GROUP BY link_type`,
    ];
    
    const [totalResult, typeResult] = await Promise.all(
      queries.map(q => this.pool.query(q, values))
    );
    
    const byType: Record<string, number> = {};
    typeResult.rows.forEach(row => {
      byType[row.link_type] = parseInt(row.count);
    });
    
    return {
      total: parseInt(totalResult.rows[0].total),
      byType,
    };
  }
  
  /**
   * 将数据库行映射为 OntologyLink
   */
  private mapRowToLink(row: any): OntologyLink {
    return {
      id: row.id,
      sourceId: row.source_id,
      targetId: row.target_id,
      linkType: row.link_type as LinkType,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }
}
