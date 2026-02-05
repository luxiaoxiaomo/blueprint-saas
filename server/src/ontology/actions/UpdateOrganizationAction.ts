/**
 * UpdateOrganizationAction - 更新组织
 */

import { Action } from '../Action.js';
import { ActionContext, OrganizationObject, Permission } from '../types.js';

/**
 * 更新组织的输入
 */
export interface UpdateOrganizationInput {
  id: string;
  name?: string;
  description?: string;
  plan?: 'free' | 'professional' | 'enterprise';
  settings?: any;
}

/**
 * 更新组织 Action
 */
export class UpdateOrganizationAction extends Action<UpdateOrganizationInput, OrganizationObject> {
  name = 'UpdateOrganization';
  description = '更新组织信息';
  permissions = [Permission.SYSTEM_ADMIN];
  
  async validate(input: UpdateOrganizationInput, context: ActionContext): Promise<void> {
    // 1. 验证输入
    if (!input.id) {
      throw new Error('必须指定组织ID');
    }
    
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        throw new Error('组织名称不能为空');
      }
      
      if (input.name.length > 255) {
        throw new Error('组织名称不能超过255个字符');
      }
    }
    
    // 2. 检查权限
    await this.checkPermissions(context);
    
    // 3. 验证组织存在
    const organization = await this.ontology.getObject('Organization', input.id);
    if (!organization) {
      throw new Error('组织不存在');
    }
  }
  
  async execute(input: UpdateOrganizationInput, context: ActionContext): Promise<OrganizationObject> {
    // 准备更新数据
    const updates: any = {};
    
    if (input.name !== undefined) {
      updates.name = input.name.trim();
    }
    
    if (input.description !== undefined) {
      updates.description = input.description.trim();
    }
    
    if (input.plan !== undefined) {
      updates.plan = input.plan;
      
      // 根据套餐更新设置
      const maxMembers = input.plan === 'enterprise' ? 1000 : input.plan === 'professional' ? 100 : 10;
      const maxProjects = input.plan === 'enterprise' ? 500 : input.plan === 'professional' ? 50 : 5;
      
      updates.settings = {
        ...(input.settings || {}),
        maxMembers,
        maxProjects,
      };
    } else if (input.settings !== undefined) {
      updates.settings = input.settings;
    }
    
    // 更新组织
    const organization = await this.ontology.updateObject<OrganizationObject>('Organization', input.id, updates);
    
    return organization;
  }
}
