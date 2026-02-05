/**
 * UpdateModuleAction - 更新模块的 Action
 */

import { Action } from '../Action.js';
import { ActionContext, Permission, ModuleObject, ProjectObject } from '../types.js';
import { IOntologyService } from '../OntologyService.js';

/**
 * 更新模块的输入
 */
export interface UpdateModuleInput {
  id: string;
  name?: string;
  description?: string;
  functionalPoints?: any[];
  sortOrder?: number;
}

/**
 * 更新模块 Action
 */
export class UpdateModuleAction extends Action<UpdateModuleInput, ModuleObject> {
  name = 'UpdateModule';
  description = '更新模块信息';
  permissions = [Permission.MODULE_EDIT];
  
  constructor(ontology: IOntologyService, auditService?: any) {
    super(ontology, auditService);
  }
  
  async validate(input: UpdateModuleInput, context: ActionContext): Promise<void> {
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
      throw new Error('无权修改此模块');
    }
    
    // 验证模块名称
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new Error('模块名称不能为空');
      }
      
      if (input.name.length > 255) {
        throw new Error('模块名称不能超过255个字符');
      }
    }
  }
  
  async execute(input: UpdateModuleInput, context: ActionContext): Promise<ModuleObject> {
    // 准备更新数据
    const updateData: Partial<ModuleObject> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name.trim();
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description.trim();
    }
    
    if (input.functionalPoints !== undefined) {
      updateData.functionalPoints = input.functionalPoints;
    }
    
    if (input.sortOrder !== undefined) {
      updateData.sortOrder = input.sortOrder;
    }
    
    // 更新模块
    const module = await this.ontology.updateObject<ModuleObject>(
      'Module',
      input.id,
      updateData
    );
    
    return module;
  }
  
  async audit(
    input: UpdateModuleInput,
    output: ModuleObject,
    context: ActionContext
  ): Promise<void> {
    await super.audit(input, output, context);
    console.log(`Module updated: ${output.id} by user ${context.userId}`);
  }
}
