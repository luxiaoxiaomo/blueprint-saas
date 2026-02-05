/**
 * Actions 测试套件
 * 测试所有 Actions 的功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OntologyService } from '../OntologyService.js';
import {
  CreateProjectAction,
  UpdateProjectAction,
  DeleteProjectAction,
  ArchiveProjectAction,
  CreateModuleAction,
  UpdateModuleAction,
  DeleteModuleAction,
} from '../actions/index.js';
import { ActionContext, ProjectObject, ModuleObject } from '../types.js';

/**
 * Mock Repository for testing
 */
class MockRepository {
  private objects: Map<string, any> = new Map();
  private idCounter = 1;
  
  async findById(id: string): Promise<any | null> {
    return this.objects.get(id) || null;
  }
  
  async find(options?: any): Promise<any[]> {
    const allObjects = Array.from(this.objects.values());
    
    if (options?.filters) {
      return allObjects.filter(obj => {
        return options.filters.every((filter: any) => {
          const fieldMap: Record<string, string> = {
            'user_id': 'userId',
            'project_id': 'projectId',
            'is_archived': 'isArchived',
          };
          const field = fieldMap[filter.field] || filter.field;
          return obj[field] === filter.value;
        });
      });
    }
    
    return allObjects;
  }
  
  async create(data: any): Promise<any> {
    const id = `${data.type.toLowerCase()}-${this.idCounter++}`;
    const object = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.objects.set(id, object);
    return object;
  }
  
  async update(id: string, data: any): Promise<any> {
    const object = this.objects.get(id);
    if (!object) {
      throw new Error(`Object with id ${id} not found`);
    }
    
    const updated = {
      ...object,
      ...data,
      updatedAt: new Date(),
    };
    this.objects.set(id, updated);
    return updated;
  }
  
  async delete(id: string): Promise<void> {
    this.objects.delete(id);
  }
}

