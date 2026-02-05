/**
 * 本体论架构测试
 * 验证核心功能是否正常工作
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OntologyService } from '../OntologyService.js';
import { CreateProjectAction } from '../actions/CreateProjectAction.js';
import { ActionContext, ProjectObject } from '../types.js';

/**
 * Mock Repository for testing
 */
class MockProjectRepository {
  private projects: Map<string, any> = new Map();
  private idCounter = 1;
  
  async findById(id: string): Promise<any | null> {
    return this.projects.get(id) || null;
  }
  
  async find(options?: any): Promise<any[]> {
    const allProjects = Array.from(this.projects.values());
    
    // 简单的过滤实现
    if (options?.filters) {
      return allProjects.filter(project => {
        return options.filters.every((filter: any) => {
          // 处理字段名映射：user_id -> userId
          const fieldMap: Record<string, string> = {
            'user_id': 'userId',
            'is_archived': 'isArchived',
          };
          const field = fieldMap[filter.field] || filter.field;
          return project[field] === filter.value;
        });
      });
    }
    
    return allProjects;
  }
  
  async create(data: any): Promise<any> {
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
  
  async update(id: string, data: any): Promise<any> {
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
  
  async delete(id: string): Promise<void> {
    this.projects.delete(id);
  }
  
  async findByUserId(userId: string): Promise<any[]> {
    return Array.from(this.projects.values()).filter(
      p => p.userId === userId
    );
  }
}

/**
 * 测试套件
 */
describe('本体论架构测试', () => {
  let projectRepo: MockProjectRepository;
  let ontologyService: OntologyService;
  let testContext: ActionContext;
  
  beforeEach(() => {
    projectRepo = new MockProjectRepository();
    ontologyService = new OntologyService(
      projectRepo,
      null,
      null,
      null
    );
    
    testContext = {
      userId: 'test-user-123',
      userName: '测试用户',
      timestamp: new Date(),
    };
  });
  
  // ============================================
  // 测试 1: 创建项目 Action
  // ============================================
  it('应该成功创建项目', async () => {
    const action = new CreateProjectAction(ontologyService);
    const result = await action.run(
      {
        name: '测试项目',
        description: '这是一个测试项目',
        userId: 'test-user-123',
        organizationId: 'test-org',
      },
      testContext
    );
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.name).toBe('测试项目');
    expect(result.data?.userId).toBe('test-user-123');
  });
  
  // ============================================
  // 测试 2: 输入验证
  // ============================================
  it('应该拒绝空项目名', async () => {
    const action = new CreateProjectAction(ontologyService);
    const result = await action.run(
      {
        name: '',
        userId: 'test-user-123',
        organizationId: 'test-org',
      },
      testContext
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('不能为空');
  });
  
  it('应该拒绝缺少用户ID', async () => {
    const action = new CreateProjectAction(ontologyService);
    const result = await action.run(
      {
        name: '测试项目',
        userId: '',
        organizationId: 'test-org',
      },
      testContext
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('不能为空');
  });
  
  // ============================================
  // 测试 3: OntologyService 查询
  // ============================================
  it('应该能够查询单个对象', async () => {
    const action = new CreateProjectAction(ontologyService);
    const createResult = await action.run(
      {
        name: '查询测试项目',
        userId: 'test-user-123',
        organizationId: 'test-org',
      },
      testContext
    );
    
    expect(createResult.success).toBe(true);
    const projectId = createResult.data!.id;
    
    const project = await ontologyService.getObject<ProjectObject>(
      'Project',
      projectId
    );
    
    expect(project).toBeDefined();
    expect(project?.id).toBe(projectId);
    expect(project?.name).toBe('查询测试项目');
  });
  
  // ============================================
  // 测试 4: OntologyService 批量查询
  // ============================================
  it('应该能够批量查询对象', async () => {
    const action = new CreateProjectAction(ontologyService);
    
    await action.run(
      { name: '项目A', userId: 'user-1', organizationId: 'test-org' },
      { ...testContext, userId: 'user-1' }
    );
    
    await action.run(
      { name: '项目B', userId: 'user-1', organizationId: 'test-org' },
      { ...testContext, userId: 'user-1' }
    );
    
    await action.run(
      { name: '项目C', userId: 'user-2', organizationId: 'test-org' },
      { ...testContext, userId: 'user-2' }
    );
    
    const user1Projects = await ontologyService.queryObjects<ProjectObject>(
      'Project',
      {
        filters: [{ field: 'user_id', operator: 'eq', value: 'user-1' }],
      }
    );
    
    expect(user1Projects).toHaveLength(2);
    expect(user1Projects.some(p => p.name === '项目A')).toBe(true);
    expect(user1Projects.some(p => p.name === '项目B')).toBe(true);
  });
  
  // ============================================
  // 测试 5: 对象更新
  // ============================================
  it('应该能够更新对象', async () => {
    const action = new CreateProjectAction(ontologyService);
    const createResult = await action.run(
      { name: '原始名称', userId: 'test-user', organizationId: 'test-org' },
      testContext
    );
    
    expect(createResult.success).toBe(true);
    const projectId = createResult.data!.id;
    
    const updated = await ontologyService.updateObject<ProjectObject>(
      'Project',
      projectId,
      { name: '更新后的名称' }
    );
    
    expect(updated.name).toBe('更新后的名称');
    
    const project = await ontologyService.getObject<ProjectObject>(
      'Project',
      projectId
    );
    
    expect(project?.name).toBe('更新后的名称');
  });
  
  // ============================================
  // 测试 6: 对象删除
  // ============================================
  it('应该能够删除对象', async () => {
    const action = new CreateProjectAction(ontologyService);
    const createResult = await action.run(
      { name: '待删除项目', userId: 'test-user', organizationId: 'test-org' },
      testContext
    );
    
    expect(createResult.success).toBe(true);
    const projectId = createResult.data!.id;
    
    await ontologyService.deleteObject('Project', projectId);
    
    const project = await ontologyService.getObject<ProjectObject>(
      'Project',
      projectId
    );
    
    expect(project).toBeNull();
  });
});
