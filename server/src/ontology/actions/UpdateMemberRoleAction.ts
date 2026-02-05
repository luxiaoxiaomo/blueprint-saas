/**
 * UpdateMemberRoleAction - 更新成员角色
 */

import { Action } from '../Action.js';
import { ActionContext, MemberObject, Permission } from '../types.js';

/**
 * 更新成员角色的输入
 */
export interface UpdateMemberRoleInput {
  memberId: string;
  newRole: 'owner' | 'admin' | 'architect' | 'developer' | 'viewer';
  organizationId: string;
}

/**
 * 更新成员角色 Action
 */
export class UpdateMemberRoleAction extends Action<UpdateMemberRoleInput, MemberObject> {
  name = 'UpdateMemberRole';
  description = '更新成员角色';
  permissions = [Permission.SYSTEM_ADMIN]; // 需要管理员权限
  
  async validate(input: UpdateMemberRoleInput, context: ActionContext): Promise<void> {
    // 1. 验证输入
    if (!input.memberId) {
      throw new Error('成员 ID 不能为空');
    }
    
    if (!input.newRole) {
      throw new Error('新角色不能为空');
    }
    
    if (!input.organizationId) {
      throw new Error('组织 ID 不能为空');
    }
    
    // 2. 验证角色有效性
    const validRoles = ['owner', 'admin', 'architect', 'developer', 'viewer'];
    if (!validRoles.includes(input.newRole)) {
      throw new Error(`无效的角色: ${input.newRole}`);
    }
    
    // 3. 检查权限
    await this.checkPermissions(context);
    
    // 4. 验证成员存在
    const member = await this.ontology.getObject<MemberObject>('Member', input.memberId);
    if (!member) {
      throw new Error(`成员 ${input.memberId} 不存在`);
    }
    
    // 5. 验证成员属于指定组织
    if (member.organizationId !== input.organizationId) {
      throw new Error('成员不属于指定组织');
    }
    
    // 6. 验证不是更新为相同角色
    if (member.role === input.newRole) {
      throw new Error(`成员已经是 ${input.newRole} 角色`);
    }
    
    // 7. 特殊验证：不能移除组织的最后一个 owner
    if (member.role === 'owner' && input.newRole !== 'owner') {
      // 检查组织是否还有其他 owner
      const owners = await this.ontology.queryObjects<MemberObject>('Member', {
        filters: [
          { field: 'organizationId', operator: 'eq', value: input.organizationId },
          { field: 'role', operator: 'eq', value: 'owner' },
          { field: 'status', operator: 'eq', value: 'active' },
        ],
      });
      
      if (owners.length <= 1) {
        throw new Error('不能移除组织的最后一个所有者');
      }
    }
  }
  
  async execute(input: UpdateMemberRoleInput, context: ActionContext): Promise<MemberObject> {
    // 更新成员角色
    const updatedMember = await this.ontology.updateObject<MemberObject>(
      'Member',
      input.memberId,
      {
        role: input.newRole,
      }
    );
    
    return updatedMember;
  }
  
  async audit(
    input: UpdateMemberRoleInput,
    output: MemberObject,
    context: ActionContext
  ): Promise<void> {
    if (!this.auditService) return;
    
    // 获取旧角色
    const oldMember = await this.ontology.getObject<MemberObject>('Member', input.memberId);
    
    await this.auditService.log({
      userId: context.userId,
      action: this.name,
      resourceType: 'Member',
      resourceId: input.memberId,
      details: {
        organizationId: input.organizationId,
        oldRole: oldMember?.role,
        newRole: input.newRole,
        updatedBy: context.userId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
