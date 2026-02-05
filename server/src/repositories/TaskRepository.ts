/**
 * TaskRepository - 任务数据访问层
 */

import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository.js';
import { TaskObject } from '../ontology/types.js';

/**
 * 任务 Repository
 */
export class TaskRepository extends BaseRepository<TaskObject> {
  constructor(pool: Pool) {
    super(pool, 'tasks');
  }
  
  /**
   * 根据项目ID查找任务
   */
  async findByProjectId(projectId: string): Promise<TaskObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [projectId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据用户ID查找任务
   */
  async findByUserId(userId: string): Promise<TaskObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据项目ID和用户ID查找任务
   */
  async findByProjectIdAndUserId(projectId: string, userId: string): Promise<TaskObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE project_id = $1 AND user_id = $2
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [projectId, userId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据状态查找任务
   */
  async findByStatus(status: string, userId?: string): Promise<TaskObject[]> {
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE status = $1
    `;
    const params: any[] = [status];
    
    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据任务类型查找任务
   */
  async findByTaskType(taskType: string, userId?: string): Promise<TaskObject[]> {
    let query = `
      SELECT * FROM ${this.tableName}
      WHERE task_type = $1
    `;
    const params: any[] = [taskType];
    
    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 更新任务状态
   */
  async updateStatus(id: string, status: string): Promise<TaskObject> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 添加消息到任务
   */
  async addMessage(id: string, message: any): Promise<TaskObject> {
    const query = `
      UPDATE ${this.tableName}
      SET 
        messages = messages || $1::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [JSON.stringify([message]), id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    return this.mapRowToObject(result.rows[0]);
  }
  
  /**
   * 更新任务结果
   */
  async updateResult(id: string, result: any): Promise<TaskObject> {
    const query = `
      UPDATE ${this.tableName}
      SET 
        result = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const queryResult = await this.pool.query(query, [JSON.stringify(result), id]);
    
    if (queryResult.rows.length === 0) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    return this.mapRowToObject(queryResult.rows[0]);
  }
  
  /**
   * 获取任务统计
   */
  async getStats(userId?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const userCondition = userId ? 'WHERE user_id = $1' : '';
    const values = userId ? [userId] : [];
    
    const queries = [
      `SELECT COUNT(*) as total FROM ${this.tableName} ${userCondition}`,
      `SELECT status, COUNT(*) as count FROM ${this.tableName} ${userCondition} GROUP BY status`,
      `SELECT task_type, COUNT(*) as count FROM ${this.tableName} ${userCondition} GROUP BY task_type`,
    ];
    
    const [totalResult, statusResult, typeResult] = await Promise.all(
      queries.map(q => this.pool.query(q, values))
    );
    
    const byStatus: Record<string, number> = {};
    statusResult.rows.forEach(row => {
      byStatus[row.status] = parseInt(row.count);
    });
    
    const byType: Record<string, number> = {};
    typeResult.rows.forEach(row => {
      if (row.task_type) {
        byType[row.task_type] = parseInt(row.count);
      }
    });
    
    return {
      total: parseInt(totalResult.rows[0].total),
      byStatus,
      byType,
    };
  }
  
  /**
   * 将数据库行映射为 TaskObject
   */
  protected mapRowToObject(row: any): TaskObject {
    return {
      id: row.id,
      type: 'Task',
      projectId: row.project_id,
      userId: row.user_id,
      name: row.name,
      status: row.status,
      taskType: row.task_type,
      messages: row.messages || [],
      files: row.files || [],
      result: row.result,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
