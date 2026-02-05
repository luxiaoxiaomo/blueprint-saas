/**
 * 项目路由 - 基于本体论模式的新实现
 * 这个文件展示如何使用 OntologyService 和 Actions
 */

import express from 'express';
import { pool } from '../db.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { tenantContext } from '../services/TenantContext.js';
import { OntologyService } from '../ontology/OntologyService.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { CreateProjectAction } from '../ontology/actions/CreateProjectAction.js';
import { ActionContext } from '../ontology/types.js';

const router = express.Router();

// 应用租户中间件
router.use(tenantMiddleware);

// 初始化 Repository 和 OntologyService
const projectRepo = new ProjectRepository(pool);
// TODO: 添加其他 repositories
const ontologyService = new OntologyService(
  projectRepo,
  null, // moduleRepo
  null, // entityRepo
  null  // taskRepo
);

/**
 * 创建项目 - 使用 Action
 * POST /api/projects
 */
router.post('/', async (req, res) => {
  try {
    // 1. 提取用户信息（从 JWT token 中）
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 2. 构建 Action 上下文
    const context: ActionContext = {
      userId,
      userName: (req as any).user?.name,
      ipAddress: req.ip,
      timestamp: new Date(),
    };
    
    // 3. 创建并执行 Action
    const action = new CreateProjectAction(ontologyService);
    const result = await action.run(
      {
        name: req.body.name,
        description: req.body.description,
        userId,
        organizationId: tenantContext.getOrganizationId(),
      },
      context
    );
    
    // 4. 返回结果
    if (result.success) {
      res.status(201).json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

/**
 * 获取用户的所有项目 - 使用 OntologyService
 * GET /api/projects
 */
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 使用 OntologyService 查询
    const projects = await ontologyService.queryObjects('Project', {
      filters: [{ field: 'user_id', operator: 'eq', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    });
    
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

/**
 * 获取单个项目
 * GET /api/projects/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 使用 OntologyService 获取对象
    const project = await ontologyService.getObject('Project', req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    // 验证权限（项目属于当前用户）
    if ((project as any).userId !== userId) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: '获取项目失败' });
  }
});

/**
 * 获取项目的模块 - 使用链接遍历
 * GET /api/projects/:id/modules
 */
router.get('/:id/modules', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    
    // 1. 验证项目权限
    const project = await ontologyService.getObject('Project', req.params.id);
    if (!project || (project as any).userId !== userId) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    // 2. 使用链接遍历获取模块
    const modules = await ontologyService.getLinkedObjects(
      req.params.id,
      'Project→Module'
    );
    
    res.json(modules);
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: '获取模块列表失败' });
  }
});

export default router;
