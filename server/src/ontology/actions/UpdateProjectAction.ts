/**
 * UpdateProjectAction - 更新项目的 Action
 */

import { Action } from '../Action.js';
import { ActionContext, Permission, ProjectObject } from '../types.js';
import { IOntologyService } from '../OntologyService.js';

/**
 * 更新项目的输入
 */
export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  model?: any;
}

/**
 * 更新项目 Action
 */
export class UpdateProjectAction extends Action<UpdateProjectInput, ProjectObject> {
  name = 'UpdateProject';
  description = '更新项目信息';
  permissions = [Permission.PROJECT_EDIT];
  
  constructor(ontology: IOntologyService, auditService?: any) {
    super(ontology, auditService);
  }
  
  async validate(input: UpdateProjectInput, context: ActionContext): Promise<void> {
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
    
    // 验证项目名称
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new Error('项目名称不能为空');
      }
      
      if (input.name.length > 255) {
        throw new Error('项目名称不能超过255个字符');
      }
    }
  }
  
  async execute(input: UpdateProjectInput, context: ActionContext): Promise<ProjectObject> {
    // 准备更新数据
    const updateData: Partial<ProjectObject> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name.trim();
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description.trim();
    }
    
    if (input.model !== undefined) {
      updateData.model = input.model;
    }
    
    // 更新项目
    const project = await this.ontology.updateObject<ProjectObject>(
      'Project',
      input.id,
      updateData
    );
    
    return project;
  }
  
  async audit(
    input: UpdateProjectInput,
    output: ProjectObject,
    context: ActionContext
  ): Promise<void> {
    await super.audit(input, output, context);
    console.log(`Project updated: ${output.id} by user ${context.userId}`);
  }
}
