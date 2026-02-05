/**
 * DeleteProjectAction - 删除项目的 Action
 */

import { Action } from '../Action.js';
import { ActionContext, Permission, ProjectObject } from '../types.js';
import { IOntologyService } from '../OntologyService.js';

/**
 * 删除项目的输入
 */
export interface DeleteProjectInput {
  id: string;
}

/**
 * 删除项目的输出
 */
export interface DeleteProjectOutput {
  id: string;
  deleted: boolean;
}

/**
 * 删除项目 Action
 */
export class DeleteProjectAction extends Action<DeleteProjectInput, DeleteProjectOutput> {
  name = 'DeleteProject';
  description = '删除项目';
  permissions = [Permission.PROJECT_DELETE];
  
  constructor(ontology: IOntologyService, auditService?: any) {
    super(ontology, auditService);
  }
  
  async validate(input: DeleteProjectInput, context: ActionContext): Promise<void> {
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
    
    // 验证用户是否有权限删除此项目
    if (project.userId !== context.userId) {
      throw new Error('无权删除此项目');
    }
  }
  
  async execute(input: DeleteProjectInput, context: ActionContext): Promise<DeleteProjectOutput> {
    // 删除项目（级联删除相关的模块、实体等）
    // TODO: 实现级联删除逻辑
    // 1. 删除项目的所有模块
    // 2. 删除项目的所有实体
    // 3. 删除项目的所有任务
    // 4. 删除项目本身
    
    await this.ontology.deleteObject('Project', input.id);
    
    return {
      id: input.id,
      deleted: true,
    };
  }
  
  async audit(
    input: DeleteProjectInput,
    output: DeleteProjectOutput,
    context: ActionContext
  ): Promise<void> {
    await super.audit(input, output, context);
    console.log(`Project deleted: ${output.id} by user ${context.userId}`);
  }
}
