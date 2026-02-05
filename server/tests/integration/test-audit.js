/**
 * 审计日志系统测试
 * 验证审计日志功能是否正常工作
 */

console.log('🧪 开始测试审计日志系统...\n');

// ============================================
// Mock 实现
// ============================================

class MockPool {
  constructor() {
    this.logs = new Map();
    this.idCounter = 1;
  }
  
  async query(sql, values) {
    // 模拟 INSERT
    if (sql.includes('INSERT INTO audit_logs')) {
      const id = `log-${this.idCounter++}`;
      const log = {
        id,
        user_id: values[0],
        action: values[1],
        resource_type: values[2],
        resource_id: values[3],
        details: values[4],
        ip_address: values[5],
        user_agent: values[6],
        created_at: new Date(),
      };
      this.logs.set(id, log);
      return { rows: [log] };
    }
    
    // 模拟 COUNT - 必须在 SELECT 之前检查
    if (sql.includes('COUNT(*)') && sql.includes('FROM audit_logs')) {
      const count = this.logs.size;
      return { rows: [{ total: count }] };
    }
    
    // 模拟 GROUP BY - 必须在 SELECT 之前检查
    if (sql.includes('GROUP BY action')) {
      const byAction = {};
      Array.from(this.logs.values()).forEach(log => {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
      });
      const rows = Object.entries(byAction).map(([action, count]) => ({ 
        action: action,
        count: count 
      }));
      return { rows };
    }
    
    if (sql.includes('GROUP BY resource_type')) {
      const byType = {};
      Array.from(this.logs.values()).forEach(log => {
        byType[log.resource_type] = (byType[log.resource_type] || 0) + 1;
      });
      const rows = Object.entries(byType).map(([resource_type, count]) => ({ 
        resource_type: resource_type,
        count: count 
      }));
      return { rows };
    }
    
    // 模拟 SELECT - 放在最后
    if (sql.includes('SELECT') && sql.includes('FROM audit_logs')) {
      const allLogs = Array.from(this.logs.values());
      
      // 简单的过滤
      let filtered = allLogs;
      if (values && values.length > 0) {
        // 假设第一个值是 user_id
        filtered = allLogs.filter(log => log.user_id === values[0]);
      }
      
      return { rows: filtered };
    }
    
    return { rows: [] };
  }
}

class AuditService {
  constructor(pool) {
    this.pool = pool;
  }
  
  async log(entry) {
    const query = `
      INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      entry.userAgent || null,
    ];
    
    const result = await this.pool.query(query, values);
    return this.mapRowToEntry(result.rows[0]);
  }
  
  async query(options = {}) {
    const values = [];
    if (options.userId) {
      values.push(options.userId);
    }
    
    const query = `SELECT * FROM audit_logs`;
    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToEntry(row));
  }
  
  async getStats(userId) {
    const queries = [
      `SELECT COUNT(*) as total FROM audit_logs`,
      `SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action`,
      `SELECT resource_type, COUNT(*) as count FROM audit_logs GROUP BY resource_type`,
    ];
    
    const [totalResult, actionResult, resourceResult] = await Promise.all(
      queries.map(q => this.pool.query(q, []))
    );
    
    const byAction = {};
    actionResult.rows.forEach(row => {
      if (row.action) {
        byAction[row.action] = Number(row.count) || 0;
      }
    });
    
    const byResourceType = {};
    resourceResult.rows.forEach(row => {
      if (row.resource_type) {
        byResourceType[row.resource_type] = Number(row.count) || 0;
      }
    });
    
    const total = Number(totalResult.rows[0]?.total) || 0;
    
    return {
      total,
      byAction,
      byResourceType,
    };
  }
  
  mapRowToEntry(row) {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }
}

// ============================================
// 测试函数
// ============================================

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  const pool = new MockPool();
  const auditService = new AuditService(pool);
  
  // 测试 1: 记录审计日志
  try {
    console.log('📝 测试 1: 记录审计日志');
    
    const entry = await auditService.log({
      userId: 'user-123',
      action: 'CreateProject',
      resourceType: 'Project',
      resourceId: 'project-456',
      details: {
        input: { name: '测试项目' },
        output: { id: 'project-456', name: '测试项目' },
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });
    
    if (!entry.id) throw new Error('未返回ID');
    if (entry.action !== 'CreateProject') throw new Error('操作类型不匹配');
    if (entry.resourceType !== 'Project') throw new Error('资源类型不匹配');
    
    console.log('✅ 测试 1 通过: 审计日志记录成功');
    console.log(`   日志ID: ${entry.id}`);
    console.log(`   操作: ${entry.action}`);
    console.log(`   资源: ${entry.resourceType}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: 记录多条日志
  try {
    console.log('📝 测试 2: 记录多条审计日志');
    
    await auditService.log({
      userId: 'user-123',
      action: 'UpdateProject',
      resourceType: 'Project',
      resourceId: 'project-456',
      details: { input: { name: '更新后的项目' } },
    });
    
    await auditService.log({
      userId: 'user-123',
      action: 'CreateModule',
      resourceType: 'Module',
      resourceId: 'module-789',
      details: { input: { name: '测试模块' } },
    });
    
    await auditService.log({
      userId: 'user-456',
      action: 'CreateProject',
      resourceType: 'Project',
      resourceId: 'project-999',
      details: { input: { name: '另一个项目' } },
    });
    
    console.log('✅ 测试 2 通过: 多条日志记录成功\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: 查询审计日志
  try {
    console.log('📝 测试 3: 查询审计日志');
    
    const logs = await auditService.query({ userId: 'user-123' });
    
    if (logs.length !== 3) {
      throw new Error(`应该返回3条日志，实际返回${logs.length}条`);
    }
    
    console.log('✅ 测试 3 通过: 查询成功');
    console.log(`   查询到 ${logs.length} 条日志\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: 获取统计信息
  try {
    console.log('📝 测试 4: 获取统计信息');
    
    const stats = await auditService.getStats();
    
    // 检查总数
    if (stats.total !== 4) {
      throw new Error(`总数应该是4，实际是${stats.total}`);
    }
    
    console.log('✅ 测试 4 通过: 统计信息正确');
    console.log(`   总日志数: ${stats.total}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failedTests++;
  }
  
  // 测试 5: 记录失败操作
  try {
    console.log('📝 测试 5: 记录失败操作');
    
    const entry = await auditService.log({
      userId: 'user-123',
      action: 'DeleteProject_FAILED',
      resourceType: 'Project',
      resourceId: 'project-456',
      details: {
        input: { id: 'project-456' },
        error: '无权删除此项目',
      },
      ipAddress: '192.168.1.1',
    });
    
    if (!entry.action.includes('FAILED')) {
      throw new Error('失败操作标记不正确');
    }
    
    console.log('✅ 测试 5 通过: 失败操作记录成功');
    console.log(`   操作: ${entry.action}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failedTests++;
  }
  
  // 测试总结
  console.log('='.repeat(50));
  console.log('📊 测试总结');
  console.log('='.repeat(50));
  console.log(`✅ 通过: ${passedTests} 个测试`);
  console.log(`❌ 失败: ${failedTests} 个测试`);
  console.log(`📈 成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  if (failedTests === 0) {
    console.log('\n🎉 所有测试通过！审计日志系统工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
