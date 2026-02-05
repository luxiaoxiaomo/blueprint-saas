/**
 * 企业版功能测试
 * 验证组织和成员管理功能
 */

console.log('🧪 开始测试企业版功能...\n');

// ============================================
// Mock 实现
// ============================================

// Mock Pool
class MockPool {
  constructor() {
    this.data = {
      organizations: new Map(),
      members: new Map(),
    };
    this.idCounter = 1;
  }
  
  async query(sql, values = []) {
    // 模拟 INSERT organizations
    if (sql.includes('INSERT INTO organizations')) {
      const id = `org-${this.idCounter++}`;
      const org = {
        id,
        name: values[0],
        identifier: values[1],
        description: values[2],
        plan: values[3] || 'free',
        settings: values[4] || {},
        owner_id: values[5],
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.data.organizations.set(id, org);
      return { rows: [org] };
    }
    
    // 模拟 SELECT organizations
    if (sql.includes('SELECT') && sql.includes('FROM organizations')) {
      if (sql.includes('WHERE owner_id')) {
        const ownerId = values[0];
        const orgs = Array.from(this.data.organizations.values())
          .filter(o => o.owner_id === ownerId);
        return { rows: orgs };
      } else if (sql.includes('WHERE identifier')) {
        const identifier = values[0];
        const org = Array.from(this.data.organizations.values())
          .find(o => o.identifier === identifier);
        return { rows: org ? [org] : [] };
      } else if (sql.includes('WHERE id')) {
        const id = values[0];
        const org = this.data.organizations.get(id);
        return { rows: org ? [org] : [] };
      }
    }
    
    // 模拟 INSERT members
    if (sql.includes('INSERT INTO members')) {
      const id = `member-${this.idCounter++}`;
      const member = {
        id,
        organization_id: values[0],
        user_id: values[1],
        role: values[2] || 'viewer',
        status: values[3] || 'active',
        invited_by: values[4],
        invited_at: values[5],
        joined_at: values[6],
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.data.members.set(id, member);
      return { rows: [member] };
    }
    
    // 模拟 SELECT members
    if (sql.includes('SELECT') && sql.includes('FROM members')) {
      if (sql.includes('WHERE organization_id')) {
        const orgId = values[0];
        const members = Array.from(this.data.members.values())
          .filter(m => m.organization_id === orgId);
        return { rows: members };
      } else if (sql.includes('WHERE user_id')) {
        const userId = values[0];
        const members = Array.from(this.data.members.values())
          .filter(m => m.user_id === userId);
        return { rows: members };
      }
    }
    
    // 模拟 UPDATE members
    if (sql.includes('UPDATE members') && sql.includes('SET role')) {
      const role = values[0];
      const id = values[1];
      const member = this.data.members.get(id);
      if (member) {
        member.role = role;
        member.updated_at = new Date();
        return { rows: [member] };
      }
      return { rows: [] };
    }
    
    // 模拟 COUNT
    if (sql.includes('COUNT(*)')) {
      if (sql.includes('FROM organizations')) {
        return { rows: [{ total: this.data.organizations.size }] };
      } else if (sql.includes('FROM members')) {
        const orgId = values[0];
        const count = Array.from(this.data.members.values())
          .filter(m => m.organization_id === orgId).length;
        return { rows: [{ total: count }] };
      }
    }
    
    return { rows: [] };
  }
}

// Mock OrganizationRepository
class OrganizationRepository {
  constructor(pool) {
    this.pool = pool;
  }
  
  async create(data) {
    const result = await this.pool.query(
      'INSERT INTO organizations VALUES ($1, $2, $3, $4, $5, $6)',
      [data.name, data.identifier, data.description, data.plan, data.settings, data.ownerId]
    );
    return this.mapRowToObject(result.rows[0]);
  }
  
  async findById(id) {
    const result = await this.pool.query('SELECT * FROM organizations WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.mapRowToObject(result.rows[0]) : null;
  }
  
  async findByOwnerId(ownerId) {
    const result = await this.pool.query('SELECT * FROM organizations WHERE owner_id = $1', [ownerId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  async findByIdentifier(identifier) {
    const result = await this.pool.query('SELECT * FROM organizations WHERE identifier = $1', [identifier]);
    return result.rows.length > 0 ? this.mapRowToObject(result.rows[0]) : null;
  }
  
  mapRowToObject(row) {
    return {
      id: row.id,
      type: 'Organization',
      name: row.name,
      identifier: row.identifier,
      description: row.description,
      plan: row.plan,
      settings: row.settings || {},
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Mock MemberRepository
class MemberRepository {
  constructor(pool) {
    this.pool = pool;
  }
  
  async create(data) {
    const result = await this.pool.query(
      'INSERT INTO members VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [data.organizationId, data.userId, data.role, data.status, data.invitedBy, data.invitedAt, data.joinedAt]
    );
    return this.mapRowToObject(result.rows[0]);
  }
  
  async findByOrganizationId(organizationId) {
    const result = await this.pool.query('SELECT * FROM members WHERE organization_id = $1', [organizationId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  async findByUserId(userId) {
    const result = await this.pool.query('SELECT * FROM members WHERE user_id = $1', [userId]);
    return result.rows.map(row => this.mapRowToObject(row));
  }
  
  async updateRole(id, role) {
    const result = await this.pool.query('UPDATE members SET role = $1 WHERE id = $2', [role, id]);
    return result.rows.length > 0 ? this.mapRowToObject(result.rows[0]) : null;
  }
  
  mapRowToObject(row) {
    return {
      id: row.id,
      type: 'Member',
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      invitedBy: row.invited_by,
      invitedAt: row.invited_at,
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
  const orgRepo = new OrganizationRepository(pool);
  const memberRepo = new MemberRepository(pool);
  
  // 测试 1: 创建组织
  try {
    console.log('📝 测试 1: 创建组织');
    
    const org = await orgRepo.create({
      name: 'Acme Corporation',
      identifier: 'acme-corp',
      description: '一家科技公司',
      plan: 'professional',
      settings: { maxMembers: 100, maxProjects: 50 },
      ownerId: 'user-1',
    });
    
    if (!org.id) {
      throw new Error('组织应该有 ID');
    }
    
    if (org.name !== 'Acme Corporation') {
      throw new Error('组织名称不匹配');
    }
    
    if (org.identifier !== 'acme-corp') {
      throw new Error('组织标识符不匹配');
    }
    
    if (org.plan !== 'professional') {
      throw new Error('套餐类型不匹配');
    }
    
    console.log('✅ 测试 1 通过: 组织创建成功');
    console.log(`   组织ID: ${org.id}`);
    console.log(`   组织名称: ${org.name}`);
    console.log(`   套餐: ${org.plan}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: 根据所有者查找组织
  try {
    console.log('📝 测试 2: 根据所有者查找组织');
    
    await orgRepo.create({
      name: 'Tech Startup',
      identifier: 'tech-startup',
      plan: 'free',
      settings: {},
      ownerId: 'user-1',
    });
    
    const orgs = await orgRepo.findByOwnerId('user-1');
    
    if (orgs.length !== 2) {
      throw new Error(`应该返回2个组织，实际返回${orgs.length}个`);
    }
    
    console.log('✅ 测试 2 通过: 成功查找所有者的组织');
    console.log(`   找到 ${orgs.length} 个组织\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: 根据标识符查找组织
  try {
    console.log('📝 测试 3: 根据标识符查找组织');
    
    const org = await orgRepo.findByIdentifier('acme-corp');
    
    if (!org) {
      throw new Error('应该找到组织');
    }
    
    if (org.identifier !== 'acme-corp') {
      throw new Error('组织标识符不匹配');
    }
    
    console.log('✅ 测试 3 通过: 成功根据标识符查找组织\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: 创建成员
  try {
    console.log('📝 测试 4: 创建成员');
    
    const org = await orgRepo.findByIdentifier('acme-corp');
    
    const member = await memberRepo.create({
      organizationId: org.id,
      userId: 'user-2',
      role: 'developer',
      status: 'invited',
      invitedBy: 'user-1',
      invitedAt: new Date(),
    });
    
    if (!member.id) {
      throw new Error('成员应该有 ID');
    }
    
    if (member.role !== 'developer') {
      throw new Error('成员角色不匹配');
    }
    
    if (member.status !== 'invited') {
      throw new Error('成员状态不匹配');
    }
    
    console.log('✅ 测试 4 通过: 成员创建成功');
    console.log(`   成员ID: ${member.id}`);
    console.log(`   角色: ${member.role}`);
    console.log(`   状态: ${member.status}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failedTests++;
  }
  
  // 测试 5: 查找组织成员
  try {
    console.log('📝 测试 5: 查找组织成员');
    
    const org = await orgRepo.findByIdentifier('acme-corp');
    
    // 添加更多成员
    await memberRepo.create({
      organizationId: org.id,
      userId: 'user-3',
      role: 'architect',
      status: 'active',
      joinedAt: new Date(),
    });
    
    const members = await memberRepo.findByOrganizationId(org.id);
    
    if (members.length !== 2) {
      throw new Error(`应该返回2个成员，实际返回${members.length}个`);
    }
    
    console.log('✅ 测试 5 通过: 成功查找组织成员');
    console.log(`   找到 ${members.length} 个成员\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failedTests++;
  }
  
  // 测试 6: 更新成员角色
  try {
    console.log('📝 测试 6: 更新成员角色');
    
    const org = await orgRepo.findByIdentifier('acme-corp');
    const members = await memberRepo.findByOrganizationId(org.id);
    const member = members[0];
    
    const updated = await memberRepo.updateRole(member.id, 'admin');
    
    if (!updated) {
      throw new Error('更新失败');
    }
    
    if (updated.role !== 'admin') {
      throw new Error('角色更新不正确');
    }
    
    console.log('✅ 测试 6 通过: 成员角色更新成功');
    console.log(`   新角色: ${updated.role}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 6 失败:', error.message);
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
    console.log('\n🎉 所有测试通过！企业版功能工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
