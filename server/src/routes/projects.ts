/**
 * 项目路由 - 集成本体论架构
 * 使用 Actions 和 OntologyService
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
import { PermissionService } from '../services/PermissionService.js';
import { CreateProjectAction } from '../ontology/actions/CreateProjectAction.js';
import { UpdateProjectAction } from '../ontology/actions/UpdateProjectAction.js';
import { DeleteProjectAction } from '../ontology/actions/DeleteProjectAction.js';
import { ArchiveProjectAction } from '../ontology/actions/ArchiveProjectAction.js';
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
const permissionService = new PermissionService(pool);

const ontologyService = new OntologyService(
  projectRepo,
  moduleRepo,
  entityRepo,
  taskRepo,
  linkRepo,
  organizationRepo,
  memberRepo
);

// 应用认证和租户中间件到所有路由
router.use(authenticateToken);
router.use(tenantMiddleware);

/**
 * 构建 Action 上下文
 */
function buildContext(req: AuthRequest): ActionContext {
  return {
    userId: req.user!.id,
    userName: req.user!.email, // 使用 email 作为 userName
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date(),
  };
}

/**
 * 获取当前组织的所有项目
 * GET /api/projects
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const organizationId = tenantContext.getOrganizationId();
    const projects = await projectRepo.findByOrganizationId(organizationId);
    
    res.json(projects);
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

/**
 * 获取单个项目
 * GET /api/projects/:id
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await ontologyService.getObject('Project', req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 验证项目是否属于当前组织
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('获取项目失败:', error);
    res.status(500).json({ error: '获取项目失败' });
  }
});

/**
 * 创建项目
 * POST /api/projects
 */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const context = buildContext(req);
    const action = new CreateProjectAction(ontologyService, auditService);
    const organizationId = tenantContext.getOrganizationId();
    
    const result = await action.run(
      {
        name: req.body.name,
        description: req.body.description,
        userId: req.user!.id,
        organizationId,
      },
      context
    );
    
    if (result.success) {
      res.status(201).json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

/**
 * 更新项目
 * PUT /api/projects/:id
 */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const context = buildContext(req);
    const action = new UpdateProjectAction(ontologyService, auditService);
    
    const result = await action.run(
      {
        id: req.params.id,
        name: req.body.name,
        description: req.body.description,
        model: req.body.model,
      },
      context
    );
    
    if (result.success) {
      res.json(result.data);
    } else {
      if (result.error?.includes('不存在')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('权限')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
    }
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

/**
 * 删除项目
 * DELETE /api/projects/:id
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const context = buildContext(req);
    const action = new DeleteProjectAction(ontologyService, auditService);
    
    const result = await action.run(
      {
        id: req.params.id,
      },
      context
    );
    
    if (result.success) {
      res.json({ message: '项目已删除' });
    } else {
      if (result.error?.includes('不存在')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('权限')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
    }
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

/**
 * 归档/取消归档项目
 * PATCH /api/projects/:id/archive
 */
router.patch('/:id/archive', async (req: AuthRequest, res) => {
  try {
    const context = buildContext(req);
    const action = new ArchiveProjectAction(ontologyService, auditService);
    
    const result = await action.run(
      {
        id: req.params.id,
        archived: req.body.archived !== false, // 默认为 true
      },
      context
    );
    
    if (result.success) {
      res.json(result.data);
    } else {
      if (result.error?.includes('不存在')) {
        res.status(404).json({ error: result.error });
      } else if (result.error?.includes('权限')) {
        res.status(403).json({ error: result.error });
      } else {
        res.status(400).json({ error: result.error });
      }
    }
  } catch (error) {
    console.error('归档项目失败:', error);
    res.status(500).json({ error: '归档项目失败' });
  }
});

/**
 * 获取项目的模块
 * GET /api/projects/:id/modules
 */
router.get('/:id/modules', async (req: AuthRequest, res) => {
  try {
    // 验证项目权限
    const project = await ontologyService.getObject('Project', req.params.id);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    // 获取模块
    const modules = await ontologyService.getLinkedObjects(
      req.params.id,
      'Project→Module'
    );
    
    res.json(modules);
  } catch (error) {
    console.error('获取模块列表失败:', error);
    res.status(500).json({ error: '获取模块列表失败' });
  }
});

/**
 * 获取项目的实体
 * GET /api/projects/:id/entities
 */
router.get('/:id/entities', async (req: AuthRequest, res) => {
  try {
    // 验证项目权限
    const project = await ontologyService.getObject('Project', req.params.id);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    // 获取实体
    const entities = await ontologyService.getLinkedObjects(
      req.params.id,
      'Project→Entity'
    );
    
    res.json(entities);
  } catch (error) {
    console.error('获取实体列表失败:', error);
    res.status(500).json({ error: '获取实体列表失败' });
  }
});

/**
 * 获取项目的任务
 * GET /api/projects/:id/tasks
 */
router.get('/:id/tasks', async (req: AuthRequest, res) => {
  try {
    // 验证项目权限
    const project = await ontologyService.getObject('Project', req.params.id);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    // 获取任务
    const tasks = await ontologyService.getLinkedObjects(
      req.params.id,
      'Project→Task'
    );
    
    res.json(tasks);
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

export default router;
