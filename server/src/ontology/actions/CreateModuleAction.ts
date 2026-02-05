/**
 * CreateModuleAction - 创建模块的 Action
 */

import { Action } from '../Action.js';
import { ActionContext, Permission, ModuleObject, ProjectObject } from '../types.js';
import { IOntologyService } from '../OntologyService.js';

/**
 * 创建模块的输入
 */
export interface CreateModuleInput {
  projectId: string;
  name: string;
  description?: string;
  functionalPoints?: any[];
  sortOrder?: number;
}

/**
 * 创建模块 Action
 */
export class CreateModuleAction extends Action<CreateModuleInput, ModuleObject> {
  name = 'CreateModule';
  description = '创建新模块';
  permissions = [Permission.MODULE_EDIT];
  
  constructor(ontology: IOntologyService, auditService?: any) {
    super(ontology, auditService);
  }
  
  async validate(input: CreateModuleInput, context: ActionContext): Promise<void> {
    // 调用父类的权限检查
    await super.validate(input, context);
    
    // 验证项目ID
    if (!input.projectId || input.projectId.trim().length === 0) {
      throw new Error('项目ID不能为空');
    }
    
    // 验证项目是否存在
    const project = await this.ontology.getObject<ProjectObject>('Project', input.projectId);
    if (!project) {
      throw new Error(`项目不存在: ${input.projectId}`);
    }
    
    // 验证用户是否有权限修改此项目
    if (project.userId !== context.userId) {
      throw new Error('无权在此项目中创建模块');
    }
    
    // 验证模块名称
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('模块名称不能为空');
    }
    
    if (input.name.length > 255) {
      throw new Error('模块名称不能超过255个字符');
    }
  }
  
  async execute(input: CreateModuleInput, context: ActionContext): Promise<ModuleObject> {
    // 创建模块对象
    const module = await this.ontology.createObject<ModuleObject>('Module', {
      type: 'Module',
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description?.trim(),
      functionalPoints: input.functionalPoints || [],
      sortOrder: input.sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return module;
  }
  
  async audit(
    input: CreateModuleInput,
    output: ModuleObject,
    context: ActionContext
  ): Promise<void> {
    await super.audit(input, output, context);
    console.log(`Module created: ${output.id} in project ${input.projectId} by user ${context.userId}`);
  }
}
