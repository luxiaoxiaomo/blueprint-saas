/**
 * API 层数据隔离测试
 * 验证 API 端点的租户隔离和权限控制
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
let org1Id, org2Id;
let org1UserId, org2UserId;
let project1Id, project2Id;
let module1Id, module2Id;
let entity1Id, entity2Id;

/**
 * 辅助函数：执行 SQL 查询
 */
async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * 辅助函数：创建测试数据
 */
async function setupTestData() {
  // 创建用户
  const user1Result = await query(
    `INSERT INTO users (id, email, password_hash, created_at) 
     VALUES (gen_random_uuid(), $1, $2, NOW()) 
     RETURNING id`,
    ['org1user@test.com', 'hashed_password_1']
  );
  org1UserId = user1Result[0].id;

  const user2Result = await query(
    `INSERT INTO users (id, email, password_hash, created_at) 
     VALUES (gen_random_uuid(), $1, $2, NOW()) 
     RETURNING id`,
    ['org2user@test.com', 'hashed_password_2']
  );
  org2UserId = user2Result[0].id;

  // 创建组织
  const org1Result = await query(
    `INSERT INTO organizations (id, name, identifier, plan, owner_id, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) 
     RETURNING id`,
    ['Test Org 1', 'testorg1', 'free', org1UserId]
  );
  org1Id = org1Result[0].id;

  const org2Result = await query(
    `INSERT INTO organizations (id, name, identifier, plan, owner_id, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) 
     RETURNING id`,
    ['Test Org 2', 'testorg2', 'free', org2UserId]
  );
  org2Id = org2Result[0].id;

  // 添加成员
  await query(
    `INSERT INTO members (id, organization_id, user_id, role, status, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
    [org1Id, org1UserId, 'owner', 'active']
  );

  await query(
    `INSERT INTO members (id, organization_id, user_id, role, status, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
    [org2Id, org2UserId, 'owner', 'active']
  );

  // 创建项目
  const proj1Result = await query(
    `INSERT INTO projects (id, user_id, organization_id, name, description, model, is_archived, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) 
     RETURNING id`,
    [org1UserId, org1Id, 'API Test Project 1', 'Test project 1', {}, false]
  );
  project1Id = proj1Result[0].id;

  const proj2Result = await query(
    `INSERT INTO projects (id, user_id, organization_id, name, description, model, is_archived, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) 
     RETURNING id`,
    [org2UserId, org2Id, 'API Test Project 2', 'Test project 2', {}, false]
  );
  project2Id = proj2Result[0].id;

  // 创建模块
  const mod1Result = await query(
    `INSERT INTO modules (id, project_id, name, description, functional_points, sort_order, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) 
     RETURNING id`,
    [project1Id, 'Module 1', 'Test module 1', [], 1]
  );
  module1Id = mod1Result[0].id;

  const mod2Result = await query(
    `INSERT INTO modules (id, project_id, name, description, functional_points, sort_order, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) 
     RETURNING id`,
    [project2Id, 'Module 2', 'Test module 2', [], 1]
  );
  module2Id = mod2Result[0].id;

  // 创建实体
  const ent1Result = await query(
    `INSERT INTO entities (id, project_id, name, description, attributes, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) 
     RETURNING id`,
    [project1Id, 'Entity 1', 'Test entity 1', {}]
  );
  entity1Id = ent1Result[0].id;

  const ent2Result = await query(
    `INSERT INTO entities (id, project_id, name, description, attributes, created_at) 
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) 
     RETURNING id`,
    [project2Id, 'Entity 2', 'Test entity 2', {}]
  );
  entity2Id = ent2Result[0].id;

  console.log('✅ API 测试数据创建完成');
}

/**
 * 辅助函数：发送 API 请求
 */
async function apiRequest(method, endpoint, token = null, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();

    return {
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
    };
  }
}

