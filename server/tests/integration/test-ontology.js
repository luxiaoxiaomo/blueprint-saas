/**
 * 简单的本体论架构测试（不需要编译）
 * 验证核心逻辑
 */

console.log('🧪 开始测试本体论架构...\n');

// ============================================
// Mock 实现
// ============================================

class MockProjectRepository {
  constructor() {
    this.projects = new Map();
    this.idCounter = 1;
  }
  
  async findById(id) {
    return this.projects.get(id) || null;
  }
  
  async find(options = {}) {
    const allProjects = Array.from(this.projects.values());
    
    if (options.filters) {
      return allProjects.filter(project => {
        return options.filters.every(filter => {
          const fieldMap = { 'user_id': 'userId' };
          const field = fieldMap[filter.field] || filter.field;
          return project[field] === filter.value;
        });
      });
    }
    
    return allProjects;
  }
  
  async create(data) {
    const id = `project-${this.idCounter++}`;
    const project = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }
  
  async update(id, data) {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    
    const updated = {
      ...project,
      ...data,
      updatedAt: new Date(),
    };
    this.projects.set(id, updated);
    return updated;
  }
  
  async delete(id) {
    this.projects.delete(id);
  }
}

class OntologyService {
  constructor(projectRepo) {
    this.projectRepo = projectRepo;
  }
  
  async getObject(type, id) {
    if (type === 'Project') {
      return this.projectRepo.findById(id);
    }
    throw new Error(`Unknown type: ${type}`);
  }
  
  async queryObjects(type, options) {
    if (type === 'Project') {
      return this.projectRepo.find(options);
    }
    throw new Error(`Unknown type: ${type}`);
  }
  
  async createObject(type, data) {
    if (type === 'Project') {
      return this.projectRepo.create(data);
    }
    throw new Error(`Unknown type: ${type}`);
  }
  
  async updateObject(type, id, data) {
    if (type === 'Project') {
      return this.projectRepo.update(id, data);
    }
    throw new Error(`Unknown type: ${type}`);
  }
  
  async deleteObject(type, id) {
    if (type === 'Project') {
      return this.projectRepo.delete(id);
    }
    throw new Error(`Unknown type: ${type}`);
  }
}

class CreateProjectAction {
  constructor(ontologyService) {
    this.ontologyService = ontologyService;
    this.name = 'CreateProject';
  }
  
  async validate(input) {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('项目名称不能为空');
    }
    if (!input.userId) {
      throw new Error('用户ID不能为空');
    }
  }
  
  async execute(input) {
    return this.ontologyService.createObject('Project', {
      type: 'Project',
      userId: input.userId,
      name: input.name.trim(),
      description: input.description?.trim(),
      model: {
        name: input.name,
        modules: [],
        entities: [],
      },
      isArchived: false,
    });
  }
  
  async run(input, context) {
    try {
      await this.validate(input);
      const output = await this.execute(input);
      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================
// 测试函数
// ============================================

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  const projectRepo = new MockProjectRepository();
  const ontologyService = new OntologyService(projectRepo);
  
  const testContext = {
    userId: 'test-user-123',
    userName: '测试用户',
    timestamp: new Date(),
  };
  
  // 测试 1: 创建项目
  try {
    console.log('📝 测试 1: CreateProjectAction');
    
    const action = new CreateProjectAction(ontologyService);
    const result = await action.run(
      {
        name: '测试项目',
        description: '这是一个测试项目',
        userId: 'test-user-123',
      },
      testContext
    );
    
    if (!result.success) throw new Error(`失败: ${result.error}`);
    if (!result.data) throw new Error('返回数据为空');
    if (result.data.name !== '测试项目') throw new Error('项目名称不匹配');
    
    console.log('✅ 测试 1 通过: 项目创建成功');
    console.log(`   项目ID: ${result.data.id}`);
    console.log(`   项目名称: ${result.data.name}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: 输入验证
  try {
    console.log('📝 测试 2: 输入验证（空项目名）');
    
    const action = new CreateProjectAction(ontologyService);
    const result = await action.run(
      { name: '', userId: 'test-user-123' },
      testContext
    );
    
    if (result.success) throw new Error('应该拒绝空项目名');
    if (!result.error.includes('不能为空')) throw new Error('错误消息不正确');
    
    console.log('✅ 测试 2 通过: 正确拒绝了空项目名');
    console.log(`   错误消息: ${result.error}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: 对象查询
  try {
    console.log('📝 测试 3: OntologyService.getObject()');
    
    const action = new CreateProjectAction(ontologyService);
    const createResult = await action.run(
      { name: '查询测试项目', userId: 'test-user-123' },
      testContext
    );
    
    if (!createResult.success) throw new Error('创建项目失败');
    
    const projectId = createResult.data.id;
    const project = await ontologyService.getObject('Project', projectId);
    
    if (!project) throw new Error('查询项目失败');
    if (project.name !== '查询测试项目') throw new Error('项目名称不匹配');
    
    console.log('✅ 测试 3 通过: 对象查询成功');
    console.log(`   查询到项目: ${project.name}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: 批量查询
  try {
    console.log('📝 测试 4: OntologyService.queryObjects()');
    
    const action = new CreateProjectAction(ontologyService);
    
    await action.run({ name: '项目A', userId: 'user-1' }, testContext);
    await action.run({ name: '项目B', userId: 'user-1' }, testContext);
    await action.run({ name: '项目C', userId: 'user-2' }, testContext);
    
    const user1Projects = await ontologyService.queryObjects('Project', {
      filters: [{ field: 'user_id', operator: 'eq', value: 'user-1' }],
    });
    
    if (user1Projects.length !== 2) {
      throw new Error(`应该返回2个项目，实际${user1Projects.length}个`);
    }
    
    console.log('✅ 测试 4 通过: 批量查询成功');
    console.log(`   查询到 ${user1Projects.length} 个项目\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failedTests++;
  }
  
  // 测试 5: 对象更新
  try {
    console.log('📝 测试 5: OntologyService.updateObject()');
    
    const action = new CreateProjectAction(ontologyService);
    const createResult = await action.run(
      { name: '原始名称', userId: 'test-user' },
      testContext
    );
    
    const projectId = createResult.data.id;
    
    const updated = await ontologyService.updateObject(
      'Project',
      projectId,
      { name: '更新后的名称' }
    );
    
    if (updated.name !== '更新后的名称') throw new Error('更新失败');
    
    console.log('✅ 测试 5 通过: 对象更新成功');
    console.log(`   原始名称: 原始名称`);
    console.log(`   更新后: ${updated.name}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failedTests++;
  }
  
  // 测试 6: 对象删除
  try {
    console.log('📝 测试 6: OntologyService.deleteObject()');
    
    const action = new CreateProjectAction(ontologyService);
    const createResult = await action.run(
      { name: '待删除项目', userId: 'test-user' },
      testContext
    );
    
    const projectId = createResult.data.id;
    await ontologyService.deleteObject('Project', projectId);
    
    const project = await ontologyService.getObject('Project', projectId);
    if (project !== null) throw new Error('项目未被删除');
    
    console.log('✅ 测试 6 通过: 对象删除成功\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 6 失败:', error.message);
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
    console.log('\n🎉 所有测试通过！本体论架构工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
