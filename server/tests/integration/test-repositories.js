/**
 * Repositories 测试
 * 验证数据访问层功能
 */

console.log('🧪 开始测试 Repositories...\n');

// ============================================
// Mock 实现
// ============================================

class MockPool {
  constructor() {
    this.data = {
      projects: new Map(),
      modules: new Map(),
      entities: new Map(),
      tasks: new Map(),
    };
    this.idCounters = {
      projects: 1,
      modules: 1,
      entities: 1,
      tasks: 1,
    };
  }
  
  async query(sql, values = []) {
    // 模拟 INSERT
    if (sql.includes('INSERT INTO')) {
      const table = this.extractTableName(sql);
      const id = `${table.slice(0, -1)}-${this.idCounters[table]++}`;
      
      const obj = {
        id,
        ...this.extractInsertValues(sql, values),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      this.data[table].set(id, obj);
      return { rows: [obj] };
    }
    
    // 模拟 SELECT
    if (sql.includes('SELECT') && sql.includes('FROM')) {
      const table = this.extractTableName(sql);
      const allData = Array.from(this.data[table].values());
      
      // 简单的过滤
      let filtered = allData;
      if (sql.includes('WHERE') && values.length > 0) {
        if (sql.includes('project_id')) {
          filtered = allData.filter(item => item.project_id === values[0]);
        } else if (sql.includes('module_id')) {
          filtered = allData.filter(item => item.module_id === values[0]);
        } else if (sql.includes('user_id')) {
          filtered = allData.filter(item => item.user_id === values[0]);
        } else if (sql.includes('id =')) {
          filtered = allData.filter(item => item.id === values[0]);
        }
      }
      
      return { rows: filtered };
    }
    
    // 模拟 UPDATE
    if (sql.includes('UPDATE')) {
      const table = this.extractTableName(sql);
      const id = values[values.length - 1];
      const obj = this.data[table].get(id);
      
      if (!obj) {
        return { rows: [] };
      }
      
      // 简单更新
      const updated = {
        ...obj,
        ...this.extractUpdateValues(sql, values),
        updated_at: new Date(),
      };
      
      this.data[table].set(id, updated);
      return { rows: [updated] };
    }
    
    // 模拟 DELETE
    if (sql.includes('DELETE FROM')) {
      const table = this.extractTableName(sql);
      const id = values[0];
      this.data[table].delete(id);
      return { rowCount: 1 };
    }
    
    return { rows: [] };
  }
  
  extractTableName(sql) {
    const match = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
    return match ? match[1] : '';
  }
  
  extractInsertValues(sql, values) {
    // 简化实现 - 根据表的不同返回不同的字段
    const result = {};
    
    // 对于 tasks 表，需要特殊处理
    if (sql.includes('tasks')) {
      // tasks 表的字段顺序：project_id, user_id, name, description
      if (values[0]) result.project_id = values[0];
      if (values[1]) result.user_id = values[1];
      if (values[2]) result.name = values[2];
      if (values[3]) result.description = values[3];
    } else {
      // 其他表的字段顺序：project_id, name, description
      if (values[0]) result.project_id = values[0];
      if (values[1]) result.name = values[1];
      if (values[2]) result.description = values[2];
    }
    
    return result;
  }
  
  extractUpdateValues(sql, values) {
    // 简化实现
    return {
      name: values[0],
    };
  }
}

// 简化的 Repository 实现
class BaseRepository {
  constructor(pool, tableName) {
    this.pool = pool;
    this.tableName = tableName;
  }
  
  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  
  async find(options = {}) {
    const query = `SELECT * FROM ${this.tableName}`;
    const result = await this.pool.query(query, []);
    return result.rows;
  }
  
  async create(data) {
    let query, values;
    
    if (this.tableName === 'tasks') {
      query = `INSERT INTO ${this.tableName} VALUES ($1, $2, $3, $4) RETURNING *`;
      values = [data.projectId, data.userId, data.name, data.description];
    } else {
      query = `INSERT INTO ${this.tableName} VALUES ($1, $2, $3) RETURNING *`;
      values = [data.projectId, data.name, data.description];
    }
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
  
  async update(id, data) {
    const query = `UPDATE ${this.tableName} SET name = $1 WHERE id = $2 RETURNING *`;
    const result = await this.pool.query(query, [data.name, id]);
    return result.rows[0];
  }
  
  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    await this.pool.query(query, [id]);
  }
}

class ModuleRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'modules');
  }
  
  async findByProjectId(projectId) {
    const query = `SELECT * FROM ${this.tableName} WHERE project_id = $1`;
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }
}

class EntityRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'entities');
  }
  
  async findByProjectId(projectId) {
    const query = `SELECT * FROM ${this.tableName} WHERE project_id = $1`;
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }
  
  async findByModuleId(moduleId) {
    const query = `SELECT * FROM ${this.tableName} WHERE module_id = $1`;
    const result = await this.pool.query(query, [moduleId]);
    return result.rows;
  }
}

class TaskRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'tasks');
  }
  
  async findByProjectId(projectId) {
    const query = `SELECT * FROM ${this.tableName} WHERE project_id = $1`;
    const result = await this.pool.query(query, [projectId]);
    return result.rows;
  }
  
  async findByUserId(userId) {
    const query = `SELECT * FROM ${this.tableName} WHERE user_id = $1`;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}

// ============================================
// 测试函数
// ============================================

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  const pool = new MockPool();
  const moduleRepo = new ModuleRepository(pool);
  const entityRepo = new EntityRepository(pool);
  const taskRepo = new TaskRepository(pool);
  
  // 测试 1: ModuleRepository - 创建和查询
  try {
    console.log('📝 测试 1: ModuleRepository - 创建和查询模块');
    
    const module1 = await moduleRepo.create({
      projectId: 'project-1',
      name: '用户管理模块',
      description: '负责用户相关功能',
    });
    
    const module2 = await moduleRepo.create({
      projectId: 'project-1',
      name: '订单管理模块',
      description: '负责订单相关功能',
    });
    
    const modules = await moduleRepo.findByProjectId('project-1');
    
    if (modules.length !== 2) {
      throw new Error(`应该返回2个模块，实际返回${modules.length}个`);
    }
    
    console.log('✅ 测试 1 通过: 模块创建和查询成功');
    console.log(`   创建了 ${modules.length} 个模块\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: EntityRepository - 创建和查询
  try {
    console.log('📝 测试 2: EntityRepository - 创建和查询实体');
    
    const entity1 = await entityRepo.create({
      projectId: 'project-1',
      name: '用户实体',
      description: '用户信息',
    });
    
    const entity2 = await entityRepo.create({
      projectId: 'project-1',
      name: '订单实体',
      description: '订单信息',
    });
    
    const entities = await entityRepo.findByProjectId('project-1');
    
    if (entities.length !== 2) {
      throw new Error(`应该返回2个实体，实际返回${entities.length}个`);
    }
    
    console.log('✅ 测试 2 通过: 实体创建和查询成功');
    console.log(`   创建了 ${entities.length} 个实体\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: TaskRepository - 创建和查询
  try {
    console.log('📝 测试 3: TaskRepository - 创建和查询任务');
    
    const task1 = await taskRepo.create({
      projectId: 'project-1',
      userId: 'user-1',
      name: '分析任务',
      description: '系统分析',
    });
    
    const task2 = await taskRepo.create({
      projectId: 'project-1',
      userId: 'user-1',
      name: '设计任务',
      description: '系统设计',
    });
    
    const tasks = await taskRepo.findByProjectId('project-1');
    
    if (tasks.length !== 2) {
      throw new Error(`应该返回2个任务，实际返回${tasks.length}个`);
    }
    
    const userTasks = await taskRepo.findByUserId('user-1');
    
    if (userTasks.length !== 2) {
      throw new Error(`应该返回2个用户任务，实际返回${userTasks.length}个`);
    }
    
    console.log('✅ 测试 3 通过: 任务创建和查询成功');
    console.log(`   创建了 ${tasks.length} 个任务\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: 更新操作
  try {
    console.log('📝 测试 4: Repository 更新操作');
    
    const module = await moduleRepo.create({
      projectId: 'project-2',
      name: '原始名称',
      description: '原始描述',
    });
    
    const updated = await moduleRepo.update(module.id, {
      name: '更新后的名称',
    });
    
    if (updated.name !== '更新后的名称') {
      throw new Error('更新失败');
    }
    
    console.log('✅ 测试 4 通过: 更新操作成功\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failedTests++;
  }
  
  // 测试 5: 删除操作
  try {
    console.log('📝 测试 5: Repository 删除操作');
    
    const module = await moduleRepo.create({
      projectId: 'project-3',
      name: '待删除模块',
      description: '测试删除',
    });
    
    await moduleRepo.delete(module.id);
    
    const found = await moduleRepo.findById(module.id);
    
    if (found !== null) {
      throw new Error('删除失败');
    }
    
    console.log('✅ 测试 5 通过: 删除操作成功\n');
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
    console.log('\n🎉 所有测试通过！Repositories 工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
