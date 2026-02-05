/**
 * CreateOrganizationAction - 创建组织
 */

import { Action } from '../Action.js';
import { ActionContext, OrganizationObject, Permission } from '../types.js';

/**
 * 创建组织的输入
 */
export interface CreateOrganizationInput {
  name: string;
  identifier: string;
  description?: string;
  plan?: 'free' | 'professional' | 'enterprise';
  ownerId: string;
}

/**
 * 创建组织 Action
 */
export class CreateOrganizationAction extends Action<CreateOrganizationInput, OrganizationObject> {
  name = 'CreateOrganization';
  description = '创建新组织';
  permissions = [Permission.SYSTEM_ADMIN]; // 只有系统管理员可以创建组织
  
  async validate(input: CreateOrganizationInput, context: ActionContext): Promise<void> {
    // 1. 验证输入
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('组织名称不能为空');
    }
    
    if (input.name.length > 255) {
      throw new Error('组织名称不能超过255个字符');
    }
    
    if (!input.identifier || input.identifier.trim().length === 0) {
      throw new Error('组织标识符不能为空');
    }
    
    if (!/^[a-z0-9-]+$/.test(input.identifier)) {
      throw new Error('组织标识符只能包含小写字母、数字和连字符');
    }
    
    if (!input.ownerId) {
      throw new Error('必须指定组织所有者');
    }
    
    // 2. 检查权限（通过父类）
    await this.checkPermissions(context);
    
    // 3. 检查标识符是否已存在
    // 注意：这里需要访问 OrganizationRepository
    // 在实际实现中，可以通过 OntologyService 访问
  }
  
  async execute(input: CreateOrganizationInput, context: ActionContext): Promise<OrganizationObject> {
    // 创建组织
    const organization = await this.ontology.createObject<OrganizationObject>('Organization', {
      type: 'Organization',
      name: input.name.trim(),
      identifier: input.identifier.trim().toLowerCase(),
      description: input.description?.trim(),
      plan: input.plan || 'free',
      settings: {
        maxMembers: input.plan === 'enterprise' ? 1000 : input.plan === 'professional' ? 100 : 10,
        maxProjects: input.plan === 'enterprise' ? 500 : input.plan === 'professional' ? 50 : 5,
      },
      ownerId: input.ownerId,
    });
    
    // 自动将所有者添加为组织成员
    await this.ontology.createObject('Member', {
      type: 'Member',
      userId: input.ownerId,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    } as any);
    
    return organization;
  }
}
