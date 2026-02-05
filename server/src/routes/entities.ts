/**
 * 实体路由 - 基于本体论架构
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
 * 获取项目的所有实体
 * GET /api/entities?projectId=xxx
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
    
    // 获取实体
    const entities = await entityRepo.findByProjectId(projectId as string);
    
    res.json(entities);
  } catch (error) {
    console.error('获取实体列表失败:', error);
    res.status(500).json({ error: '获取实体列表失败' });
  }
});

/**
 * 获取单个实体
 * GET /api/entities/:id
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const entity = await ontologyService.getObject('Entity', req.params.id);
    
    if (!entity) {
      return res.status(404).json({ error: '实体不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (entity as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此实体' });
    }
    
    res.json(entity);
  } catch (error) {
    console.error('获取实体失败:', error);
    res.status(500).json({ error: '获取实体失败' });
  }
});

/**
 * 创建实体
 * POST /api/entities
 */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { projectId, name, description, attributes } = req.body;
    
    if (!projectId || !name) {
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
    
    // 创建实体
    const entity = await entityRepo.create({
      projectId,
      name,
      description: description || '',
      attributes: attributes || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'CREATE_ENTITY',
      resourceType: 'Entity',
      resourceId: entity.id,
      details: { name, projectId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(entity);
  } catch (error) {
    console.error('创建实体失败:', error);
    res.status(500).json({ error: '创建实体失败' });
  }
});

/**
 * 更新实体
 * PUT /api/entities/:id
 */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, description, attributes } = req.body;
    
    // 获取现有实体
    const entity = await ontologyService.getObject('Entity', req.params.id);
    if (!entity) {
      return res.status(404).json({ error: '实体不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (entity as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此实体' });
    }
    
    // 更新实体
    const updated = await entityRepo.update(req.params.id, {
      name: name || (entity as any).name,
      description: description !== undefined ? description : (entity as any).description,
      attributes: attributes || (entity as any).attributes,
      updatedAt: new Date(),
    });
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'UPDATE_ENTITY',
      resourceType: 'Entity',
      resourceId: req.params.id,
      details: { name, description },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(updated);
  } catch (error) {
    console.error('更新实体失败:', error);
    res.status(500).json({ error: '更新实体失败' });
  }
});

/**
 * 删除实体
 * DELETE /api/entities/:id
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    // 获取现有实体
    const entity = await ontologyService.getObject('Entity', req.params.id);
    if (!entity) {
      return res.status(404).json({ error: '实体不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (entity as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此实体' });
    }
    
    // 删除实体
    await entityRepo.delete(req.params.id);
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'DELETE_ENTITY',
      resourceType: 'Entity',
      resourceId: req.params.id,
      details: { name: (entity as any).name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({ message: '实体已删除' });
  } catch (error) {
    console.error('删除实体失败:', error);
    res.status(500).json({ error: '删除实体失败' });
  }
});

/**
 * 获取实体的属性
 * GET /api/entities/:id/attributes
 */
router.get('/:id/attributes', async (req: AuthRequest, res) => {
  try {
    const entity = await ontologyService.getObject('Entity', req.params.id);
    if (!entity) {
      return res.status(404).json({ error: '实体不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (entity as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此实体' });
    }
    
    res.json((entity as any).attributes || {});
  } catch (error) {
    console.error('获取实体属性失败:', error);
    res.status(500).json({ error: '获取实体属性失败' });
  }
});

export default router;
