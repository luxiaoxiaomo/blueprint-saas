/**
 * UpdateMemberAction - 更新成员信息
 */

import { Action } from '../Action.js';
import { ActionContext, MemberObject, Permission } from '../types.js';

/**
 * 更新成员的输入
 */
export interface UpdateMemberInput {
  id: string;
  role?: 'owner' | 'admin' | 'architect' | 'developer' | 'viewer';
  status?: 'invited' | 'active' | 'suspended';
  departmentId?: string;
}

/**
 * 更新成员 Action
 */
export class UpdateMemberAction extends Action<UpdateMemberInput, MemberObject> {
  name = 'UpdateMember';
  description = '更新成员信息';
  permissions = [Permission.SYSTEM_ADMIN];
  
  async validate(input: UpdateMemberInput, context: ActionContext): Promise<void> {
    // 1. 验证输入
    if (!input.id) {
      throw new Error('必须指定成员ID');
    }
    
    // 2. 检查权限
    await this.checkPermissions(context);
    
    // 3. 验证成员存在
    const member = await this.ontology.getObject('Member', input.id);
    if (!member) {
      throw new Error('成员不存在');
    }
    
    // 4. 如果更新部门，验证部门存在
    if (input.departmentId) {
      const department = await this.ontology.getObject('Department', input.departmentId);
      if (!department) {
        throw new Error('部门不存在');
      }
    }
  }
  
  async execute(input: UpdateMemberInput, context: ActionContext): Promise<MemberObject> {
    // 准备更新数据
    const updates: any = {};
    
    if (input.role !== undefined) {
      updates.role = input.role;
    }
    
    if (input.status !== undefined) {
      updates.status = input.status;
      
      // 如果状态变为 active，设置 joinedAt
      if (input.status === 'active') {
        const member = await this.ontology.getObject<any>('Member', input.id);
        if (member && !member.joinedAt) {
          updates.joinedAt = new Date();
        }
      }
    }
    
    if (input.departmentId !== undefined) {
      updates.departmentId = input.departmentId;
    }
    
    // 更新成员
    const member = await this.ontology.updateObject<MemberObject>('Member', input.id, updates);
    
    return member;
  }
}
