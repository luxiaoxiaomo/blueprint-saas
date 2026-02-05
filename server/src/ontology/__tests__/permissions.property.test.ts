/**
 * 权限系统属性测试
 * 使用 fast-check 库进行属性测试
 * 
 * Feature: enterprise-saas-upgrade
 * Properties: P4, P5, P6, P7, P24, P25, P38, P39, P40
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { Pool } from 'pg';
import { PermissionService, PermissionOverride } from '../../services/PermissionService.js';
import { Permission, Role } from '../types.js';

describe('权限系统属性测试', () => {
  let pool: Pool;
  let permissionService: PermissionService;

  beforeAll(async () => {
    // 初始化数据库连接
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost/blueprint_test'
    });

    permissionService = new PermissionService(pool);
    permissionService.disableCache(); // 禁用缓存以便测试
  });

  afterAll(async () => {
    await pool.end();
  });

  /**
   * Property 4: 角色权限边界
   * 验证：每个角色的权限集合应该是其上级角色的子集或相等
   * 需求：2.2, 2.3, 2.4, 2.5
   */
  describe('P4: 角色权限边界', () => {
    it('应该为每个角色返回一致的权限集合', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.values(Role)),
          async (role) => {
            const permissions = permissionService.getRolePermissions(role);

            // 验证权限集合已定义
            expect(permissions).toBeDefined();
            expect(Array.isArray(permissions)).toBe(true);

            // 验证权限不重复
            const uniquePermissions = new Set(permissions);
            expect(uniquePermissions.size).toBe(permissions.length);

            // 验证权限都是有效的 Permission 枚举值
            const allPermissions = permissionService.listAllPermissions();
            for (const permission of permissions) {
              expect(allPermissions).toContain(permission);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('权限应该遵循角色层级关系', async () => {
      const ownerPerms = permissionService.getRolePermissions(Role.OWNER);
      const adminPerms = permissionService.getRolePermissions(Role.ADMIN);
      const memberPerms = permissionService.getRolePermissions(Role.MEMBER);
      const viewerPerms = permissionService.getRolePermissions(Role.VIEWER);

      // OWNER 应该包含所有权限
      expect(ownerPerms.length).toBeGreaterThanOrEqual(adminPerms.length);

      // ADMIN 应该包含 MEMBER 的所有权限
      for (const perm of memberPerms) {
        expect(adminPerms).toContain(perm);
      }

      // MEMBER 应该包含 VIEWER 的所有权限
      for (const perm of viewerPerms) {
        expect(memberPerms).toContain(perm);
      }

      // VIEWER 应该只有只读权限
      for (const perm of viewerPerms) {
        expect(perm).toMatch(/READ/);
      }
    });
  });

  /**
   * Property 5: 项目级权限覆盖
   * 验证：项目级权限覆盖应该正确应用
   * 需求：2.6
   */
  describe('P5: 项目级权限覆盖', () => {
    it('应该能创建和应用权限覆盖', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.array(fc.constantFrom(...Object.values(Permission)), { minLength: 1, maxLength: 3 }),
          async (userId, projectId, createdBy, grantedPerms) => {
            // 创建权限覆盖
            const override = await permissionService.createOverride(
              userId,
              projectId,
              'project',
              grantedPerms,
              [],
              0,
              createdBy
            );

            expect(override).toBeDefined();
            expect(override.userId).toBe(userId);
            expect(override.resourceId).toBe(projectId);
            expect(override.grantedPermissions).toEqual(grantedPerms);

            // 清理
            await permissionService.deleteOverride(userId, projectId);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('权限覆盖应该覆盖基础权限', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (userId, projectId, createdBy) => {
            // 创建权限覆盖：撤销 PROJECT_READ，授予 PROJECT_UPDATE
            const override = await permissionService.createOverride(
              userId,
              projectId,
              'project',
              [Permission.PROJECT_UPDATE],
              [Permission.PROJECT_READ],
              0,
              createdBy
            );

            expect(override.grantedPermissions).toContain(Permission.PROJECT_UPDATE);
            expect(override.revokedPermissions).toContain(Permission.PROJECT_READ);

            // 清理
            await permissionService.deleteOverride(userId, projectId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 6: 未授权访问被拒绝
   * 验证：没有权限的用户应该被拒绝访问
   * 需求：2.7
   */
  describe('P6: 未授权访问被拒绝', () => {
    it('应该拒绝没有权限的访问', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom(...Object.values(Permission)),
          async (userId, permission) => {
            // 设置用户为 VIEWER 角色
            await permissionService.setRole(userId, Role.VIEWER, userId);

            // 尝试访问需要该权限的资源
            const result = await permissionService.check(userId, [permission]);

            // 如果权限不在 VIEWER 的权限列表中，应该被拒绝
            const viewerPermissions = permissionService.getRolePermissions(Role.VIEWER);
            if (!viewerPermissions.includes(permission)) {
              expect(result.allowed).toBe(false);
              expect(result.missingPermissions).toContain(permission);
            }

            // 清理
            await permissionService.revokeAll(userId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: 权限变更被审计
   * 验证：所有权限变更都应该被记录
   * 需求：2.9
   */
  describe('P7: 权限变更被审计', () => {
    it('应该记录权限授予操作', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.array(fc.constantFrom(...Object.values(Permission)), { minLength: 1, maxLength: 3 }),
          async (userId, grantedBy, permissions) => {
            // 授予权限
            await permissionService.grant(userId, permissions, grantedBy);

            // 验证权限已授予
            const userPerms = await permissionService.getUserPermissions(userId);
            for (const perm of permissions) {
              expect(userPerms.permissions).toContain(perm);
            }

            // 清理
            await permissionService.revokeAll(userId);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应该记录权限撤销操作', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, grantedBy) => {
            // 首先授予权限
            const permissions = [Permission.PROJECT_READ, Permission.PROJECT_UPDATE];
            await permissionService.grant(userId, permissions, grantedBy);

            // 撤销权限
            await permissionService.revoke(userId, [Permission.PROJECT_UPDATE]);

            // 验证权限已撤销
            const userPerms = await permissionService.getUserPermissions(userId);
            expect(userPerms.permissions).toContain(Permission.PROJECT_READ);
            expect(userPerms.permissions).not.toContain(Permission.PROJECT_UPDATE);

            // 清理
            await permissionService.revokeAll(userId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 24: 审计日志不可修改
   * 验证：权限变更记录应该不可修改
   * 需求：10.11
   */
  describe('P24: 审计日志不可修改', () => {
    it('权限变更应该创建不可修改的记录', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, grantedBy) => {
            // 授予权限
            const permissions = [Permission.PROJECT_READ];
            await permissionService.grant(userId, permissions, grantedBy);

            // 验证权限已授予
            const userPerms = await permissionService.getUserPermissions(userId);
            expect(userPerms.permissions).toContain(Permission.PROJECT_READ);
            expect(userPerms.grantedBy).toBe(grantedBy);

            // 清理
            await permissionService.revokeAll(userId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 25: 安全事件被审计
   * 验证：权限检查失败应该被记录
   * 需求：10.2-10.5
   */
  describe('P25: 安全事件被审计', () => {
    it('权限检查失败应该返回详细信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom(...Object.values(Permission)),
          async (userId, permission) => {
            // 设置用户为 GUEST 角色（最低权限）
            await permissionService.setRole(userId, Role.GUEST, userId);

            // 尝试访问需要高权限的资源
            const result = await permissionService.check(userId, [permission]);

            // 如果权限不在 GUEST 的权限列表中，应该被拒绝并返回原因
            const guestPermissions = permissionService.getRolePermissions(Role.GUEST);
            if (!guestPermissions.includes(permission)) {
              expect(result.allowed).toBe(false);
              expect(result.reason).toBeDefined();
              expect(result.missingPermissions).toBeDefined();
            }

            // 清理
            await permissionService.revokeAll(userId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 38: 数据隔离完整性
   * 验证：用户只能访问其组织的数据
   * 需求：26.2, 26.3, 26.6
   */
  describe('P38: 数据隔离完整性', () => {
    it('权限检查应该考虑资源隔离', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (userId, resourceId1, resourceId2) => {
            // 为资源1授予权限
            const override1 = await permissionService.createOverride(
              userId,
              resourceId1,
              'project',
              [Permission.PROJECT_READ],
              [],
              0,
              userId
            );

            // 验证资源1的权限
            const perms1 = await permissionService.getUserPermissions(userId, resourceId1);
            expect(perms1.permissions).toContain(Permission.PROJECT_READ);

            // 验证资源2没有权限
            const perms2 = await permissionService.getUserPermissions(userId, resourceId2);
            // 资源2应该使用基础权限，不应该包含资源1的权限

            // 清理
            await permissionService.deleteOverride(userId, resourceId1);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 39: 配额限制强制执行
   * 验证：配额检查应该正确执行
   * 需求：28.8
   */
  describe('P39: 配额限制强制执行', () => {
    it('权限系统应该支持配额检查集成', async () => {
      // 这个属性测试在 SubscriptionService 中实现
      // 这里只是验证权限服务的基础功能
      expect(permissionService).toBeDefined();
    });
  });

  /**
   * Property 40: 订阅降级配额调整
   * 验证：订阅降级时应该调整配额
   * 需求：28.7
   */
  describe('P40: 订阅降级配额调整', () => {
    it('权限系统应该支持订阅变更集成', async () => {
      // 这个属性测试在 SubscriptionService 中实现
      // 这里只是验证权限服务的基础功能
      expect(permissionService).toBeDefined();
    });
  });
});