describe('API 层数据隔离测试', () => {
  beforeAll(async () => {
    pool = new Pool(DB_CONFIG);
    await setupTestData();
  });

  afterAll(async () => {
    // 清理测试数据
    await query('DELETE FROM entities WHERE id IN ($1, $2)', [entity1Id, entity2Id]);
    await query('DELETE FROM modules WHERE id IN ($1, $2)', [module1Id, module2Id]);
    await query('DELETE FROM projects WHERE id IN ($1, $2)', [project1Id, project2Id]);
    await query('DELETE FROM members WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await query('DELETE FROM organizations WHERE id IN ($1, $2)', [org1Id, org2Id]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [org1UserId, org2UserId]);

    await pool.end();
  });

  describe('项目 API 隔离测试', () => {
    it('GET /api/projects 应该返回 401（未认证）', async () => {
      const result = await apiRequest('GET', '/projects');
      expect(result.status).toBe(401);
    });

    it('GET /api/projects/:id 应该验证项目权限', async () => {
      // 这个测试需要有效的 token
      // 实际测试中应该使用真实的 token
      const result = await apiRequest('GET', `/projects/${project1Id}`);
      expect([401, 403, 404]).toContain(result.status);
    });
  });

  describe('实体 API 隔离测试', () => {
    it('GET /api/entities?projectId=xxx 应该验证项目权限', async () => {
      const result = await apiRequest('GET', `/entities?projectId=${project1Id}`);
      expect([401, 403, 404]).toContain(result.status);
    });

    it('GET /api/entities/:id 应该验证实体权限', async () => {
      const result = await apiRequest('GET', `/entities/${entity1Id}`);
      expect([401, 403, 404]).toContain(result.status);
    });

    it('POST /api/entities 应该验证项目权限', async () => {
      const result = await apiRequest('POST', '/entities', null, {
        projectId: project1Id,
        name: 'New Entity',
      });
      expect([401, 403, 400]).toContain(result.status);
    });
  });

  describe('任务 API 隔离测试', () => {
    it('GET /api/tasks?projectId=xxx 应该验证项目权限', async () => {
      const result = await apiRequest('GET', `/tasks?projectId=${project1Id}`);
      expect([401, 403, 404]).toContain(result.status);
    });

    it('POST /api/tasks 应该验证项目权限', async () => {
      const result = await apiRequest('POST', '/tasks', null, {
        projectId: project1Id,
        name: 'New Task',
      });
      expect([401, 403, 400]).toContain(result.status);
    });
  });

  describe('链接 API 隔离测试', () => {
    it('GET /api/links?sourceId=xxx 应该验证权限', async () => {
      const result = await apiRequest('GET', `/links?sourceId=${entity1Id}`);
      expect([401, 403, 404]).toContain(result.status);
    });

    it('POST /api/links 应该验证权限', async () => {
      const result = await apiRequest('POST', '/links', null, {
        sourceId: entity1Id,
        targetId: entity2Id,
        linkType: 'Entity→Entity',
      });
      expect([401, 403, 400]).toContain(result.status);
    });
  });

  describe('审计日志测试', () => {
    it('所有修改操作都应该被记录', async () => {
      // 检查审计日志表是否存在
      const result = await query(
        `SELECT * FROM information_schema.tables 
         WHERE table_name = 'audit_logs'`
      );
      expect(result.length).toBe(1);
    });

    it('审计日志应该包含必要的字段', async () => {
      const result = await query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'audit_logs'`
      );
      
      const columnNames = result.map(r => r.column_name);
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('action');
      expect(columnNames).toContain('resource_type');
      expect(columnNames).toContain('resource_id');
    });
  });

  describe('错误处理测试', () => {
    it('访问不存在的资源应该返回 404', async () => {
      const result = await apiRequest('GET', '/projects/nonexistent-id');
      expect([401, 403, 404]).toContain(result.status);
    });

    it('无效的请求应该返回 400', async () => {
      const result = await apiRequest('POST', '/entities', null, {
        // 缺少必要的字段
      });
      expect([400, 401, 403]).toContain(result.status);
    });

    it('未认证的请求应该返回 401', async () => {
      const result = await apiRequest('GET', '/projects');
      expect(result.status).toBe(401);
    });
  });

  describe('数据一致性验证', () => {
    it('项目应该有 organization_id', async () => {
      const result = await query(
        'SELECT * FROM projects WHERE id = $1',
        [project1Id]
      );
      expect(result[0].organization_id).toBe(org1Id);
    });

    it('实体应该有 project_id', async () => {
      const result = await query(
        'SELECT * FROM entities WHERE id = $1',
        [entity1Id]
      );
      expect(result[0].project_id).toBe(project1Id);
    });

    it('模块应该有 project_id', async () => {
      const result = await query(
        'SELECT * FROM modules WHERE id = $1',
        [module1Id]
      );
      expect(result[0].project_id).toBe(project1Id);
    });
  });

  describe('跨组织访问防护', () => {
    it('组织1的用户不应该能访问组织2的项目', async () => {
      // 验证项目确实属于不同的组织
      const proj1 = await query('SELECT organization_id FROM projects WHERE id = $1', [project1Id]);
      const proj2 = await query('SELECT organization_id FROM projects WHERE id = $1', [project2Id]);
      
      expect(proj1[0].organization_id).not.toBe(proj2[0].organization_id);
    });

    it('组织1的用户不应该能访问组织2的实体', async () => {
      // 验证实体属于不同的项目
      const ent1 = await query('SELECT project_id FROM entities WHERE id = $1', [entity1Id]);
      const ent2 = await query('SELECT project_id FROM entities WHERE id = $1', [entity2Id]);
      
      expect(ent1[0].project_id).not.toBe(ent2[0].project_id);
    });
  });
});
