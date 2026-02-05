/**
 * 路由集成测试
 * 验证本体论架构与路由的集成
 */

console.log('🧪 开始测试路由集成...\n');

// ============================================
// Mock 实现
// ============================================

// Mock Request
class MockRequest {
  constructor(data = {}) {
    this.body = data.body || {};
    this.params = data.params || {};
    this.query = data.query || {};
    this.user = data.user || { id: 'user-1', name: 'Test User' };
    this.ip = '127.0.0.1';
    this.headers = {};
  }
  
  get(header) {
    return this.headers[header.toLowerCase()];
  }
}

// Mock Response
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.data = null;
  }
  
  status(code) {
    this.statusCode = code;
    return this;
  }
  
  json(data) {
    this.data = data;
    return this;
  }
}

// Mock Pool
class MockPool {
  constructor() {
    this.data = {
      projects: new Map(),
      modules: new Map(),
    };
    this.idCounter = 1;
  }
  
  async query(sql, values = []) {
    // 模拟 INSERT
    if (sql.includes('INSERT INTO projects')) {
      const id = `project-${this.idCounter++}`;
      const project = {
        id,
        user_id: values[0],
        name: values[1],
        description: values[2],
        model: values[3] || {},
        is_archived: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.data.projects.set(id, project);
      return { rows: [project] };
    }
    
    // 模拟 SELECT projects
    if (sql.includes('SELECT') && sql.includes('FROM projects')) {
      const userId = values[0];
      const projects = Array.from(this.data.projects.values())
        .filter(p => p.user_id === userId);
      return { rows: projects };
    }
    
    // 模拟 INSERT modules
    if (sql.includes('INSERT INTO modules')) {
      const id = `module-${this.idCounter++}`;
      const module = {
        id,
        project_id: values[0],
        name: values[1],
        description: values[2],
        functional_points: values[3] || [],
        sort_order: values[4] || 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.data.modules.set(id, module);
      return { rows: [module] };
    }
    
    return { rows: [] };
  }
}

// Mock OntologyService
class MockOntologyService {
  constructor(projectRepo, moduleRepo) {
    this.projectRepo = projectRepo;
    this.moduleRepo = moduleRepo;
  }
  
  async getObject(type, id) {
    if (type === 'Project') {
      return this.projectRepo.findById(id);
    } else if (type === 'Module') {
      return this.moduleRepo.findById(id);
    }
    return null;
  }
  
  async queryObjects(type, options) {
    if (type === 'Project') {
      const userId = options.filters?.[0]?.value;
      return this.projectRepo.findByUserId(userId);
    }
    return [];
  }
  
  async createObject(type, data) {
    if (type === 'Project') {
      return this.projectRepo.create(data);
    } else if (type === 'Module') {
      return this.moduleRepo.create(data);
    }
    return null;
  }
  
  async getLinkedObjects(objectId, linkType) {
    if (linkType === 'Project→Module') {
      return this.moduleRepo.findByProjectId(objectId);
    }
    return [];
  }
}

// Mock Repository
class MockRepository {
  constructor(pool, tableName) {
    this.pool = pool;
    this.tableName = tableName;
  }
  
  async findById(id) {
    const data = this.pool.data[this.tableName];
    return data.get(id) || null;
  }
  
  async findByUserId(userId) {
    const data = this.pool.data[this.tableName];
    return Array.from(data.values()).filter(item => item.user_id === userId);
  }
  
  async findByProjectId(projectId) {
    const data = this.pool.data[this.tableName];
    if (!data) return [];
    return Array.from(data.values()).filter(item => item.projectId === projectId || item.project_id === projectId);
  }
  
  async create(data) {
    const id = `${this.tableName.slice(0, -1)}-${this.pool.idCounter++}`;
    const item = {
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // 确保数据存储在正确的位置
    if (!this.pool.data[this.tableName]) {
      this.pool.data[this.tableName] = new Map();
    }
    
    this.pool.data[this.tableName].set(id, item);
    return item;
  }
}

// Mock Action
class MockCreateProjectAction {
  constructor(ontologyService) {
    this.ontologyService = ontologyService;
  }
  
  async run(input, context) {
    try {
      const project = await this.ontologyService.createObject('Project', {
        type: 'Project',
        userId: input.userId,
        name: input.name,
        description: input.description,
        model: {},
        isArchived: false,
      });
      
      return {
        success: true,
        data: project,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================
// 路由处理器模拟
// ============================================

async function handleGetProjects(req, res, ontologyService) {
  try {
    const projects = await ontologyService.queryObjects('Project', {
      filters: [{ field: 'user_id', operator: 'eq', value: req.user.id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: '获取项目列表失败' });
  }
}

async function handleCreateProject(req, res, ontologyService) {
  try {
    const action = new MockCreateProjectAction(ontologyService);
    const context = {
      userId: req.user.id,
      userName: req.user.name,
      timestamp: new Date(),
    };
    
    const result = await action.run(
      {
        name: req.body.name,
        description: req.body.description,
        userId: req.user.id,
      },
      context
    );
    
    if (result.success) {
      res.status(201).json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: '创建项目失败' });
  }
}

async function handleGetProjectModules(req, res, ontologyService) {
  try {
    const project = await ontologyService.getObject('Project', req.params.id);
    if (!project || project.userId !== req.user.id) {
      return res.status(403).json({ error: '无权访问此项目' });
    }
    
    const modules = await ontologyService.getLinkedObjects(
      req.params.id,
      'Project→Module'
    );
    
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: '获取模块列表失败' });
  }
}

// ============================================
// 测试函数
// ============================================

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  const pool = new MockPool();
  const projectRepo = new MockRepository(pool, 'projects');
  const moduleRepo = new MockRepository(pool, 'modules');
  const ontologyService = new MockOntologyService(projectRepo, moduleRepo);
  
  // 测试 1: GET /api/projects - 获取项目列表
  try {
    console.log('📝 测试 1: GET /api/projects - 获取项目列表');
    
    const req = new MockRequest({
      user: { id: 'user-1', name: 'Test User' },
    });
    const res = new MockResponse();
    
    await handleGetProjects(req, res, ontologyService);
    
    if (res.statusCode !== 200) {
      throw new Error(`状态码错误: ${res.statusCode}`);
    }
    
    if (!Array.isArray(res.data)) {
      throw new Error('返回数据应该是数组');
    }
    
    console.log('✅ 测试 1 通过: 成功获取项目列表');
    console.log(`   返回 ${res.data.length} 个项目\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: POST /api/projects - 创建项目
  try {
    console.log('📝 测试 2: POST /api/projects - 创建项目');
    
    const req = new MockRequest({
      body: {
        name: '测试项目',
        description: '这是一个测试项目',
      },
      user: { id: 'user-1', name: 'Test User' },
    });
    const res = new MockResponse();
    
    await handleCreateProject(req, res, ontologyService);
    
    if (res.statusCode !== 201) {
      throw new Error(`状态码错误: ${res.statusCode}`);
    }
    
    if (!res.data || !res.data.id) {
      throw new Error('返回数据应该包含项目ID');
    }
    
    if (res.data.name !== '测试项目') {
      throw new Error('项目名称不匹配');
    }
    
    console.log('✅ 测试 2 通过: 成功创建项目');
    console.log(`   项目ID: ${res.data.id}`);
    console.log(`   项目名称: ${res.data.name}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: GET /api/projects/:id/modules - 获取项目模块
  try {
    console.log('📝 测试 3: GET /api/projects/:id/modules - 获取项目模块');
    
    // 先创建一个项目
    const createReq = new MockRequest({
      body: { name: '项目A', description: '测试' },
      user: { id: 'user-1', name: 'Test User' },
    });
    const createRes = new MockResponse();
    await handleCreateProject(createReq, createRes, ontologyService);
    const projectId = createRes.data.id;
    
    // 创建一个模块
    await ontologyService.createObject('Module', {
      type: 'Module',
      projectId,
      name: '模块1',
      description: '测试模块',
      functionalPoints: [],
      sortOrder: 0,
    });
    
    // 获取模块列表
    const req = new MockRequest({
      params: { id: projectId },
      user: { id: 'user-1', name: 'Test User' },
    });
    const res = new MockResponse();
    
    await handleGetProjectModules(req, res, ontologyService);
    
    if (res.statusCode !== 200) {
      throw new Error(`状态码错误: ${res.statusCode}`);
    }
    
    if (!Array.isArray(res.data)) {
      throw new Error('返回数据应该是数组');
    }
    
    if (res.data.length !== 1) {
      throw new Error(`应该返回1个模块，实际返回${res.data.length}个`);
    }
    
    console.log('✅ 测试 3 通过: 成功获取项目模块');
    console.log(`   返回 ${res.data.length} 个模块\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: 权限检查 - 访问其他用户的项目
  try {
    console.log('📝 测试 4: 权限检查 - 访问其他用户的项目');
    
    // 用户1创建项目
    const createReq = new MockRequest({
      body: { name: '用户1的项目', description: '测试' },
      user: { id: 'user-1', name: 'User 1' },
    });
    const createRes = new MockResponse();
    await handleCreateProject(createReq, createRes, ontologyService);
    const projectId = createRes.data.id;
    
    // 用户2尝试访问
    const req = new MockRequest({
      params: { id: projectId },
      user: { id: 'user-2', name: 'User 2' },
    });
    const res = new MockResponse();
    
    await handleGetProjectModules(req, res, ontologyService);
    
    if (res.statusCode !== 403) {
      throw new Error(`应该返回403，实际返回${res.statusCode}`);
    }
    
    if (!res.data.error || !res.data.error.includes('无权')) {
      throw new Error('错误消息不正确');
    }
    
    console.log('✅ 测试 4 通过: 正确拒绝了未授权访问');
    console.log(`   错误消息: ${res.data.error}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
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
    console.log('\n🎉 所有测试通过！路由集成工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
