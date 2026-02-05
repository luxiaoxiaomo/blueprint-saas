/**
 * DeleteModuleAction - 删除模块的 Action
 */

import { Action } from '../Action.js';
import { ActionContext, Permission, ModuleObject, ProjectObject } from '../types.js';
import { IOntologyService } from '../OntologyService.js';

/**
 * 删除模块的输入
 */
export interface DeleteModuleInput {
  id: string;
}

/**
 * 删除模块的输出
 */
export interface DeleteModuleOutput {
  id: string;
  deleted: boolean;
}

/**
 * 删除模块 Action
 */
export class DeleteModuleAction extends Action<DeleteModuleInput, DeleteModuleOutput> {
  name = 'DeleteModule';
  description = '删除模块';
  permissions = [Permission.MODULE_EDIT];
  
  constructor(ontology: IOntologyService, auditService?: any) {
    super(ontology, auditService);
  }
  
  async validate(input: DeleteModuleInput, context: ActionContext): Promise<void> {
    // 调用父类的权限检查
    await super.validate(input, context);
    
    // 验证模块ID
    if (!input.id || input.id.trim().length === 0) {
      throw new Error('模块ID不能为空');
    }
    
    // 验证模块是否存在
    const module = await this.ontology.getObject<ModuleObject>('Module', input.id);
    if (!module) {
      throw new Error(`模块不存在: ${input.id}`);
    }
    
    // 验证项目是否存在，并检查用户权限
    const project = await this.ontology.getObject<ProjectObject>('Project', module.projectId);
    if (!project) {
      throw new Error(`项目不存在: ${module.projectId}`);
    }
    
    if (project.userId !== context.userId) {
      throw new Error('无权删除此模块');
    }
  }
  
  async execute(input: DeleteModuleInput, context: ActionContext): Promise<DeleteModuleOutput> {
    // 删除模块（级联删除相关的实体等）
    // TODO: 实现级联删除逻辑
    // 1. 删除模块的所有实体
    // 2. 删除模块本身
    
    await this.ontology.deleteObject('Module', input.id);
    
    return {
      id: input.id,
      deleted: true,
    };
  }
  
  async audit(
    input: DeleteModuleInput,
    output: DeleteModuleOutput,
    context: ActionContext
  ): Promise<void> {
    await super.audit(input, output, context);
    console.log(`Module deleted: ${output.id} by user ${context.userId}`);
  }
}
