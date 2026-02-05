/**
 * InviteMemberAction - 邀请成员加入组织
 */

import { Action } from '../Action.js';
import { ActionContext, MemberObject, Permission } from '../types.js';

/**
 * 邀请成员的输入
 */
export interface InviteMemberInput {
  organizationId: string;
  userId: string;
  role?: 'admin' | 'architect' | 'developer' | 'viewer';
  invitedBy: string;
}

/**
 * 邀请成员 Action
 */
export class InviteMemberAction extends Action<InviteMemberInput, MemberObject> {
  name = 'InviteMember';
  description = '邀请成员加入组织';
  permissions = [Permission.SYSTEM_ADMIN]; // 需要管理员权限
  
  async validate(input: InviteMemberInput, context: ActionContext): Promise<void> {
    // 1. 验证输入
    if (!input.organizationId) {
      throw new Error('必须指定组织ID');
    }
    
    if (!input.userId) {
      throw new Error('必须指定用户ID');
    }
    
    if (!input.invitedBy) {
      throw new Error('必须指定邀请者');
    }
    
    // 2. 检查权限
    await this.checkPermissions(context);
    
    // 3. 验证组织存在
    const organization = await this.ontology.getObject('Organization', input.organizationId);
    if (!organization) {
      throw new Error('组织不存在');
    }
    
    // 4. 检查用户是否已经是成员
    // 注意：这里需要访问 MemberRepository
    // 在实际实现中，可以通过 OntologyService 访问
  }
  
  async execute(input: InviteMemberInput, context: ActionContext): Promise<MemberObject> {
    // 创建成员记录
    const member = await this.ontology.createObject<MemberObject>('Member', {
      type: 'Member',
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role || 'viewer',
      status: 'invited',
      invitedBy: input.invitedBy,
      invitedAt: new Date(),
    });
    
    // 创建组织到成员的链接
    await this.ontology.createLink(
      input.organizationId,
      member.id,
      'Organization→Member',
      { role: input.role || 'viewer' }
    );
    
    return member;
  }
}
