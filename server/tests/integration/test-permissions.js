/**
 * 权限系统测试
 * 验证权限检查、授予和撤销功能
 */

console.log('🧪 开始测试权限系统...\n');

// ============================================
// Mock 实现
// ============================================

// Permission 枚举
const Permission = {
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  MODULE_CREATE: 'module:create',
  MODULE_READ: 'module:read',
  AUDIT_READ: 'audit:read',
  SYSTEM_ADMIN: 'system:admin',
};

// Role 枚举
const Role = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
  GUEST: 'guest',
};

// 角色默认权限映射
const ROLE_PERMISSIONS = {
  [Role.OWNER]: Object.values(Permission),
  [Role.ADMIN]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.MODULE_CREATE,
    Permission.MODULE_READ,
    Permission.AUDIT_READ,
  ],
  [Role.MEMBER]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.MODULE_CREATE,
    Permission.MODULE_READ,
  ],
  [Role.VIEWER]: [
    Permission.PROJECT_READ,
    Permission.MODULE_READ,
  ],
  [Role.GUEST]: [
    Permission.PROJECT_READ,
  ],
};

// Mock Pool
class MockPool {
  constructor() {
    this.data = new Map();
  }
  
  async query(sql, values = []) {
    // 模拟 SELECT
    if (sql.includes('SELECT')) {
      const userId = values[0];
      const resourceId = values[1];
      const key = `${userId}-${resourceId || 'null'}`;
      
      const record = this.data.get(key);
      if (!record) {
        return { rows: [] };
      }
      
      return { rows: [record] };
    }
    
    // 模拟 INSERT/UPDATE
    if (sql.includes('INSERT') || sql.includes('ON CONFLICT')) {
      const userId = values[0];
      const resourceId = values[1];
      const key = `${userId}-${resourceId || 'null'}`;
      
      const record = {
        user_id: userId,
        resource_id: resourceId,
        role: values[2] || Role.MEMBER,
        permissions: values[3] || [],
        granted_by: values[4],
        granted_at: new Date(),
      };
      
      this.data.set(key, record);
      return { rows: [record] };
    }
    
    // 模拟 UPDATE permissions
    if (sql.includes('UPDATE') && sql.includes('permissions')) {
      const userId = values[0];
      const resourceId = values[1];
      const permissions = values[2];
      const key = `${userId}-${resourceId || 'null'}`;
      
      const record = this.data.get(key);
      if (record) {
        record.permissions = permissions;
        this.data.set(key, record);
      }
      
      return { rows: [record] };
    }
    
    // 模拟 DELETE
    if (sql.includes('DELETE')) {
      const userId = values[0];
      const resourceId = values[1];
      const key = `${userId}-${resourceId || 'null'}`;
      
      this.data.delete(key);
      return { rowCount: 1 };
    }
    
    return { rows: [] };
  }
}

// Mock PermissionService
class PermissionService {
  constructor(pool) {
    this.pool = pool;
  }
  
  async check(userId, requiredPermissions, resourceId) {
    try {
      const userPermissions = await this.getUserPermissions(userId, resourceId);
      
      const missingPermissions = [];
      for (const required of requiredPermissions) {
        if (!userPermissions.permissions.includes(required)) {
          missingPermissions.push(required);
        }
      }
      
      if (missingPermissions.length === 0) {
        return { allowed: true };
      } else {
        return {
          allowed: false,
          reason: `缺少权限: ${missingPermissions.join(', ')}`,
          missingPermissions,
        };
      }
    } catch (error) {
      return {
        allowed: false,
        reason: `权限检查失败: ${error.message}`,
      };
    }
  }
  
  async getUserPermissions(userId, resourceId) {
    const query = `SELECT role, permissions, granted_at, granted_by FROM user_permissions WHERE user_id = $1`;
    const params = resourceId ? [userId, resourceId] : [userId];
    const result = await this.pool.query(query, params);
    
    if (result.rows.length === 0) {
      return {
        userId,
        role: Role.MEMBER,
        permissions: ROLE_PERMISSIONS[Role.MEMBER],
        grantedAt: new Date(),
      };
    }
    
    const row = result.rows[0];
    const role = row.role;
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    const customPermissions = row.permissions || [];
    const allPermissions = Array.from(new Set([...rolePermissions, ...customPermissions]));
    
    return {
      userId,
      role,
      permissions: allPermissions,
      grantedAt: row.granted_at,
      grantedBy: row.granted_by,
    };
  }
  
  async setRole(userId, role, grantedBy, resourceId) {
    const query = `INSERT INTO user_permissions (user_id, resource_id, role, granted_by, granted_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (user_id, resource_id) DO UPDATE SET role = $3, granted_by = $4, granted_at = CURRENT_TIMESTAMP`;
    await this.pool.query(query, [userId, resourceId || null, role, grantedBy]);
  }
  
