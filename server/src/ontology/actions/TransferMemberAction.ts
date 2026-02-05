/**
 * TransferMemberAction - 转移成员到另一个部门
 * 这个 Action 确保成员只属于一个部门（唯一性约束）
 */

import { Action } from '../Action.js';
import { ActionContext, MemberObject, Permission } from '../types.js';

/**
 * 转移成员的输入
 */
export interface TransferMemberInput {
  memberId: string;
  fromDepartmentId: string | null;
  toDepartmentId: string;
  organizationId: string;
  reason?: string; // 转移原因（可选）
}

/**
 * 转移成员 Action
 */
export class TransferMemberAction extends Action<TransferMemberInput, MemberObject> {
  name = 'TransferMember';
  description = '转移成员到另一个部门';
  permissions = [Permission.SYSTEM_ADMIN]; // 需要管理员权限
  
  async validate(input: TransferMemberInput, context: ActionContext): Promise<void> {
    // 1. 验证输入
    if (!input.memberId) {
      throw new Error('成员 ID 不能为空');
    }
    
    if (!input.toDepartmentId) {
      throw new Error('目标部门 ID 不能为空');
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
    
    // 5. 验证当前部门匹配
    if (member.departmentId !== input.fromDepartmentId) {
      throw new Error(
        `成员当前部门 (${member.departmentId}) 与指定的源部门 (${input.fromDepartmentId}) 不匹配`
      );
    }
    
    // 6. 验证目标部门存在且属于同一组织
    const toDepartment = await this.ontology.getObject('Department', input.toDepartmentId);
    if (!toDepartment) {
      throw new Error(`目标部门 ${input.toDepartmentId} 不存在`);
    }
    
    if ((toDepartment as any).organizationId !== input.organizationId) {
      throw new Error('目标部门不属于指定组织');
    }
    
    // 7. 验证不是转移到同一个部门
    if (input.fromDepartmentId === input.toDepartmentId) {
      throw new Error('不能转移到同一个部门');
    }
  }
  
  async execute(input: TransferMemberInput, context: ActionContext): Promise<MemberObject> {
    // 转移成员到新部门
    const updatedMember = await this.ontology.updateObject<MemberObject>(
      'Member',
      input.memberId,
      {
        departmentId: input.toDepartmentId,
      }
    );
    
    return updatedMember;
  }
  
  async audit(
    input: TransferMemberInput,
    output: MemberObject,
    context: ActionContext
  ): Promise<void> {
    if (!this.auditService) return;
    
    await this.auditService.log({
      userId: context.userId,
      action: this.name,
      resourceType: 'Member',
      resourceId: input.memberId,
      details: {
        organizationId: input.organizationId,
        fromDepartmentId: input.fromDepartmentId,
        toDepartmentId: input.toDepartmentId,
        reason: input.reason,
        transferredBy: context.userId,
        transferredAt: context.timestamp,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
