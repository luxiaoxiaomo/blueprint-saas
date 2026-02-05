/**
 * AssignMemberToDepartmentAction - 分配成员到部门
 */

import { Action } from '../Action.js';
import { ActionContext, MemberObject, Permission } from '../types.js';

/**
 * 分配成员到部门的输入
 */
export interface AssignMemberToDepartmentInput {
  memberId: string;
  departmentId: string | null; // null 表示移除部门分配
  organizationId: string;
}

/**
 * 分配成员到部门 Action
 */
export class AssignMemberToDepartmentAction extends Action<
  AssignMemberToDepartmentInput,
  MemberObject
> {
  name = 'AssignMemberToDepartment';
  description = '分配成员到部门';
  permissions = [Permission.SYSTEM_ADMIN]; // 需要管理员权限
  
  async validate(input: AssignMemberToDepartmentInput, context: ActionContext): Promise<void> {
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
    
    // 5. 如果指定了部门，验证部门存在且属于同一组织
    if (input.departmentId) {
      const department = await this.ontology.getObject('Department', input.departmentId);
      if (!department) {
        throw new Error(`部门 ${input.departmentId} 不存在`);
      }
      
      if ((department as any).organizationId !== input.organizationId) {
        throw new Error('部门不属于指定组织');
      }
    }
  }
  
  async execute(
    input: AssignMemberToDepartmentInput,
    context: ActionContext
  ): Promise<MemberObject> {
    // 更新成员的部门分配
    const updatedMember = await this.ontology.updateObject<MemberObject>(
      'Member',
      input.memberId,
      {
        departmentId: input.departmentId || undefined,
      }
    );
    
    return updatedMember;
  }
  
  async audit(
    input: AssignMemberToDepartmentInput,
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
        departmentId: input.departmentId,
        previousDepartmentId: output.departmentId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
}
