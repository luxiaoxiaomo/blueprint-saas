/**
 * 部门管理路由
 * 使用租户中间件确保数据隔离
 */

import express from 'express';
import { pool } from '../db.js';
import { DepartmentRepository } from '../repositories/DepartmentRepository.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { tenantContext } from '../services/TenantContext.js';

const router = express.Router();

// 初始化 Repository
const departmentRepo = new DepartmentRepository(pool);

// 应用租户中间件到所有路由
router.use(tenantMiddleware);

/**
 * 获取当前组织的所有部门
 * GET /api/departments
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = tenantContext.getOrganizationId();
    const departments = await departmentRepo.findByOrganizationId(organizationId);
    
    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('获取组织部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取组织部门失败',
    });
  }
});

/**
 * 获取根部门
 * GET /api/departments/roots
 */
router.get('/roots', async (req, res) => {
  try {
    const organizationId = tenantContext.getOrganizationId();
    const departments = await departmentRepo.findRootDepartments(organizationId);
    
    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('获取根部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取根部门失败',
    });
  }
});

/**
 * 获取部门详情
 * GET /api/departments/:departmentId
 */
router.get('/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    const department = await departmentRepo.findById(departmentId);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        error: '部门不存在',
      });
    }
    
    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error('获取部门详情失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取部门详情失败',
    });
  }
});

/**
 * 获取子部门
 * GET /api/departments/:departmentId/children
 */
router.get('/:departmentId/children', async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    const children = await departmentRepo.findByParentId(departmentId);
    
    res.json({
      success: true,
      data: children,
    });
  } catch (error) {
    console.error('获取子部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取子部门失败',
    });
  }
});

/**
 * 获取部门的所有祖先
 * GET /api/departments/:departmentId/ancestors
 */
router.get('/:departmentId/ancestors', async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    const ancestors = await departmentRepo.getAncestors(departmentId);
    
    res.json({
      success: true,
      data: ancestors,
    });
  } catch (error) {
    console.error('获取部门祖先失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取部门祖先失败',
    });
  }
});

/**
 * 获取部门的所有后代
 * GET /api/departments/:departmentId/descendants
 */
router.get('/:departmentId/descendants', async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    const descendants = await departmentRepo.getDescendants(departmentId);
    
    res.json({
      success: true,
      data: descendants,
    });
  } catch (error) {
    console.error('获取部门后代失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取部门后代失败',
    });
  }
});

/**
 * 创建部门
 * POST /api/departments
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, parentId, sortOrder } = req.body;
    const organizationId = tenantContext.getOrganizationId();
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '部门名称不能为空',
      });
    }
    
    const department = await departmentRepo.create({
      type: 'Department',
      organizationId,
      name,
      description,
      parentId: parentId || undefined,
      sortOrder: sortOrder || 0,
      path: '', // 将由 create 方法计算
      level: 0, // 将由 create 方法计算
      id: '', // 将由数据库生成
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error('创建部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建部门失败',
    });
  }
});

/**
 * 更新部门
 * PUT /api/departments/:departmentId
 */
router.put('/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { name, description, sortOrder } = req.body;
    
    const department = await departmentRepo.update(departmentId, {
      name,
      description,
      sortOrder,
    });
    
    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error('更新部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新部门失败',
    });
  }
});

/**
 * 移动部门
 * POST /api/departments/:departmentId/move
 */
router.post('/:departmentId/move', async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { newParentId } = req.body;
    
    const department = await departmentRepo.moveDepartment(
      departmentId,
      newParentId || null
    );
    
    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    console.error('移动部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '移动部门失败',
    });
  }
});

/**
 * 删除部门
 * DELETE /api/departments/:departmentId
 */
router.delete('/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    await departmentRepo.delete(departmentId);
    
    res.json({
      success: true,
      message: '部门已删除',
    });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除部门失败',
    });
  }
});

export default router;
