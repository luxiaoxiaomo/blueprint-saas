/**
 * RemoveMemberAction - 移除组织成员
 */

import { Action } from '../Action.js';
import { ActionContext, Permission } from '../types.js';

/**
 * 移除成员的输入
 */
export interface RemoveMemberInput {
  id: string;
  organizationId: string;
}

/**
 * 移除成员的输出
 */
export interface RemoveMemberOutput {
  success: boolean;
  memberId: string;
}

/**
 * 移除成员 Action
 */
export class RemoveMemberAction extends Action<RemoveMemberInput, RemoveMemberOutput> {
  name = 'RemoveMember';
  description = '从组织中移除成员';
  permissions = [Permission.SYSTEM_ADMIN];
  
  async validate(input: RemoveMemberInput, context: ActionContext): Promise<void> {
    // 1. 验证输入
    if (!input.id) {
      throw new Error('必须指定成员ID');
    }
    
    if (!input.organizationId) {
      throw new Error('必须指定组织ID');
    }
    
    // 2. 检查权限
    await this.checkPermissions(context);
    
    // 3. 验证成员存在
    const member = await this.ontology.getObject<any>('Member', input.id);
    if (!member) {
      throw new Error('成员不存在');
    }
    
    // 4. 验证成员属于该组织
    if (member.organizationId !== input.organizationId) {
      throw new Error('成员不属于该组织');
    }
    
    // 5. 不能移除组织所有者
    if (member.role === 'owner') {
      throw new Error('不能移除组织所有者');
    }
  }
  
  async execute(input: RemoveMemberInput, context: ActionContext): Promise<RemoveMemberOutput> {
    // 删除成员
    await this.ontology.deleteObject('Member', input.id);
    
    return {
      success: true,
      memberId: input.id,
    };
  }
}
