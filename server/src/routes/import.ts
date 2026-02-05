import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// 导入备份数据
router.post('/backup', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projects } = req.body;
    const userId = (req as any).user.id;

    if (!projects || !Array.isArray(projects)) {
      return res.status(400).json({ error: '无效的备份数据格式' });
    }

    // 开始事务
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let importedCount = 0;
      let skippedCount = 0;

      for (const project of projects) {
        // 检查项目ID是否已存在（全局检查）
        const existingProjectById = await client.query(
          'SELECT id FROM projects WHERE id = $1',
          [project.id]
        );

        let projectId = project.id;
        
        // 如果项目ID已存在，生成新的UUID
        if (existingProjectById.rows.length > 0) {
          const result = await client.query('SELECT gen_random_uuid() as new_id');
          projectId = result.rows[0].new_id;
        }

        // 检查当前用户是否已有同名项目
        const existingProjectByName = await client.query(
          'SELECT id FROM projects WHERE user_id = $1 AND name = $2',
          [userId, project.name]
        );

        if (existingProjectByName.rows.length > 0) {
          // 用户已有同名项目，跳过
          skippedCount++;
          continue;
        }

        // 插入项目
        await client.query(
          `INSERT INTO projects (id, user_id, name, description, model, created_at, is_archived)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            projectId,
            userId,
            project.name || '未命名项目',
            project.description || '',
            project.model || {},
            new Date(project.createdAt || Date.now()),
            project.isArchived || false
          ]
        );

        importedCount++;
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `成功导入 ${importedCount} 个项目${skippedCount > 0 ? `，跳过 ${skippedCount} 个已存在的项目` : ''}`,
        imported: importedCount,
        skipped: skippedCount
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('导入备份数据失败:', error);
    res.status(500).json({ error: '导入失败' });
  }
});

export default router;
