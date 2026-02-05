/**
 * 链接路由 - 基于本体论架构
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
 * 获取对象的所有链接
 * GET /api/links?sourceId=xxx
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { sourceId } = req.query;
    
    if (!sourceId) {
      return res.status(400).json({ error: '缺少 sourceId 参数' });
    }
    
    // 获取链接
    const links = await linkRepo.findBySourceId(sourceId as string);
    
    res.json(links);
  } catch (error) {
    console.error('获取链接列表失败:', error);
    res.status(500).json({ error: '获取链接列表失败' });
  }
});

/**
 * 获取单个链接
 * GET /api/links/:id
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const link = await linkRepo.findById(req.params.id);
    
    if (!link) {
      return res.status(404).json({ error: '链接不存在' });
    }
    
    res.json(link);
  } catch (error) {
    console.error('获取链接失败:', error);
    res.status(500).json({ error: '获取链接失败' });
  }
});

/**
 * 创建链接
 * POST /api/links
 */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { sourceId, targetId, linkType, metadata } = req.body;
    
    if (!sourceId || !targetId || !linkType) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 创建链接
    const link = await linkRepo.create(sourceId, targetId, linkType as any, metadata || {});
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'CREATE_LINK',
      resourceType: 'Link',
      resourceId: link.id,
      details: { sourceId, targetId, linkType },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.status(201).json(link);
  } catch (error) {
    console.error('创建链接失败:', error);
    res.status(500).json({ error: '创建链接失败' });
  }
});

/**
 * 更新链接
 * PUT /api/links/:id
 */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { metadata } = req.body;
    
    // 获取现有链接
    const link = await linkRepo.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: '链接不存在' });
    }
    
    // 更新链接元数据
    const updated = { ...link, metadata: metadata || link.metadata };
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'UPDATE_LINK',
      resourceType: 'Link',
      resourceId: req.params.id,
      details: { sourceId: link.sourceId, targetId: link.targetId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json(updated);
  } catch (error) {
    console.error('更新链接失败:', error);
    res.status(500).json({ error: '更新链接失败' });
  }
});

/**
 * 删除链接
 * DELETE /api/links/:id
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    // 获取现有链接
    const link = await linkRepo.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ error: '链接不存在' });
    }
    
    // 删除链接
    await linkRepo.delete(req.params.id);
    
    // 记录审计日志
    await auditService.log({
      userId: req.user!.id,
      action: 'DELETE_LINK',
      resourceType: 'Link',
      resourceId: req.params.id,
      details: { sourceId: link.sourceId, targetId: link.targetId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({ message: '链接已删除' });
  } catch (error) {
    console.error('删除链接失败:', error);
    res.status(500).json({ error: '删除链接失败' });
  }
});

export default router;
