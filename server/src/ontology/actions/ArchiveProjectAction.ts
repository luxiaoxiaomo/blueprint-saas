/**
 * ArchiveProjectAction - 归档/取消归档项目的 Action
 */

import { Action } from '../Action.js';
import { ActionContext, Permission, ProjectObject } from '../types.js';
import { IOntologyService } from '../OntologyService.js';

/**
 * 归档项目的输入
 */
export interface ArchiveProjectInput {
  id: string;
  archived: boolean; // true: 归档, false: 取消归档
}

/**
 * 归档项目 Action
 */
export class ArchiveProjectAction extends Action<ArchiveProjectInput, ProjectObject> {
  name = 'ArchiveProject';
  description = '归档或取消归档项目';
  permissions = [Permission.PROJECT_EDIT];
  
  constructor(ontology: IOntologyService, auditService?: any) {
    super(ontology, auditService);
  }
  
  async validate(input: ArchiveProjectInput, context: ActionContext): Promise<void> {
    // 调用父类的权限检查
    await super.validate(input, context);
    
    // 验证项目ID
    if (!input.id || input.id.trim().length === 0) {
      throw new Error('项目ID不能为空');
    }
    
    // 验证项目是否存在
    const project = await this.ontology.getObject<ProjectObject>('Project', input.id);
    if (!project) {
      throw new Error(`项目不存在: ${input.id}`);
    }
    
    // 验证用户是否有权限修改此项目
    if (project.userId !== context.userId) {
      throw new Error('无权修改此项目');
    }
    
    // 验证归档状态
    if (input.archived === undefined) {
      throw new Error('归档状态不能为空');
    }
  }
  
  async execute(input: ArchiveProjectInput, context: ActionContext): Promise<ProjectObject> {
    // 更新项目的归档状态
    const project = await this.ontology.updateObject<ProjectObject>(
      'Project',
      input.id,
      { isArchived: input.archived }
    );
    
    return project;
  }
  
  async audit(
    input: ArchiveProjectInput,
    output: ProjectObject,
    context: ActionContext
  ): Promise<void> {
    await super.audit(input, output, context);
    const action = input.archived ? 'archived' : 'unarchived';
    console.log(`Project ${action}: ${output.id} by user ${context.userId}`);
  }
}
