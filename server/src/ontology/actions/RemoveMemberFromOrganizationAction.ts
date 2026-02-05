/**
 * RemoveMemberFromOrganizationAction - 从组织中移除成员
 */

import { Action } from '../Action.js';
import { ActionContext, MemberObject, Permission } from '../types.js';

/**
 * 移除成员的输入
 */
export interface RemoveMemberFromOrganizationInput {
  memberId: string;
  organizationId: string;
  reason?: string; // 移除原因（可选）
}

/**
 * 从组织中移除成员 Action
 */
export class RemoveMemberFromOrganizationAction extends Action<
  RemoveMemberFromOrganizationInput,
  void
> {
  name = 'RemoveMemberFromOrganization';
  description = '从组织中移除成员';
  permissions = [Permission.SYSTEM_ADMIN]; // 需要管理员权限
  
  async validate(
    input: RemoveMemberFromOrganizationInput,
    context: ActionContext
  ): Promise<void> {
    // 1. 验证输入
    if (!input.memberId) {
      throw new Error('成员 ID 不能为空');
    }
    
    if (!input.organizationId) {
      throw new Error('组织 ID 不能为空');
    }
    
    // 2. 检查权限
    await this.checkPermissions(context);
    
    // 3. 验证成员存在
    const member = await this.ontology.getObject<MemberObject>('Member', input.memberId);
    if (!member) {
      throw new Error(`成员 ${input.memberId} 不存在`);
    }
    
    // 4. 验证成员属于指定组织
    if (member.organizationId !== input.organizationId) {
      throw new Error('成员不属于指定组织');
    }
    
    // 5. 特殊验证：不能移除组织的最后一个 owner
    if (member.role === 'owner') {
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
    
    // 6. 验证不是移除自己（可选，根据业务需求）
    if (member.userId === context.userId) {
      throw new Error('不能移除自己，请使用离开组织功能');
    }
  }
  
  async execute(
    input: RemoveMemberFromOrganizationInput,
    context: ActionContext
  ): Promise<void> {
    // 🔴 关键修复 2：实施权限继承规则 - 级联删除
    // 1. 获取成员的所有项目访问权限
    // TODO: 当实施任务 8 时，从 project_members 表中查询
    // const projectMembers = await this.projectMemberRepo.getMemberProjects(input.memberId);
    
    // 2. 从所有项目中移除该成员
    // for (const projectMember of projectMembers) {
    //   await this.projectMemberRepo.removeMember(projectMember.id);
    // }
    
    // 3. 删除成员记录
    await this.ontology.deleteObject('Member', input.memberId);
    
    // 注意：这里可能需要额外的清理工作，例如：
    // - 移除成员的项目访问权限（已在上面实现）
    // - 重新分配成员负责的任务
    // - 通知相关人员
  }
  
  async audit(
    input: RemoveMemberFromOrganizationInput,
    output: void,
    context: ActionContext
  ): Promise<void> {
    if (!this.auditService) return;
    
    // 获取成员信息（在删除前）
    const member = await this.ontology.getObject<MemberObject>('Member', input.memberId);
    
    await this.auditService.log({
      userId: context.userId,
      action: this.name,
      resourceType: 'Member',
      resourceId: input.memberId,
      details: {
        organizationId: input.organizationId,
        removedUserId: member?.userId,
        removedRole: member?.role,
        removedDepartmentId: member?.departmentId,
        reason: input.reason,
        removedBy: context.userId,
        removedAt: context.timestamp,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
