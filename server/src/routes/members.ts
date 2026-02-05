/**
 * 成员管理路由
 * 使用租户中间件确保数据隔离
 */

import express from 'express';
import { pool } from '../db.js';
import { MemberRepository } from '../repositories/MemberRepository.js';
import { DepartmentRepository } from '../repositories/DepartmentRepository.js';
import { OrganizationRepository } from '../repositories/OrganizationRepository.js';
import { OntologyService } from '../ontology/OntologyService.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { ModuleRepository } from '../repositories/ModuleRepository.js';
import { EntityRepository } from '../repositories/EntityRepository.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { LinkRepository } from '../repositories/LinkRepository.js';
import { AuditService } from '../services/AuditService.js';
import { PermissionService } from '../services/PermissionService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { tenantContext } from '../services/TenantContext.js';
import {
  AssignMemberToDepartmentAction,
  TransferMemberAction,
  UpdateMemberRoleAction,
  RemoveMemberFromOrganizationAction,
} from '../ontology/actions/index.js';

const router = express.Router();

// 初始化 Repositories
const memberRepo = new MemberRepository(pool);
const departmentRepo = new DepartmentRepository(pool);
const organizationRepo = new OrganizationRepository(pool);
const projectRepo = new ProjectRepository(pool);
const moduleRepo = new ModuleRepository(pool);
const entityRepo = new EntityRepository(pool);
const taskRepo = new TaskRepository(pool);
const linkRepo = new LinkRepository(pool);

// 初始化 Services
const auditService = new AuditService(pool);
const permissionService = new PermissionService(pool);

// 初始化 OntologyService
const ontologyService = new OntologyService(
  projectRepo,
  moduleRepo,
  entityRepo,
  taskRepo,
  linkRepo,
  organizationRepo,
  memberRepo
);

// 应用租户中间件到所有路由
router.use(tenantMiddleware);

/**
 * 获取当前组织的所有成员
 * GET /api/members
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = tenantContext.getOrganizationId();
    const members = await memberRepo.findByOrganizationId(organizationId);
    
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('获取组织成员失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取组织成员失败',
    });
  }
});

/**
 * 获取部门的所有成员
 * GET /api/members/department/:departmentId
 */
router.get('/department/:departmentId', async (req, res) => {
  try {
    const { departmentId } = req.params;
    const members = await memberRepo.findByDepartmentId(departmentId);
    
    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('获取部门成员失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取部门成员失败',
    });
  }
});

/**
 * 获取成员详情
 * GET /api/members/:memberId
 */
router.get('/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const member = await memberRepo.findById(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        error: '成员不存在',
      });
    }
    
    res.json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error('获取成员详情失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取成员详情失败',
    });
  }
});

/**
 * 分配成员到部门
 * POST /api/members/:memberId/assign-department
 */
router.post('/:memberId/assign-department', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { departmentId } = req.body;
    const organizationId = tenantContext.getOrganizationId();
    
    const action = new AssignMemberToDepartmentAction(
      ontologyService,
      auditService,
      permissionService
    );
    
    const result = await action.run(
      {
        memberId,
        departmentId: departmentId || null,
        organizationId,
      },
      {
        userId: tenantContext.getUserId(),
        userName: tenantContext.getUserEmail(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
      }
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('分配成员到部门失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '分配成员到部门失败',
    });
  }
});

/**
 * 转移成员到另一个部门
 * POST /api/members/:memberId/transfer
 */
router.post('/:memberId/transfer', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { fromDepartmentId, toDepartmentId, reason } = req.body;
    const organizationId = tenantContext.getOrganizationId();
    
    const action = new TransferMemberAction(
      ontologyService,
      auditService,
      permissionService
    );
    
    const result = await action.run(
      {
        memberId,
        fromDepartmentId: fromDepartmentId || null,
        toDepartmentId,
        organizationId,
        reason,
      },
      {
        userId: tenantContext.getUserId(),
        userName: tenantContext.getUserEmail(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
      }
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('转移成员失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '转移成员失败',
    });
  }
});

/**
 * 更新成员角色
 * PUT /api/members/:memberId/role
 */
router.put('/:memberId/role', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;
    const organizationId = tenantContext.getOrganizationId();
    
    const action = new UpdateMemberRoleAction(
      ontologyService,
      auditService,
      permissionService
    );
    
    const result = await action.run(
      {
        memberId,
        newRole: role,
        organizationId,
      },
      {
        userId: tenantContext.getUserId(),
        userName: tenantContext.getUserEmail(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
      }
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('更新成员角色失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新成员角色失败',
    });
  }
});

/**
 * 从组织中移除成员
 * DELETE /api/members/:memberId
 */
router.delete('/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body;
    const organizationId = tenantContext.getOrganizationId();
    
    const action = new RemoveMemberFromOrganizationAction(
      ontologyService,
      auditService,
      permissionService
    );
    
    const result = await action.run(
      {
        memberId,
        organizationId,
        reason,
      },
      {
        userId: tenantContext.getUserId(),
        userName: tenantContext.getUserEmail(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date(),
      }
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('移除成员失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '移除成员失败',
    });
  }
});

/**
 * 获取成员统计
 * GET /api/members/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const organizationId = tenantContext.getOrganizationId();
    const stats = await memberRepo.getStats(organizationId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('获取成员统计失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取成员统计失败',
    });
  }
});

export default router;
