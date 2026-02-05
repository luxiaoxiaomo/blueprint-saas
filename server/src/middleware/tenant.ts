/**
 * 租户中间件
 * 从请求中提取租户信息并设置租户上下文
 */

import { Request, Response, NextFunction } from 'express';
import { tenantContext } from '../services/TenantContext.js';
import { pool } from '../db.js';

/**
 * 扩展 Express Request 类型以包含用户信息
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

/**
 * 租户中间件
 * 必须在 auth 中间件之后使用
 */
export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 确保用户已认证
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证：需要登录'
      });
    }

    // 从请求中获取组织ID
    // 优先级：1. 请求体 2. 查询参数 3. 路径参数 4. 用户默认组织
    let organizationId = 
      req.body?.organizationId || 
      req.query?.organizationId || 
      req.params?.organizationId;

    // 如果没有指定组织ID，尝试从用户的成员关系中获取
    if (!organizationId) {
      const result = await pool.query(
        `SELECT organization_id 
         FROM members 
         WHERE user_id = $1 
         AND status = 'active'
         ORDER BY created_at DESC 
         LIMIT 1`,
        [req.user.id]
      );

      if (result.rows.length > 0) {
        organizationId = result.rows[0].organization_id;
      } else {
        return res.status(403).json({
          success: false,
          error: '未找到组织：用户不属于任何组织'
        });
      }
    }

    // 验证用户是否有权访问该组织
    const memberCheck = await pool.query(
      `SELECT id, role, status 
       FROM members 
       WHERE user_id = $1 AND organization_id = $2`,
      [req.user.id, organizationId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '访问被拒绝：您不是该组织的成员'
      });
    }

    const member = memberCheck.rows[0];
    if (member.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `访问被拒绝：您的成员状态为 ${member.status}`
      });
    }

    // 设置租户上下文并执行后续处理
    tenantContext.run(
      {
        organizationId,
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: member.role
      },
      () => {
        next();
      }
    );
  } catch (error) {
    console.error('租户中间件错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误：无法设置租户上下文'
    });
  }
};

/**
 * 可选的租户中间件
 * 如果有组织ID则设置上下文，否则继续
 * 用于不强制要求组织上下文的路由
 */
export const optionalTenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next();
    }

    const organizationId = 
      req.body?.organizationId || 
      req.query?.organizationId || 
      req.params?.organizationId;

    if (!organizationId) {
      return next();
    }

    // 验证用户是否有权访问该组织
    const memberCheck = await pool.query(
      `SELECT id, role, status 
       FROM members 
       WHERE user_id = $1 AND organization_id = $2`,
      [req.user.id, organizationId]
    );

    if (memberCheck.rows.length === 0 || memberCheck.rows[0].status !== 'active') {
      return next();
    }

    const member = memberCheck.rows[0];

    // 设置租户上下文
    tenantContext.run(
      {
        organizationId,
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: member.role
      },
      () => {
        next();
      }
    );
  } catch (error) {
    console.error('可选租户中间件错误:', error);
    next();
  }
};