describe('Project Actions 测试', () => {
  let projectRepo: MockRepository;
  let moduleRepo: MockRepository;
  let ontologyService: OntologyService;
  let testContext: ActionContext;
  
  beforeEach(() => {
    projectRepo = new MockRepository();
    moduleRepo = new MockRepository();
    ontologyService = new OntologyService(
      projectRepo,
      moduleRepo,
      null,
      null
    );
    
    testContext = {
      userId: 'test-user-123',
      userName: '测试用户',
      timestamp: new Date(),
    };
  });
  
  describe('UpdateProjectAction', () => {
    it('应该成功更新项目', async () => {
      // 先创建一个项目
      const createAction = new CreateProjectAction(ontologyService);
      const createResult = await createAction.run(
        { name: '原始项目', userId: 'test-user-123', organizationId: 'test-org' },
        testContext
      );
      
      expect(createResult.success).toBe(true);
      const projectId = createResult.data!.id;
      
      // 更新项目
      const updateAction = new UpdateProjectAction(ontologyService);
      const updateResult = await updateAction.run(
        {
          id: projectId,
          name: '更新后的项目',
          description: '新的描述',
        },
        testContext
      );
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.name).toBe('更新后的项目');
      expect(updateResult.data?.description).toBe('新的描述');
    });
    
    it('应该拒绝更新不存在的项目', async () => {
      const updateAction = new UpdateProjectAction(ontologyService);
      const result = await updateAction.run(
        { id: 'non-existent', name: '测试' },
        testContext
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('项目不存在');
    });
    
    it('应该拒绝更新其他用户的项目', async () => {
      // 创建项目
      const createAction = new CreateProjectAction(ontologyService);
      const createResult = await createAction.run(
        { name: '用户A的项目', userId: 'user-a', organizationId: 'test-org' },
        { ...testContext, userId: 'user-a' }
      );
      
      expect(createResult.success).toBe(true);
      const projectId = createResult.data!.id;
      
      // 尝试用用户B更新
      const updateAction = new UpdateProjectAction(ontologyService);
      const result = await updateAction.run(
        { id: projectId, name: '尝试修改' },
        { ...testContext, userId: 'user-b' }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('无权修改');
    });
  });
  
  describe('DeleteProjectAction', () => {
    it('应该成功删除项目', async () => {
      // 创建项目
      const createAction = new CreateProjectAction(ontologyService);
      const createResult = await createAction.run(
        { name: '待删除项目', userId: 'test-user-123', organizationId: 'test-org' },
        testContext
      );
      
      expect(createResult.success).toBe(true);
      const projectId = createResult.data!.id;
      
      // 删除项目
      const deleteAction = new DeleteProjectAction(ontologyService);
      const deleteResult = await deleteAction.run(
        { id: projectId },
        testContext
      );
      
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data?.deleted).toBe(true);
      
      // 验证项目已删除
      const project = await ontologyService.getObject('Project', projectId);
      expect(project).toBeNull();
    });
    
    it('应该拒绝删除其他用户的项目', async () => {
      // 创建项目
      const createAction = new CreateProjectAction(ontologyService);
      const createResult = await createAction.run(
        { name: '用户A的项目', userId: 'user-a', organizationId: 'test-org' },
        { ...testContext, userId: 'user-a' }
      );
      
      expect(createResult.success).toBe(true);
      const projectId = createResult.data!.id;
      
      // 尝试用用户B删除
      const deleteAction = new DeleteProjectAction(ontologyService);
      const result = await deleteAction.run(
        { id: projectId },
        { ...testContext, userId: 'user-b' }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('无权删除');
    });
  });
  
  describe('ArchiveProjectAction', () => {
    it('应该成功归档项目', async () => {
      // 创建项目
      const createAction = new CreateProjectAction(ontologyService);
      const createResult = await createAction.run(
        { name: '待归档项目', userId: 'test-user-123', organizationId: 'test-org' },
        testContext
      );
      
      expect(createResult.success).toBe(true);
      const projectId = createResult.data!.id;
      
      // 归档项目
      const archiveAction = new ArchiveProjectAction(ontologyService);
      const archiveResult = await archiveAction.run(
        { id: projectId, archived: true },
        testContext
      );
      
      expect(archiveResult.success).toBe(true);
      expect(archiveResult.data?.isArchived).toBe(true);
    });
    
    it('应该成功取消归档项目', async () => {
      // 创建并归档项目
      const createAction = new CreateProjectAction(ontologyService);
      const createResult = await createAction.run(
        { name: '项目', userId: 'test-user-123', organizationId: 'test-org' },
        testContext
      );
      
      const projectId = createResult.data!.id;
      
      const archiveAction = new ArchiveProjectAction(ontologyService);
      await archiveAction.run(
        { id: projectId, archived: true },
        testContext
      );
      
      // 取消归档
      const unarchiveResult = await archiveAction.run(
        { id: projectId, archived: false },
        testContext
      );
      
      expect(unarchiveResult.success).toBe(true);
      expect(unarchiveResult.data?.isArchived).toBe(false);
    });
  });
});

describe('Module Actions 测试', () => {
  let projectRepo: MockRepository;
  let moduleRepo: MockRepository;
  let ontologyService: OntologyService;
  let testContext: ActionContext;
  let testProjectId: string;
  
  beforeEach(async () => {
    projectRepo = new MockRepository();
    moduleRepo = new MockRepository();
    ontologyService = new OntologyService(
      projectRepo,
      moduleRepo,
      null,
      null
    );
    
    testContext = {
      userId: 'test-user-123',
      userName: '测试用户',
      timestamp: new Date(),
    };
    
    // 创建测试项目
    const createProjectAction = new CreateProjectAction(ontologyService);
    const projectResult = await createProjectAction.run(
      { name: '测试项目', userId: 'test-user-123', organizationId: 'test-org' },
      testContext
    );
    testProjectId = projectResult.data!.id;
  });
  
  describe('CreateModuleAction', () => {
    it('应该成功创建模块', async () => {
      const action = new CreateModuleAction(ontologyService);
      const result = await action.run(
        {
          projectId: testProjectId,
          name: '测试模块',
          description: '模块描述',
        },
        testContext
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('测试模块');
      expect(result.data?.projectId).toBe(testProjectId);
    });
    
    it('应该拒绝在不存在的项目中创建模块', async () => {
      const action = new CreateModuleAction(ontologyService);
      const result = await action.run(
        {
          projectId: 'non-existent',
          name: '测试模块',
        },
        testContext
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('项目不存在');
    });
    
    it('应该拒绝空模块名', async () => {
      const action = new CreateModuleAction(ontologyService);
      const result = await action.run(
        {
          projectId: testProjectId,
          name: '',
        },
        testContext
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不能为空');
    });
  });
  
  describe('UpdateModuleAction', () => {
    it('应该成功更新模块', async () => {
      // 创建模块
      const createAction = new CreateModuleAction(ontologyService);
      const createResult = await createAction.run(
        {
          projectId: testProjectId,
          name: '原始模块',
        },
        testContext
      );
      
      const moduleId = createResult.data!.id;
      
      // 更新模块
      const updateAction = new UpdateModuleAction(ontologyService);
      const updateResult = await updateAction.run(
        {
          id: moduleId,
          name: '更新后的模块',
          description: '新描述',
        },
        testContext
      );
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data?.name).toBe('更新后的模块');
      expect(updateResult.data?.description).toBe('新描述');
    });
  });
  
  describe('DeleteModuleAction', () => {
    it('应该成功删除模块', async () => {
      // 创建模块
      const createAction = new CreateModuleAction(ontologyService);
      const createResult = await createAction.run(
        {
          projectId: testProjectId,
          name: '待删除模块',
        },
        testContext
      );
      
      const moduleId = createResult.data!.id;
      
      // 删除模块
      const deleteAction = new DeleteModuleAction(ontologyService);
      const deleteResult = await deleteAction.run(
        { id: moduleId },
        testContext
      );
      
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data?.deleted).toBe(true);
      
      // 验证模块已删除
      const module = await ontologyService.getObject('Module', moduleId);
      expect(module).toBeNull();
    });
  });
});
