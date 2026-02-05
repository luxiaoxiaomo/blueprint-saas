/**
 * 企业版 Actions 测试
 * 验证组织和成员管理 Actions
 */

console.log('🧪 开始测试企业版 Actions...\n');

// ============================================
// Mock 实现
// ============================================

// Mock Pool
class MockPool {
  constructor() {
    this.data = {
      organizations: new Map(),
      members: new Map(),
      objects: new Map(),
      links: new Map(),
    };
    this.idCounter = 1;
  }
  
  async query(sql, values = []) {
    // 模拟 INSERT
    if (sql.includes('INSERT INTO')) {
      const id = `obj-${this.idCounter++}`;
      const obj = {
        id,
        type: values[0],
        data: values[1],
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.data.objects.set(id, obj);
      return { rows: [obj] };
    }
    
    // 模拟 SELECT
    if (sql.includes('SELECT') && sql.includes('WHERE id')) {
      const id = values[0];
      const obj = this.data.objects.get(id);
      return { rows: obj ? [obj] : [] };
    }
    
    // 模拟 UPDATE
    if (sql.includes('UPDATE')) {
      const id = values[values.length - 1];
      const obj = this.data.objects.get(id);
      if (obj) {
        obj.data = { ...obj.data, ...values[0] };
        obj.updated_at = new Date();
        return { rows: [obj] };
      }
      return { rows: [] };
    }
    
    // 模拟 DELETE
    if (sql.includes('DELETE')) {
      const id = values[0];
      this.data.objects.delete(id);
      return { rows: [] };
    }
    
    return { rows: [] };
  }
}

// Mock OntologyService
class MockOntologyService {
  constructor(pool) {
    this.pool = pool;
    this.objects = new Map();
    this.links = new Map();
    this.idCounter = 1;
  }
  
  async createObject(type, data) {
    const id = `${type.toLowerCase()}-${this.idCounter++}`;
    const obj = {
      id,
      type,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.objects.set(id, obj);
    return obj;
  }
  
  async getObject(type, id) {
    return this.objects.get(id) || null;
  }
  
  async updateObject(type, id, updates) {
    const obj = this.objects.get(id);
    if (!obj) {
      throw new Error(`Object ${type}:${id} not found`);
    }
    Object.assign(obj, updates, { updatedAt: new Date() });
    return obj;
  }
  
  async deleteObject(type, id) {
    this.objects.delete(id);
  }
  
  async createLink(sourceId, targetId, linkType, metadata) {
    const linkId = `link-${this.idCounter++}`;
    const link = {
      id: linkId,
      sourceId,
      targetId,
      linkType,
      metadata: metadata || {},
      createdAt: new Date(),
    };
    this.links.set(linkId, link);
    return link;
  }
  
  async deleteLink(sourceId, targetId, linkType) {
    for (const [id, link] of this.links.entries()) {
      if (link.sourceId === sourceId && link.targetId === targetId && link.linkType === linkType) {
        this.links.delete(id);
        return;
      }
    }
  }
}

// Mock Action 基类
class Action {
  constructor(ontology, auditService, permissionService) {
    this.ontology = ontology;
    this.auditService = auditService;
    this.permissionService = permissionService;
  }
  
  async checkPermissions(context) {
    // Mock 实现：总是通过
    return true;
  }
  
  async run(input, context) {
    await this.validate(input, context);
    const result = await this.execute(input, context);
    return result;
  }
}

// CreateOrganizationAction
class CreateOrganizationAction extends Action {
  name = 'CreateOrganization';
  
  async validate(input, context) {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('组织名称不能为空');
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
  }
  