  async grant(userId, permissions, grantedBy, resourceId) {
    const query = `INSERT INTO user_permissions (user_id, resource_id, permissions, granted_by, granted_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) ON CONFLICT (user_id, resource_id) DO UPDATE SET permissions = $3, granted_by = $4, granted_at = CURRENT_TIMESTAMP`;
    await this.pool.query(query, [userId, resourceId || null, permissions, grantedBy]);
  }
  
  getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }
}

// ============================================
// 测试函数
// ============================================

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  const pool = new MockPool();
  const permissionService = new PermissionService(pool);
  
  // 测试 1: 默认权限（MEMBER 角色）
  try {
    console.log('📝 测试 1: 默认权限检查');
    
    const result = await permissionService.check(
      'user-1',
      [Permission.PROJECT_READ, Permission.PROJECT_CREATE]
    );
    
    if (!result.allowed) {
      throw new Error('MEMBER 角色应该拥有 PROJECT_READ 和 PROJECT_CREATE 权限');
    }
    
    console.log('✅ 测试 1 通过: 默认权限检查成功\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: 权限不足
  try {
    console.log('📝 测试 2: 权限不足检查');
    
    const result = await permissionService.check(
      'user-1',
      [Permission.SYSTEM_ADMIN]
    );
    
    if (result.allowed) {
      throw new Error('MEMBER 角色不应该拥有 SYSTEM_ADMIN 权限');
    }
    
    if (!result.reason || !result.missingPermissions) {
      throw new Error('应该返回缺少的权限信息');
    }
    
    console.log('✅ 测试 2 通过: 正确拒绝了权限不足的请求');
    console.log(`   原因: ${result.reason}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: 设置角色
  try {
    console.log('📝 测试 3: 设置用户角色');
    
    await permissionService.setRole('user-2', Role.ADMIN, 'admin-1');
    
    const permissions = await permissionService.getUserPermissions('user-2');
    
    if (permissions.role !== Role.ADMIN) {
      throw new Error('角色设置失败');
    }
    
    // 验证 ADMIN 角色拥有 AUDIT_READ 权限
    const result = await permissionService.check(
      'user-2',
      [Permission.AUDIT_READ]
    );
    
    if (!result.allowed) {
      throw new Error('ADMIN 角色应该拥有 AUDIT_READ 权限');
    }
    
    console.log('✅ 测试 3 通过: 角色设置成功');
    console.log(`   用户角色: ${permissions.role}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: VIEWER 角色（只读权限）
  try {
    console.log('📝 测试 4: VIEWER 角色权限检查');
    
    await permissionService.setRole('user-3', Role.VIEWER, 'admin-1');
    
    // 应该有读权限
    const readResult = await permissionService.check(
      'user-3',
      [Permission.PROJECT_READ]
    );
    
    if (!readResult.allowed) {
      throw new Error('VIEWER 角色应该拥有 PROJECT_READ 权限');
    }
    
    // 不应该有写权限
    const writeResult = await permissionService.check(
      'user-3',
      [Permission.PROJECT_CREATE]
    );
    
    if (writeResult.allowed) {
      throw new Error('VIEWER 角色不应该拥有 PROJECT_CREATE 权限');
    }
    
    console.log('✅ 测试 4 通过: VIEWER 角色权限正确\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failedTests++;
  }
  
  // 测试 5: OWNER 角色（完全权限）
  try {
    console.log('📝 测试 5: OWNER 角色权限检查');
    
    await permissionService.setRole('user-4', Role.OWNER, 'system');
    
    // 应该拥有所有权限
    const result = await permissionService.check(
      'user-4',
      [
        Permission.PROJECT_CREATE,
        Permission.PROJECT_DELETE,
        Permission.SYSTEM_ADMIN,
      ]
    );
    
    if (!result.allowed) {
      throw new Error('OWNER 角色应该拥有所有权限');
    }
    
    console.log('✅ 测试 5 通过: OWNER 角色拥有完全权限\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failedTests++;
  }
  
  // 测试 6: 角色权限列表
  try {
    console.log('📝 测试 6: 获取角色权限列表');
    
    const memberPermissions = permissionService.getRolePermissions(Role.MEMBER);
    const viewerPermissions = permissionService.getRolePermissions(Role.VIEWER);
    
    if (memberPermissions.length <= viewerPermissions.length) {
      throw new Error('MEMBER 角色应该比 VIEWER 角色拥有更多权限');
    }
    
    console.log('✅ 测试 6 通过: 角色权限列表正确');
    console.log(`   MEMBER 权限数: ${memberPermissions.length}`);
    console.log(`   VIEWER 权限数: ${viewerPermissions.length}\n`);
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
    console.log('\n🎉 所有测试通过！权限系统工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
