/**
 * 模块路由 - 基于本体论架构
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
import { CreateModuleAction } from '../ontology/actions/CreateModuleAction.js';
import { UpdateModuleAction } from '../ontology/actions/UpdateModuleAction.js';
import { DeleteModuleAction } from '../ontology/actions/DeleteModuleAction.js';
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

// 应用租户中间件到所有路由
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
 * 获取项目的所有模块
 * GET /api/modules?projectId=xxx
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
    
    // 获取模块
    const modules = await moduleRepo.findByProjectId(projectId as string);
    
    res.json(modules);
  } catch (error) {
    console.error('获取模块列表失败:', error);
    res.status(500).json({ error: '获取模块列表失败' });
  }
});

/**
 * 获取单个模块
 * GET /api/modules/:id
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const module = await ontologyService.getObject('Module', req.params.id);
    
    if (!module) {
      return res.status(404).json({ error: '模块不存在' });
    }
    
    // 验证项目权限
    const project = await ontologyService.getObject('Project', (module as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此模块' });
    }
    
    res.json(module);
  } catch (error) {
    console.error('获取模块失败:', error);
    res.status(500).json({ error: '获取模块失败' });
  }
});

/**
 * 创建模块
 * POST /api/modules
 */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const context = buildContext(req);
    const action = new CreateModuleAction(ontologyService, auditService);
    
    const result = await action.run(
      {
        projectId: req.body.projectId,
        name: req.body.name,
        description: req.body.description,
        functionalPoints: req.body.functionalPoints || [],
        sortOrder: req.body.sortOrder,
      },
      context
    );
    
    if (result.success) {
      res.status(201).json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('创建模块失败:', error);
    res.status(500).json({ error: '创建模块失败' });
  }
});

/**
 * 更新模块
 * PUT /api/modules/:id
 */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const context = buildContext(req);
    const action = new UpdateModuleAction(ontologyService, auditService);
    
    const result = await action.run(
      {
        id: req.params.id,
        name: req.body.name,
        description: req.body.description,
        functionalPoints: req.body.functionalPoints,
        sortOrder: req.body.sortOrder,
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
    console.error('更新模块失败:', error);
    res.status(500).json({ error: '更新模块失败' });
  }
});

/**
 * 删除模块
 * DELETE /api/modules/:id
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const context = buildContext(req);
    const action = new DeleteModuleAction(ontologyService, auditService);
    
    const result = await action.run(
      {
        id: req.params.id,
      },
      context
    );
    
    if (result.success) {
      res.json({ message: '模块已删除' });
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
    console.error('删除模块失败:', error);
    res.status(500).json({ error: '删除模块失败' });
  }
});

/**
 * 批量更新模块排序
 * PATCH /api/modules/sort
 */
router.patch('/sort', async (req: AuthRequest, res) => {
  try {
    const { updates } = req.body; // [{ id, sortOrder }, ...]
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: '无效的更新数据' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    
    // 验证所有模块的权限
    for (const update of updates) {
      const module = await ontologyService.getObject('Module', update.id);
      if (!module) {
        return res.status(404).json({ error: `模块 ${update.id} 不存在` });
      }
      
      const project = await ontologyService.getObject('Project', (module as any).projectId);
      if (!project || (project as any).organizationId !== organizationId) {
        return res.status(403).json({ error: '无权修改模块排序' });
      }
    }
    
    // 批量更新
    await moduleRepo.batchUpdateSortOrder(updates);
    
    res.json({ message: '排序更新成功' });
  } catch (error) {
    console.error('更新排序失败:', error);
    res.status(500).json({ error: '更新排序失败' });
  }
});

/**
 * 获取模块的实体
 * GET /api/modules/:id/entities
 */
router.get('/:id/entities', async (req: AuthRequest, res) => {
  try {
    // 验证模块权限
    const module = await ontologyService.getObject('Module', req.params.id);
    if (!module) {
      return res.status(404).json({ error: '模块不存在' });
    }
    
    const project = await ontologyService.getObject('Project', (module as any).projectId);
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const organizationId = tenantContext.getOrganizationId();
    if ((project as any).organizationId !== organizationId) {
      return res.status(403).json({ error: '无权访问此模块' });
    }
    
    // 获取实体
    const entities = await ontologyService.getLinkedObjects(
      req.params.id,
      'Module→Entity'
    );
    
    res.json(entities);
  } catch (error) {
    console.error('获取实体列表失败:', error);
    res.status(500).json({ error: '获取实体列表失败' });
  }
});

export default router;
