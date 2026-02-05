/**
 * 订阅系统属性测试
 * 使用 fast-check 库进行属性测试
 * 
 * Feature: enterprise-saas-upgrade
 * Properties: P39, P40
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { Pool } from 'pg';
import { SubscriptionService, SubscriptionTier, QuotaResource } from '../SubscriptionService.js';

describe('订阅系统属性测试', () => {
  let pool: Pool;
  let subscriptionService: SubscriptionService;

  beforeAll(async () => {
    // 初始化数据库连接
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost/blueprint_test'
    });

    subscriptionService = new SubscriptionService(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  /**
   * Property 39: 配额限制强制执行
   * 验证：配额检查应该正确执行
   * 需求：28.8
   */
  describe('P39: 配额限制强制执行', () => {
    it('应该正确检查配额限制', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('free', 'professional', 'enterprise') as fc.Arbitrary<SubscriptionTier>,
          async (organizationId, tier) => {
            // 创建订阅
            const subscription = await subscriptionService.createSubscription(organizationId, tier);
            expect(subscription).toBeDefined();

            // 获取配额
            const quotas = await subscriptionService.getAllQuotas(subscription.id);
            expect(quotas.length).toBeGreaterThan(0);

            // 验证配额限制
            for (const quota of quotas) {
              if (tier === 'free') {
                // free 等级应该有限制
                expect(quota.limitValue).toBeGreaterThan(0);
              } else if (tier === 'enterprise') {
                // enterprise 等级应该是无限的
                expect(quota.limitValue).toBe(-1);
              }
            }

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('应该拒绝超过配额的操作', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (organizationId) => {
            // 创建 free 等级的订阅
            const subscription = await subscriptionService.createSubscription(organizationId, 'free');

            // 获取 projects 配额
            const quota = await subscriptionService.getQuota(subscription.id, 'projects');
            expect(quota).toBeDefined();
            expect(quota!.limitValue).toBe(3); // free 等级限制为 3 个项目

            // 尝试创建超过限制的项目
            const canCreate = await subscriptionService.checkQuota(subscription.id, 'projects', 1);
            expect(canCreate).toBe(true);

            // 更新使用量到接近限制
            await subscriptionService.updateQuotaUsage(subscription.id, 'projects', 3, 'increment');

            // 再次尝试创建应该失败
            const canCreateAgain = await subscriptionService.checkQuota(subscription.id, 'projects', 1);
            expect(canCreateAgain).toBe(false);

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('无限配额应该总是返回 true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (organizationId) => {
            // 创建 enterprise 等级的订阅
            const subscription = await subscriptionService.createSubscription(organizationId, 'enterprise');

            // 获取 projects 配额
            const quota = await subscriptionService.getQuota(subscription.id, 'projects');
            expect(quota).toBeDefined();
            expect(quota!.limitValue).toBe(-1); // enterprise 等级无限

            // 检查配额应该总是返回 true
            const canCreate1 = await subscriptionService.checkQuota(subscription.id, 'projects', 1);
            expect(canCreate1).toBe(true);

            const canCreate1000 = await subscriptionService.checkQuota(subscription.id, 'projects', 1000);
            expect(canCreate1000).toBe(true);

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 40: 订阅降级配额调整
   * 验证：订阅降级时应该调整配额
   * 需求：28.7
   */
  describe('P40: 订阅降级配额调整', () => {
    it('升级订阅应该增加配额', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (organizationId) => {
            // 创建 free 等级的订阅
            const subscription = await subscriptionService.createSubscription(organizationId, 'free');
            const freeQuota = await subscriptionService.getQuota(subscription.id, 'projects');
            expect(freeQuota!.limitValue).toBe(3);

            // 升级到 professional
            const upgraded = await subscriptionService.upgradeSubscription(organizationId, 'professional');
            expect(upgraded.tier).toBe('professional');

            // 验证配额已更新
            const proQuota = await subscriptionService.getQuota(upgraded.id, 'projects');
            expect(proQuota!.limitValue).toBe(50);
            expect(proQuota!.limitValue).toBeGreaterThan(freeQuota!.limitValue);

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('降级订阅应该减少配额', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (organizationId) => {
            // 创建 professional 等级的订阅
            const subscription = await subscriptionService.createSubscription(organizationId, 'professional');
            const proQuota = await subscriptionService.getQuota(subscription.id, 'projects');
            expect(proQuota!.limitValue).toBe(50);

            // 降级到 free
            const downgraded = await subscriptionService.downgradeSubscription(organizationId, 'free');
            expect(downgraded.tier).toBe('free');

            // 验证配额已更新
            const freeQuota = await subscriptionService.getQuota(downgraded.id, 'projects');
            expect(freeQuota!.limitValue).toBe(3);
            expect(freeQuota!.limitValue).toBeLessThan(proQuota!.limitValue);

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('降级时应该验证使用量不超过新限制', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (organizationId) => {
            // 创建 professional 等级的订阅
            const subscription = await subscriptionService.createSubscription(organizationId, 'professional');

            // 更新使用量到 10 个项目
            await subscriptionService.updateQuotaUsage(subscription.id, 'projects', 10, 'increment');

            // 尝试降级到 free（限制为 3）应该失败
            try {
              await subscriptionService.downgradeSubscription(organizationId, 'free');
              expect.fail('应该抛出错误');
            } catch (error) {
              expect((error as Error).message).toContain('无法降级');
            }

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('配额使用量应该在降级后保持', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (organizationId) => {
            // 创建 professional 等级的订阅
            const subscription = await subscriptionService.createSubscription(organizationId, 'professional');

            // 更新使用量
            await subscriptionService.updateQuotaUsage(subscription.id, 'projects', 5, 'increment');

            // 升级到 enterprise
            const upgraded = await subscriptionService.upgradeSubscription(organizationId, 'enterprise');

            // 验证使用量保持不变
            const quota = await subscriptionService.getQuota(upgraded.id, 'projects');
            expect(quota!.used).toBe(5);

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * 配额使用量更新属性测试
   */
  describe('配额使用量更新', () => {
    it('应该正确增加配额使用量', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 10 }),
          async (organizationId, amount) => {
            const subscription = await subscriptionService.createSubscription(organizationId, 'professional');

            // 增加使用量
            const updated = await subscriptionService.updateQuotaUsage(
              subscription.id,
              'projects',
              amount,
              'increment'
            );

            expect(updated.used).toBe(amount);

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('应该正确减少配额使用量', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (organizationId) => {
            const subscription = await subscriptionService.createSubscription(organizationId, 'professional');

            // 增加使用量到 10
            await subscriptionService.updateQuotaUsage(subscription.id, 'projects', 10, 'increment');

            // 减少使用量 3
            const updated = await subscriptionService.updateQuotaUsage(
              subscription.id,
              'projects',
              3,
              'decrement'
            );

            expect(updated.used).toBe(7);

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('应该正确重置配额使用量', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (organizationId) => {
            const subscription = await subscriptionService.createSubscription(organizationId, 'professional');

            // 增加使用量到 10
            await subscriptionService.updateQuotaUsage(subscription.id, 'projects', 10, 'increment');

            // 重置使用量
            const updated = await subscriptionService.updateQuotaUsage(
              subscription.id,
              'projects',
              0,
              'reset'
            );

            expect(updated.used).toBe(0);

            // 清理
            await subscriptionService.cancelSubscription(organizationId);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
