/**
 * 审计日志路由
 */

import express from 'express';
import { pool } from '../db.js';
import { AuditService } from '../services/AuditService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const auditService = new AuditService(pool);

/**
 * 获取审计日志列表
 * GET /api/audit-logs
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    
    // 解析查询参数
    const options = {
      userId: req.query.userId as string | undefined,
      action: req.query.action as string | undefined,
      resourceType: req.query.resourceType as string | undefined,
      resourceId: req.query.resourceId as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };
    
    // 如果不是查询所有用户，则只返回当前用户的日志
    if (!options.userId) {
      options.userId = userId;
    }
    
    const logs = await auditService.query(options);
    res.json(logs);
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

/**
 * 获取单条审计日志
 * GET /api/audit-logs/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    const log = await auditService.getById(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    
    // 只能查看自己的审计日志
    if (log.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(log);
  } catch (error) {
    console.error('Failed to get audit log:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

/**
 * 获取审计日志统计
 * GET /api/audit-logs/stats
 */
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const stats = await auditService.getStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Failed to get audit stats:', error);
    res.status(500).json({ error: 'Failed to get audit stats' });
  }
});

export default router;
