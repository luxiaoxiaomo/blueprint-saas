/**
 * 任务路由 - 基于本体论架构
 * 支持多租户数据隔离
 */

import express from 'express';
import { pool } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { tenantContext } from '../services/TenantContext.js';
import { OntologyService } from '../ontology/OntologyService.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { ModuleRepository } from '../repositories/ModuleRepository.js';
import { EntityRepository } from '../repositories/EntityRepository.js';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { LinkRepository } from '../repositories/LinkRepository.js';
import { OrganizationRepository } from '../repositories/OrganizationRepository.js';
import { MemberRepository } from '../repositories/MemberRepository.js';
import { AuditService } from '../services/AuditService.js';
import { ActionContext } from '../ontology/types.js';

const router = express.Router();

// 初始化服务
const projectRepo = new ProjectRepository(pool);
const moduleRepo = new ModuleRepository(pool);
const entityRepo = new EntityRepository(pool);
const taskRepo = new TaskRepository(pool);
const linkRepo = new LinkRepository(pool);
const organizationRepo = new OrganizationRepository(pool);
const memberRepo = new MemberRepository(pool);
const auditService = new AuditService(pool);

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
 * 构建 Action 上下文
 */
function buildContext(req: AuthRequest): ActionContext {
  return {
    userId: req.user!.id,
    userName: req.user!.email,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date(),
  };
}

/**
 * 获取项目的所有任务
 * GET /api/tasks?projectId=xxx
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: '缺少 projectId 参数' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', projectId as string);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    // 获取任务
    const tasks = await taskRepo.findByProjectId(projectId as string);
    
    res.json(tasks);
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

/**
 * 获取单个任务
 * GET /api/tasks/:id
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const task = await ontologyService.getObject('Task', req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (task as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此任务' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('获取任务失败:', error);
    res.status(500).json({ error: '获取任务失败' });
  }
});

/**
 * 创建任务
 * POST /api/tasks
 */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { projectId, title, description, status, priority, assigneeId } = req.body;
    
    if (!projectId || !title) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    // 创建任务
    const task = await taskRepo.create({
      projectId,
      userId: req.user!.id,
      name: title,
      status: status || 'todo',
      messages: [],
      files: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'CREATE_TASK',
      resourceType: 'Task',
      resourceId: task.id,
      details: { title, projectId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(task);
  } catch (error) {
    console.error('创建任务失败:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

/**
 * 更新任务
 * PUT /api/tasks/:id
 */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { title, description, status, priority, assigneeId } = req.body;
    
    // 获取现有任务
    const task = await ontologyService.getObject('Task', req.params.id);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (task as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此任务' });
    }
    
    // 更新任务
    const updated = await taskRepo.update(req.params.id, {
      name: title || (task as any).name,
      status: status || (task as any).status,
      updatedAt: new Date(),
    });
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'UPDATE_TASK',
      resourceType: 'Task',
      resourceId: req.params.id,
      details: { title, status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(updated);
  } catch (error) {
    console.error('更新任务失败:', error);
    res.status(500).json({ error: '更新任务失败' });
  }
});

/**
 * 删除任务
 * DELETE /api/tasks/:id
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    // 获取现有任务
    const task = await ontologyService.getObject('Task', req.params.id);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (task as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此任务' });
    }
    
    // 删除任务
    await taskRepo.delete(req.params.id);
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'DELETE_TASK',
      resourceType: 'Task',
      resourceId: req.params.id,
      details: { name: (task as any).name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({ message: '任务已删除' });
  } catch (error) {
    console.error('删除任务失败:', error);
    res.status(500).json({ error: '删除任务失败' });
  }
});

/**
 * 更新任务状态
 * PATCH /api/tasks/:id/status
 */
router.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: '缺少 status 参数' });
    }
    
    // 获取现有任务
    const task = await ontologyService.getObject('Task', req.params.id);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (task as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此任务' });
    }
    
    // 更新任务状态
    const updated = await taskRepo.update(req.params.id, {
      status,
      updatedAt: new Date(),
    });
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'UPDATE_TASK_STATUS',
      resourceType: 'Task',
      resourceId: req.params.id,
      details: { status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(updated);
  } catch (error) {
    console.error('更新任务状态失败:', error);
    res.status(500).json({ error: '更新任务状态失败' });
  }
});

export default router;
