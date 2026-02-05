/**
 * 本体服务 - 核心服务层
 * 提供统一的对象访问和链接遍历接口
 */

import {
  OntologyObject,
  OntologyLink,
  QueryOptions,
  LinkType,
  ProjectObject,
  ModuleObject,
  EntityObject,
  TaskObject,
} from './types.js';

/**
 * 本体服务接口
 */
export interface IOntologyService {
  // ============================================
  // 对象查询方法
  // ============================================
  
  /**
   * 根据 ID 获取对象
   */
  getObject<T extends OntologyObject>(type: string, id: string): Promise<T | null>;
  
  /**
   * 查询对象列表
   */
  queryObjects<T extends OntologyObject>(
    type: string,
    options?: QueryOptions
  ): Promise<T[]>;
  
  /**
   * 创建对象
   */
  createObject<T extends OntologyObject>(type: string, data: Partial<T>): Promise<T>;
  
  /**
   * 更新对象
   */
  updateObject<T extends OntologyObject>(type: string, id: string, data: Partial<T>): Promise<T>;
  
  /**
   * 删除对象
   */
  deleteObject(type: string, id: string): Promise<void>;
  
  // ============================================
  // 链接遍历方法
  // ============================================
  
  /**
   * 获取对象的所有链接
   */
  getLinkedObjects<T extends OntologyObject>(
    objectId: string,
    linkType: LinkType
  ): Promise<T[]>;
  
  /**
   * 创建链接
   */
  createLink(sourceId: string, targetId: string, linkType: LinkType, metadata?: any): Promise<OntologyLink>;
  
  /**
   * 删除链接
   */
  deleteLink(linkId: string): Promise<void>;
  
  // ============================================
  // 批量操作
  // ============================================
  
  /**
   * 批量查询
   */
  batchQuery<T extends OntologyObject>(queries: Array<{
    type: string;
    options?: QueryOptions;
  }>): Promise<T[][]>;
}

/**
 * 本体服务实现
 */
export class OntologyService implements IOntologyService {
  constructor(
    private projectRepo: any,
    private moduleRepo: any,
    private entityRepo: any,
    private taskRepo: any,
    private linkRepo?: any,
    private organizationRepo?: any,
    private memberRepo?: any
  ) {}
  
  async getObject<T extends OntologyObject>(
    type: string,
    id: string
  ): Promise<T | null> {
    const repo = this.getRepository(type);
    return repo.findById(id) as Promise<T | null>;
  }
  
  async queryObjects<T extends OntologyObject>(
    type: string,
    options?: QueryOptions
  ): Promise<T[]> {
    const repo = this.getRepository(type);
    return repo.find(options) as Promise<T[]>;
  }
  
  async createObject<T extends OntologyObject>(
    type: string,
    data: Partial<T>
  ): Promise<T> {
    const repo = this.getRepository(type);
    return repo.create(data) as Promise<T>;
  }
  
  async updateObject<T extends OntologyObject>(
    type: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    const repo = this.getRepository(type);
    return repo.update(id, data) as Promise<T>;
  }
  
  async deleteObject(type: string, id: string): Promise<void> {
    const repo = this.getRepository(type);
    return repo.delete(id);
  }
  
  async getLinkedObjects<T extends OntologyObject>(
    objectId: string,
    linkType: LinkType
  ): Promise<T[]> {
    // 根据链接类型获取相关对象
    switch (linkType) {
      case 'Project→Module':
        return this.moduleRepo.findByProjectId(objectId) as Promise<T[]>;
      
      case 'Project→Entity':
        return this.entityRepo.findByProjectId(objectId) as Promise<T[]>;
      
      case 'Project→Task':
        return this.taskRepo.findByProjectId(objectId) as Promise<T[]>;
      
      case 'Module→Entity':
        return this.entityRepo.findByModuleId(objectId) as Promise<T[]>;
      
      case 'Module→Module':
        // 模块依赖关系 - 使用 LinkRepository
        if (!this.linkRepo) {
          throw new Error('LinkRepository not configured');
        }
        const links = await this.linkRepo.findBySourceId(objectId, linkType);
        const moduleIds = links.map((link: OntologyLink) => link.targetId);
        const modules = await Promise.all(
          moduleIds.map((id: string) => this.moduleRepo.findById(id))
        );
        return modules.filter(m => m !== null) as T[];
      
      case 'Organization→Project':
        // 组织的项目 - 通过链接查询
        if (!this.linkRepo) {
          throw new Error('LinkRepository not configured');
        }
        const projectLinks = await this.linkRepo.findBySourceId(objectId, linkType);
        const projectIds = projectLinks.map((link: OntologyLink) => link.targetId);
        const projects = await Promise.all(
          projectIds.map((id: string) => this.projectRepo.findById(id))
        );
        return projects.filter(p => p !== null) as T[];
      
      case 'Organization→Member':
        // 组织的成员
        if (!this.memberRepo) {
          throw new Error('MemberRepository not configured');
        }
        return this.memberRepo.findByOrganizationId(objectId) as Promise<T[]>;
      
      default:
        throw new Error(`Unsupported link type: ${linkType}`);
    }
  }
  
  async createLink(
    sourceId: string,
    targetId: string,
    linkType: LinkType,
    metadata?: any
  ): Promise<OntologyLink> {
    if (!this.linkRepo) {
      throw new Error('LinkRepository not configured');
    }
    
    // 验证源对象和目标对象存在
    await this.validateLinkObjects(sourceId, targetId, linkType);
    
    // 创建链接
    return this.linkRepo.create(sourceId, targetId, linkType, metadata);
  }
  
  async deleteLink(linkId: string): Promise<void> {
    if (!this.linkRepo) {
      throw new Error('LinkRepository not configured');
    }
    
    await this.linkRepo.delete(linkId);
  }
  
  async batchQuery<T extends OntologyObject>(
    queries: Array<{ type: string; options?: QueryOptions }>
  ): Promise<T[][]> {
    return Promise.all(
      queries.map(q => this.queryObjects<T>(q.type, q.options))
    );
  }
  
  // ============================================
  // 私有辅助方法
  // ============================================
  
  private getRepository(type: string): any {
    switch (type) {
      case 'Project':
        return this.projectRepo;
      case 'Module':
        return this.moduleRepo;
      case 'Entity':
        return this.entityRepo;
      case 'Task':
        return this.taskRepo;
      case 'Organization':
        if (!this.organizationRepo) {
          throw new Error('OrganizationRepository not configured');
        }
        return this.organizationRepo;
      case 'Member':
        if (!this.memberRepo) {
          throw new Error('MemberRepository not configured');
        }
        return this.memberRepo;
      default:
        throw new Error(`Unknown object type: ${type}`);
    }
  }
  
  private async validateLinkObjects(
    sourceId: string,
    targetId: string,
    linkType: LinkType
  ): Promise<void> {
    // 根据链接类型验证对象
    const [sourceType, targetType] = linkType.split('→');
    
    const sourceObj = await this.getObject(sourceType, sourceId);
    if (!sourceObj) {
      throw new Error(`Source object ${sourceType}:${sourceId} not found`);
    }
    
    const targetObj = await this.getObject(targetType, targetId);
    if (!targetObj) {
      throw new Error(`Target object ${targetType}:${targetId} not found`);
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