  async execute(input, context) {
    const organization = await this.ontology.createObject('Organization', {
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
    
    await this.ontology.createObject('Member', {
      type: 'Member',
      organizationId: organization.id,
      userId: input.ownerId,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });
    
    return organization;
  }
}

// InviteMemberAction
class InviteMemberAction extends Action {
  name = 'InviteMember';
  
  async validate(input, context) {
    if (!input.organizationId) {
      throw new Error('必须指定组织ID');
    }
    
    if (!input.userId) {
      throw new Error('必须指定用户ID');
    }
    
    if (!input.invitedBy) {
      throw new Error('必须指定邀请者');
    }
    
    const organization = await this.ontology.getObject('Organization', input.organizationId);
    if (!organization) {
      throw new Error('组织不存在');
    }
  }
  
  async execute(input, context) {
    const member = await this.ontology.createObject('Member', {
      type: 'Member',
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role || 'viewer',
      status: 'invited',
      invitedBy: input.invitedBy,
      invitedAt: new Date(),
    });
    
    await this.ontology.createLink(
      input.organizationId,
      member.id,
      'Organization→Member',
      { role: input.role || 'viewer' }
    );
    
    return member;
  }
}

// UpdateMemberAction
class UpdateMemberAction extends Action {
  name = 'UpdateMember';
  
  async validate(input, context) {
    if (!input.id) {
      throw new Error('必须指定成员ID');
    }
    
    const member = await this.ontology.getObject('Member', input.id);
    if (!member) {
      throw new Error('成员不存在');
    }
  }
  
  async execute(input, context) {
    const updates = {};
    
    if (input.role !== undefined) {
      updates.role = input.role;
    }
    
    if (input.status !== undefined) {
      updates.status = input.status;
      
      if (input.status === 'active') {
        const member = await this.ontology.getObject('Member', input.id);
        if (member && !member.joinedAt) {
          updates.joinedAt = new Date();
        }
      }
    }
    
    const member = await this.ontology.updateObject('Member', input.id, updates);
    return member;
  }
}

// RemoveMemberAction
class RemoveMemberAction extends Action {
  name = 'RemoveMember';
  
  async validate(input, context) {
    if (!input.id) {
      throw new Error('必须指定成员ID');
    }
    
    if (!input.organizationId) {
      throw new Error('必须指定组织ID');
    }
    
    const member = await this.ontology.getObject('Member', input.id);
    if (!member) {
      throw new Error('成员不存在');
    }
    
    if (member.organizationId !== input.organizationId) {
      throw new Error('成员不属于该组织');
    }
    
    if (member.role === 'owner') {
      throw new Error('不能移除组织所有者');
    }
  }
  
  async execute(input, context) {
    await this.ontology.deleteObject('Member', input.id);
    await this.ontology.deleteLink(input.organizationId, input.id, 'Organization→Member');
    
    return {
      success: true,
      memberId: input.id,
    };
  }
}

// ============================================
// 测试函数
// ============================================

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  const pool = new MockPool();
  const ontology = new MockOntologyService(pool);
  const context = { userId: 'user-1' };
  
  const createOrgAction = new CreateOrganizationAction(ontology, null, null);
  const inviteMemberAction = new InviteMemberAction(ontology, null, null);
  const updateMemberAction = new UpdateMemberAction(ontology, null, null);
  const removeMemberAction = new RemoveMemberAction(ontology, null, null);
  
  // 测试 1: 创建组织
  try {
    console.log('📝 测试 1: CreateOrganizationAction - 创建组织');
    
    const org = await createOrgAction.run({
      name: 'Acme Corporation',
      identifier: 'acme-corp',
      description: '一家科技公司',
      plan: 'professional',
      ownerId: 'user-1',
    }, context);
    
    if (!org.id) throw new Error('组织应该有 ID');
    if (org.name !== 'Acme Corporation') throw new Error('组织名称不匹配');
    if (org.plan !== 'professional') throw new Error('套餐类型不匹配');
    if (org.settings.maxMembers !== 100) throw new Error('maxMembers 应该是 100');
    
    console.log('✅ 测试 1 通过: 组织创建成功');
    console.log(`   组织ID: ${org.id}`);
    console.log(`   套餐: ${org.plan}`);
    console.log(`   最大成员数: ${org.settings.maxMembers}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: 验证输入 - 空名称
  try {
    console.log('📝 测试 2: CreateOrganizationAction - 拒绝空名称');
    
    try {
      await createOrgAction.run({
        name: '',
        identifier: 'test',
        ownerId: 'user-1',
      }, context);
      throw new Error('应该抛出错误');
    } catch (error) {
      if (error.message !== '组织名称不能为空') {
        throw error;
      }
    }
    
    console.log('✅ 测试 2 通过: 正确拒绝空名称\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: 验证输入 - 无效标识符
  try {
    console.log('📝 测试 3: CreateOrganizationAction - 拒绝无效标识符');
    
    try {
      await createOrgAction.run({
        name: 'Test Org',
        identifier: 'Test_Org!',
        ownerId: 'user-1',
      }, context);
      throw new Error('应该抛出错误');
    } catch (error) {
      if (!error.message.includes('标识符只能包含')) {
        throw error;
      }
    }
    
    console.log('✅ 测试 3 通过: 正确拒绝无效标识符\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: 邀请成员
  try {
    console.log('📝 测试 4: InviteMemberAction - 邀请成员');
    
    const org = await createOrgAction.run({
      name: 'Tech Startup',
      identifier: 'tech-startup',
      plan: 'free',
      ownerId: 'user-1',
    }, context);
    
    const member = await inviteMemberAction.run({
      organizationId: org.id,
      userId: 'user-2',
      role: 'developer',
      invitedBy: 'user-1',
    }, context);
    
    if (!member.id) throw new Error('成员应该有 ID');
    if (member.role !== 'developer') throw new Error('角色不匹配');
    if (member.status !== 'invited') throw new Error('状态应该是 invited');
    
    console.log('✅ 测试 4 通过: 成员邀请成功');
    console.log(`   成员ID: ${member.id}`);
    console.log(`   角色: ${member.role}`);
    console.log(`   状态: ${member.status}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failedTests++;
  }
  
  // 测试 5: 更新成员角色
  try {
    console.log('📝 测试 5: UpdateMemberAction - 更新成员角色');
    
    const org = await createOrgAction.run({
      name: 'Update Test Org',
      identifier: 'update-test',
      plan: 'free',
      ownerId: 'user-1',
    }, context);
    
    const member = await inviteMemberAction.run({
      organizationId: org.id,
      userId: 'user-3',
      role: 'viewer',
      invitedBy: 'user-1',
    }, context);
    
    const updated = await updateMemberAction.run({
      id: member.id,
      role: 'admin',
    }, context);
    
    if (updated.role !== 'admin') throw new Error('角色更新失败');
    
    console.log('✅ 测试 5 通过: 成员角色更新成功');
    console.log(`   新角色: ${updated.role}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failedTests++;
  }
  
  // 测试 6: 接受邀请
  try {
    console.log('📝 测试 6: UpdateMemberAction - 接受邀请');
    
    const org = await createOrgAction.run({
      name: 'Accept Test Org',
      identifier: 'accept-test',
      plan: 'free',
      ownerId: 'user-1',
    }, context);
    
    const member = await inviteMemberAction.run({
      organizationId: org.id,
      userId: 'user-4',
      role: 'developer',
      invitedBy: 'user-1',
    }, context);
    
    const accepted = await updateMemberAction.run({
      id: member.id,
      status: 'active',
    }, context);
    
    if (accepted.status !== 'active') throw new Error('状态更新失败');
    if (!accepted.joinedAt) throw new Error('应该设置 joinedAt');
    
    console.log('✅ 测试 6 通过: 邀请接受成功');
    console.log(`   状态: ${accepted.status}`);
    console.log(`   加入时间: ${accepted.joinedAt}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 6 失败:', error.message);
    failedTests++;
  }
  
  // 测试 7: 移除成员
  try {
    console.log('📝 测试 7: RemoveMemberAction - 移除成员');
    
    const org = await createOrgAction.run({
      name: 'Remove Test Org',
      identifier: 'remove-test',
      plan: 'free',
      ownerId: 'user-1',
    }, context);
    
    const member = await inviteMemberAction.run({
      organizationId: org.id,
      userId: 'user-5',
      role: 'viewer',
      invitedBy: 'user-1',
    }, context);
    
    const result = await removeMemberAction.run({
      id: member.id,
      organizationId: org.id,
    }, context);
    
    if (!result.success) throw new Error('移除失败');
    if (result.memberId !== member.id) throw new Error('成员ID不匹配');
    
    console.log('✅ 测试 7 通过: 成员移除成功');
    console.log(`   成员ID: ${result.memberId}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 7 失败:', error.message);
    failedTests++;
  }
  
  // 测试 8: 不能移除所有者
  try {
    console.log('📝 测试 8: RemoveMemberAction - 不能移除所有者');
    
    const org = await createOrgAction.run({
      name: 'Owner Test Org',
      identifier: 'owner-test',
      plan: 'free',
      ownerId: 'user-1',
    }, context);
    
    // 找到所有者成员
    const ownerMember = Array.from(ontology.objects.values())
      .find(obj => obj.type === 'Member' && obj.organizationId === org.id && obj.role === 'owner');
    
    try {
      await removeMemberAction.run({
        id: ownerMember.id,
        organizationId: org.id,
      }, context);
      throw new Error('应该抛出错误');
    } catch (error) {
      if (error.message !== '不能移除组织所有者') {
        throw error;
      }
    }
    
    console.log('✅ 测试 8 通过: 正确阻止移除所有者\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 8 失败:', error.message);
    failedTests++;
  }
  
  // 测试总结
  console.log('='.repeat(50));
  console.log('📊 测试总结');
  console.log('='.repeat(50));
  console.log(`✅ 通过: ${passedTests} 个测试`);
  console.log(`❌ 失败: ${failedTests} 个测试`);
  console.log(`📈 成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  if (failedTests === 0) {
    console.log('\n🎉 所有测试通过！企业版 Actions 工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
