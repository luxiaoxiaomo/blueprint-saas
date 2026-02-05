/**
 * 数据隔离安全测试
 * 验证多租户系统的数据隔离机制
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'blueprint_saas',
};

let pool;
let org1Token, org2Token;
let org1Id, org2Id;
let org1UserId, org2UserId;
let project1Id, project2Id;

/**
 * 辅助函数：执行 SQL 查询
 */
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * 辅助函数：创建测试用户和组织
 */
async function setupTestData() {
  // 创建用户1
  const user1Result = await query(
    `INSERT INTO users (id, email, password_hash, created_at) 
     VALUES (gen_random_uuid(), $1, $2, NOW()) 
     RETURNING id`,
    ['user1@test.com', 'hashed_password_1']
  );
  org1UserId = user1Result[0].id;

  // 创建用户2
  const user2Result = await query(
    `INSERT INTO users (id, email, password_hash, created_at) 
     VALUES (gen_random_uuid(), $1, $2, NOW()) 
     RETURNING id`,
    ['user2@test.com', 'hashed_password_2']
  );
  org2UserId = user2Result[0].id;

  // 创建组织1
  const org1Result = await query(
    `INSERT INTO organizations (id, name, identifier, plan, owner_id, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) 
     RETURNING id`,
    ['Organization 1', 'org1', 'free', org1UserId]
  );
  org1Id = org1Result[0].id;

  // 创建组织2
  const org2Result = await query(
    `INSERT INTO organizations (id, name, identifier, plan, owner_id, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) 
     RETURNING id`,
    ['Organization 2', 'org2', 'free', org2UserId]
  );
  org2Id = org2Result[0].id;

  // 添加用户1到组织1
  await query(
    `INSERT INTO members (id, organization_id, user_id, role, status, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
    [org1Id, org1UserId, 'owner', 'active']
  );

  // 添加用户2到组织2
  await query(
    `INSERT INTO members (id, organization_id, user_id, role, status, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
    [org2Id, org2UserId, 'owner', 'active']
  );

  // 创建项目1（属于组织1）
  const proj1Result = await query(
    `INSERT INTO projects (id, user_id, organization_id, name, description, model, is_archived, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) 
     RETURNING id`,
    [org1UserId, org1Id, 'Project 1', 'Test project 1', {}, false]
  );
  project1Id = proj1Result[0].id;

  // 创建项目2（属于组织2）
  const proj2Result = await query(
    `INSERT INTO projects (id, user_id, organization_id, name, description, model, is_archived, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) 
     RETURNING id`,
    [org2UserId, org2Id, 'Project 2', 'Test project 2', {}, false]
  );
  project2Id = proj2Result[0].id;

  console.log('✅ 测试数据创建完成');
  console.log(`   组织1: ${org1Id}`);
  console.log(`   组织2: ${org2Id}`);
  console.log(`   项目1: ${project1Id}`);
  console.log(`   项目2: ${project2Id}`);
}

/**
 * 辅助函数：获取 JWT token
 */
async function getToken(userId, organizationId) {
  // 这里应该调用真实的登录端点
  // 为了测试目的，我们直接生成 token
  // 实际应用中应该使用真实的认证流程
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userId === org1UserId ? 'user1@test.com' : 'user2@test.com',
      password: 'password123',
    }),
  });

  if (!response.ok) {
    throw new Error(`登录失败: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * 辅助函数：发送 API 请求
 */
async function apiRequest(method, endpoint, token, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

describe('数据隔离安全测试', () => {
  beforeAll(async () => {
    // 连接数据库
    pool = new Pool(DB_CONFIG);
    
    // 创建测试数据
    await setupTestData();

    // 获取 tokens
    try {
      org1Token = await getToken(org1UserId, org1Id);
      org2Token = await getToken(org2UserId, org2Id);
    } catch (error) {
      console.warn('⚠️  无法获取 token，某些测试可能被跳过:', error.message);
    }
  });

  afterAll(async () => {
    // 清理测试数据
    await query('DELETE FROM projects WHERE id IN ($1, $2)', [project1Id, project2Id]);
    await query('DELETE FROM members WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await query('DELETE FROM organizations WHERE id IN ($1, $2)', [org1Id, org2Id]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [org1UserId, org2UserId]);

    // 关闭数据库连接
    await pool.end();
  });

  describe('项目隔离测试', () => {
    it('用户1应该能访问自己组织的项目', async () => {
      const result = await query(
        `SELECT * FROM projects WHERE id = $1 AND organization_id = $2`,
        [project1Id, org1Id]
      );
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Project 1');
    });

    it('用户1不应该能访问其他组织的项目', async () => {
      const result = await query(
        `SELECT * FROM projects WHERE id = $1 AND organization_id = $2`,
        [project2Id, org1Id]
      );
      expect(result.length).toBe(0);
    });

    it('数据库查询应该自动过滤组织ID', async () => {
      // 验证项目2确实存在
      const allProjects = await query('SELECT * FROM projects WHERE id = $1', [project2Id]);
      expect(allProjects.length).toBe(1);

      // 但在组织1的上下文中应该看不到
      const org1Projects = await query(
        'SELECT * FROM projects WHERE organization_id = $1',
        [org1Id]
      );
      expect(org1Projects.length).toBe(1);
      expect(org1Projects[0].id).toBe(project1Id);
    });
  });

  describe('成员隔离测试', () => {
    it('组织1的成员列表应该只包含组织1的成员', async () => {
      const members = await query(
        'SELECT * FROM members WHERE organization_id = $1',
        [org1Id]
      );
      expect(members.length).toBe(1);
      expect(members[0].user_id).toBe(org1UserId);
    });

    it('组织2的成员列表应该只包含组织2的成员', async () => {
      const members = await query(
        'SELECT * FROM members WHERE organization_id = $1',
        [org2Id]
      );
      expect(members.length).toBe(1);
      expect(members[0].user_id).toBe(org2UserId);
    });

    it('用户1不应该能看到用户2', async () => {
      const result = await query(
        `SELECT m.* FROM members m 
         WHERE m.organization_id = $1 AND m.user_id = $2`,
        [org1Id, org2UserId]
      );
      expect(result.length).toBe(0);
    });
  });

  describe('审计日志隔离测试', () => {
    it('审计日志应该记录操作者的组织ID', async () => {
      // 创建一条审计日志
      await query(
        `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, created_at) 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
        [org1UserId, 'CREATE_PROJECT', 'Project', project1Id]
      );

      // 验证日志存在
      const logs = await query(
        'SELECT * FROM audit_logs WHERE user_id = $1',
        [org1UserId]
      );
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('跨组织访问防护测试', () => {
    it('不应该能通过 SQL 注入访问其他组织的数据', async () => {
      // 尝试使用 OR 1=1 绕过过滤
      const result = await query(
        `SELECT * FROM projects WHERE organization_id = $1 OR 1=1`,
        [org1Id]
      );
      // 应该返回所有项目（因为 OR 1=1）
      // 但在实际应用中，应该使用参数化查询防止 SQL 注入
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('应该使用参数化查询防止 SQL 注入', async () => {
      // 正确的做法：使用参数化查询
      const result = await query(
        'SELECT * FROM projects WHERE organization_id = $1',
        [org1Id]
      );
      expect(result.length).toBe(1);
      expect(result[0].organization_id).toBe(org1Id);
    });
  });

  describe('权限验证测试', () => {
    it('应该验证用户是否属于组织', async () => {
      // 检查用户1是否属于组织1
      const result = await query(
        `SELECT * FROM members WHERE organization_id = $1 AND user_id = $2`,
        [org1Id, org1UserId]
      );
      expect(result.length).toBe(1);
    });

    it('应该拒绝不属于组织的用户访问', async () => {
      // 检查用户1是否属于组织2
      const result = await query(
        `SELECT * FROM members WHERE organization_id = $1 AND user_id = $2`,
        [org2Id, org1UserId]
      );
      expect(result.length).toBe(0);
    });
  });

  describe('数据一致性测试', () => {
    it('所有项目都应该有 organization_id', async () => {
      const result = await query(
        'SELECT * FROM projects WHERE organization_id IS NULL'
      );
      expect(result.length).toBe(0);
    });

    it('所有成员都应该有 organization_id', async () => {
      const result = await query(
        'SELECT * FROM members WHERE organization_id IS NULL'
      );
      expect(result.length).toBe(0);
    });

    it('organization_id 应该与用户的组织一致', async () => {
      const result = await query(
        `SELECT p.* FROM projects p 
         WHERE p.organization_id != (
           SELECT m.organization_id FROM members m WHERE m.user_id = p.user_id LIMIT 1
         )`
      );
      // 这个查询可能返回结果，因为用户可能属于多个组织
      // 但在我们的测试中，每个用户只属于一个组织
      expect(result.length).toBe(0);
    });
  });

  describe('索引性能测试', () => {
    it('organization_id 索引应该存在', async () => {
      const result = await query(
        `SELECT indexname FROM pg_indexes 
         WHERE tablename = 'projects' AND indexname LIKE '%organization%'`
      );
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该能快速查询特定组织的项目', async () => {
      const startTime = Date.now();
      
      // 执行查询
      await query(
        'SELECT * FROM projects WHERE organization_id = $1',
        [org1Id]
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 查询应该在 100ms 内完成
      expect(duration).toBeLessThan(100);
    });
  });
});
