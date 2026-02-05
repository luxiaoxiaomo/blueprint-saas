/**
 * DepartmentRepository - 部门数据访问层（树形结构）
 */

import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository.js';

/**
 * 部门对象接口
 */
export interface DepartmentObject {
  id: string;
  type: 'Department';
  organizationId: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string; // 路径，例如: "/1/2/3"
  level: number; // 层级，根部门为 0
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 部门 Repository
 */
export class DepartmentRepository extends BaseRepository<DepartmentObject> {
  constructor(pool: Pool) {
    super(pool, 'departments');
  }
  
  /**
   * 根据组织 ID 查找所有部门
   */
  async findByOrganizationId(organizationId: string): Promise<DepartmentObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1
      ORDER BY path, sort_order
    `;
    
    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 根据父部门 ID 查找子部门
   */
  async findByParentId(parentId: string): Promise<DepartmentObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE parent_id = $1
      ORDER BY sort_order
    `;
    
    const result = await this.pool.query(query, [parentId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 获取根部门（没有父部门的部门）
   */
  async findRootDepartments(organizationId: string): Promise<DepartmentObject[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE organization_id = $1 AND parent_id IS NULL
      ORDER BY sort_order
    `;
    
    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 获取部门的所有祖先（从根到父）
   */
  async getAncestors(departmentId: string): Promise<DepartmentObject[]> {
    const department = await this.findById(departmentId);
    if (!department) {
      throw new Error(`Department with id ${departmentId} not found`);
    }
    
    // 从路径中提取所有祖先 ID
    const ancestorIds = department.path
      .split('/')
      .filter(id => id && id !== departmentId);
    
    if (ancestorIds.length === 0) {
      return [];
    }
    
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE id = ANY($1)
      ORDER BY level
    `;
    
    const result = await this.pool.query(query, [ancestorIds]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 获取部门的所有后代（子孙）
   */
  async getDescendants(departmentId: string): Promise<DepartmentObject[]> {
    const department = await this.findById(departmentId);
    if (!department) {
      throw new Error(`Department with id ${departmentId} not found`);
    }
    
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE path LIKE $1 AND id != $2
      ORDER BY path, sort_order
    `;
    
    const result = await this.pool.query(query, [`${department.path}%`, departmentId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  /**
   * 创建部门
   */
  async create(data: Partial<DepartmentObject>): Promise<DepartmentObject> {
    // 计算路径和层级
    let path = '';
    let level = 0;
    
    if (data.parentId) {
      const parent = await this.findById(data.parentId);
      if (!parent) {
        throw new Error(`Parent department with id ${data.parentId} not found`);
      }
      
      // 验证父部门属于同一组织
      if (parent.organizationId !== data.organizationId) {
        throw new Error('Parent department must belong to the same organization');
      }
      
      path = `${parent.path}/${data.parentId}`;
      level = parent.level + 1;
    } else {
      // 根部门
      path = '';
      level = 0;
    }
    
    const query = `
      INSERT INTO ${this.tableName} (
        organization_id, name, description, parent_id, path, level, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      data.organizationId,
      data.name,
      data.description || null,
      data.parentId || null,
      path,
      level,
      data.sortOrder || 0,
    ];
    
    const result = await this.pool.query(query, values);
    const department = this.mapRowToObject(result.rows[0]);
    
    // 更新路径以包含自己的 ID
    await this.updatePath(department.id, `${path}/${department.id}`);
    
    return this.findById(department.id) as Promise<DepartmentObject>;
  }
  
  /**
   * 更新部门路径
   */
  private async updatePath(id: string, path: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET path = $1
      WHERE id = $2
    `;
    
    await this.pool.query(query, [path, id]);
  }
  
  /**
   * 移动部门到新父部门
   */
  async moveDepartment(departmentId: string, newParentId: string | null): Promise<DepartmentObject> {
    const department = await this.findById(departmentId);
    if (!department) {
      throw new Error(`Department with id ${departmentId} not found`);
    }
    
    // 计算新路径和层级
    let newPath = '';
    let newLevel = 0;
    
    if (newParentId) {
      const newParent = await this.findById(newParentId);
      if (!newParent) {
        throw new Error(`New parent department with id ${newParentId} not found`);
      }
      
      // 验证不能移动到自己的后代
      if (newParent.path.startsWith(department.path)) {
        throw new Error('Cannot move department to its own descendant');
      }
      
      // 验证属于同一组织
      if (newParent.organizationId !== department.organizationId) {
        throw new Error('New parent must belong to the same organization');
      }
      
      newPath = `${newParent.path}/${newParentId}/${departmentId}`;
      newLevel = newParent.level + 1;
    } else {
      // 移动到根级别
      newPath = `/${departmentId}`;
      newLevel = 0;
    }
    
    // 更新部门及其所有后代的路径和层级
    const oldPath = department.path;
    const levelDiff = newLevel - department.level;
    
    const query = `
      UPDATE ${this.tableName}
      SET 
        path = $1 || SUBSTRING(path FROM ${oldPath.length + 1}),
        level = level + $2,
        parent_id = CASE WHEN id = $3 THEN $4 ELSE parent_id END,
        updated_at = CURRENT_TIMESTAMP
      WHERE path LIKE $5
      RETURNING *
    `;
    
    await this.pool.query(query, [
      newPath.substring(0, newPath.lastIndexOf('/')),
      levelDiff,
      departmentId,
      newParentId,
      `${oldPath}%`,
    ]);
    
    return this.findById(departmentId) as Promise<DepartmentObject>;
  }
  
  /**
   * 删除部门（级联删除所有后代）
   */
  async delete(id: string): Promise<void> {
    const department = await this.findById(id);
    if (!department) {
      throw new Error(`Department with id ${id} not found`);
    }
    
    // 删除部门及其所有后代
    const query = `
      DELETE FROM ${this.tableName}
      WHERE path LIKE $1
    `;
    
    await this.pool.query(query, [`${department.path}%`]);
  }
  
  /**
   * 将数据库行映射为 DepartmentObject
   */
  protected mapRowToObject(row: any): DepartmentObject {
    return {
      id: row.id,
      type: 'Department',
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      parentId: row.parent_id,
      path: row.path,
      level: row.level,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
