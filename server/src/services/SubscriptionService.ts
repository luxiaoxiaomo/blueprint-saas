/**
 * SubscriptionService - 订阅和配额管理服务
 * 负责订阅管理、配额检查和使用量跟踪
 */

import { Pool } from 'pg';

export type SubscriptionTier = 'free' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'suspended' | 'expired';
export type BillingCycle = 'monthly' | 'annual';
export type QuotaResource = 'projects' | 'members' | 'storage' | 'api_calls' | 'modules' | 'entities';
export type ResetCycle = 'never' | 'monthly' | 'annual';

/**
 * 订阅接口
 */
export interface Subscription {
  id: string;
  organizationId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  autoRenew: boolean;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 配额接口
 */
export interface Quota {
  id: string;
  subscriptionId: string;
  resource: QuotaResource;
  limitValue: number;
  used: number;
  resetDate?: Date;
  resetCycle: ResetCycle;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 配额定义
 */
const QUOTA_DEFINITIONS: Record<SubscriptionTier, Record<QuotaResource, { limit: number; resetCycle: ResetCycle }>> = {
  free: {
    projects: { limit: 3, resetCycle: 'never' },
    members: { limit: 5, resetCycle: 'never' },
    storage: { limit: 1024 * 1024 * 1024, resetCycle: 'never' }, // 1GB
    api_calls: { limit: 10000, resetCycle: 'monthly' },
    modules: { limit: 50, resetCycle: 'never' },
    entities: { limit: 500, resetCycle: 'never' },
  },
  professional: {
    projects: { limit: 50, resetCycle: 'never' },
    members: { limit: 50, resetCycle: 'never' },
    storage: { limit: 50 * 1024 * 1024 * 1024, resetCycle: 'never' }, // 50GB
    api_calls: { limit: 1000000, resetCycle: 'monthly' },
    modules: { limit: 500, resetCycle: 'never' },
    entities: { limit: 50000, resetCycle: 'never' },
  },
  enterprise: {
    projects: { limit: -1, resetCycle: 'never' }, // 无限
    members: { limit: -1, resetCycle: 'never' },
    storage: { limit: 1024 * 1024 * 1024 * 1024, resetCycle: 'never' }, // 1TB
    api_calls: { limit: -1, resetCycle: 'never' },
    modules: { limit: -1, resetCycle: 'never' },
    entities: { limit: -1, resetCycle: 'never' },
  },
};

/**
 * 订阅服务
 */
export class SubscriptionService {
  constructor(private pool: Pool) {}

  /**
   * 获取组织的订阅
   */
  async getSubscription(organizationId: string): Promise<Subscription | null> {
    const query = `
      SELECT id, organization_id, tier, status, billing_cycle, auto_renew,
             current_period_start, current_period_end, next_billing_date,
             cancelled_at, cancellation_reason, created_at, updated_at
      FROM subscriptions
      WHERE organization_id = $1
    `;

    const result = await this.pool.query(query, [organizationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSubscription(result.rows[0]);
  }

  /**
   * 创建订阅
   */
  async createSubscription(
    organizationId: string,
    tier: SubscriptionTier = 'free',
    billingCycle: BillingCycle = 'monthly'
  ): Promise<Subscription> {
    const currentPeriodStart = new Date();
    const currentPeriodEnd = this.calculatePeriodEnd(currentPeriodStart, billingCycle);

    const query = `
      INSERT INTO subscriptions (
        organization_id, tier, status, billing_cycle, auto_renew,
        current_period_start, current_period_end, next_billing_date
      )
      VALUES ($1, $2, 'active', $3, true, $4, $5, $5)
      RETURNING id, organization_id, tier, status, billing_cycle, auto_renew,
                current_period_start, current_period_end, next_billing_date,
                cancelled_at, cancellation_reason, created_at, updated_at
    `;

    const result = await this.pool.query(query, [
      organizationId,
      tier,
      billingCycle,
      currentPeriodStart,
      currentPeriodEnd
    ]);

    const subscription = this.mapRowToSubscription(result.rows[0]);

    // 创建配额
    await this.initializeQuotas(subscription.id, tier);

    return subscription;
  }

  /**
   * 升级订阅
   */
  async upgradeSubscription(organizationId: string, newTier: SubscriptionTier): Promise<Subscription> {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription) {
      throw new Error(`订阅不存在: ${organizationId}`);
    }

    // 检查是否是升级
    const tierOrder = { free: 0, professional: 1, enterprise: 2 };
    if (tierOrder[newTier] <= tierOrder[subscription.tier]) {
      throw new Error(`无法升级到相同或更低的订阅等级`);
    }

    const query = `
      UPDATE subscriptions
      SET tier = $1, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $2
      RETURNING id, organization_id, tier, status, billing_cycle, auto_renew,
                current_period_start, current_period_end, next_billing_date,
                cancelled_at, cancellation_reason, created_at, updated_at
    `;

    const result = await this.pool.query(query, [newTier, organizationId]);

    // 更新配额
    await this.updateQuotas(subscription.id, newTier);

    return this.mapRowToSubscription(result.rows[0]);
  }

  /**
   * 降级订阅
   */
  async downgradeSubscription(organizationId: string, newTier: SubscriptionTier): Promise<Subscription> {
    const subscription = await this.getSubscription(organizationId);
    if (!subscription) {
      throw new Error(`订阅不存在: ${organizationId}`);
    }

    // 检查是否是降级
    const tierOrder = { free: 0, professional: 1, enterprise: 2 };
    if (tierOrder[newTier] >= tierOrder[subscription.tier]) {
      throw new Error(`无法降级到相同或更高的订阅等级`);
    }

    // 检查是否超过新等级的配额
    await this.validateDowngrade(subscription.id, newTier);

    const query = `
      UPDATE subscriptions
      SET tier = $1, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $2
      RETURNING id, organization_id, tier, status, billing_cycle, auto_renew,
                current_period_start, current_period_end, next_billing_date,
                cancelled_at, cancellation_reason, created_at, updated_at
    `;

    const result = await this.pool.query(query, [newTier, organizationId]);

    // 更新配额
    await this.updateQuotas(subscription.id, newTier);

    return this.mapRowToSubscription(result.rows[0]);
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(organizationId: string, reason?: string): Promise<Subscription> {
    const query = `
      UPDATE subscriptions
      SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $2
      RETURNING id, organization_id, tier, status, billing_cycle, auto_renew,
                current_period_start, current_period_end, next_billing_date,
                cancelled_at, cancellation_reason, created_at, updated_at
    `;

    const result = await this.pool.query(query, [reason || null, organizationId]);

    if (result.rows.length === 0) {
      throw new Error(`订阅不存在: ${organizationId}`);
    }

    return this.mapRowToSubscription(result.rows[0]);
  }

  /**
   * 检查配额
   */
  async checkQuota(subscriptionId: string, resource: QuotaResource, amount: number = 1): Promise<boolean> {
    const quota = await this.getQuota(subscriptionId, resource);
    if (!quota) {
      throw new Error(`配额不存在: ${resource}`);
    }

    // 无限配额
    if (quota.limitValue === -1) {
      return true;
    }

    return quota.used + amount <= quota.limitValue;
  }

  /**
   * 更新配额使用量
   */
  async updateQuotaUsage(
    subscriptionId: string,
    resource: QuotaResource,
    amount: number,
    operation: 'increment' | 'decrement' | 'reset' = 'increment',
    reason?: string,
    createdBy?: string
  ): Promise<Quota> {
    const quota = await this.getQuota(subscriptionId, resource);
    if (!quota) {
      throw new Error(`配额不存在: ${resource}`);
    }

    let newUsed = quota.used;
    if (operation === 'increment') {
      newUsed += amount;
    } else if (operation === 'decrement') {
      newUsed = Math.max(0, quota.used - amount);
    } else if (operation === 'reset') {
      newUsed = 0;
    }

    // 检查是否超过限制
    if (quota.limitValue !== -1 && newUsed > quota.limitValue) {
      throw new Error(`超过 ${resource} 配额限制: ${newUsed} > ${quota.limitValue}`);
    }

    // 更新配额
    const updateQuery = `
      UPDATE quotas
      SET used = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, subscription_id, resource, limit_value, used, reset_date, reset_cycle, created_at, updated_at
    `;

    const updateResult = await this.pool.query(updateQuery, [newUsed, quota.id]);

    // 记录使用历史
    const historyQuery = `
      INSERT INTO quota_usage_history (quota_id, amount, operation, reason, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `;

    await this.pool.query(historyQuery, [quota.id, amount, operation, reason || null, createdBy || null]);

    return this.mapRowToQuota(updateResult.rows[0]);
  }

  /**
   * 获取配额
   */
  async getQuota(subscriptionId: string, resource: QuotaResource): Promise<Quota | null> {
    const query = `
      SELECT id, subscription_id, resource, limit_value, used, reset_date, reset_cycle, created_at, updated_at
      FROM quotas
      WHERE subscription_id = $1 AND resource = $2
    `;

    const result = await this.pool.query(query, [subscriptionId, resource]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToQuota(result.rows[0]);
  }

  /**
   * 获取所有配额
   */
  async getAllQuotas(subscriptionId: string): Promise<Quota[]> {
    const query = `
      SELECT id, subscription_id, resource, limit_value, used, reset_date, reset_cycle, created_at, updated_at
      FROM quotas
      WHERE subscription_id = $1
      ORDER BY resource
    `;

    const result = await this.pool.query(query, [subscriptionId]);

    return result.rows.map(row => this.mapRowToQuota(row));
  }

  /**
   * 初始化配额
   */
  private async initializeQuotas(subscriptionId: string, tier: SubscriptionTier): Promise<void> {
    const quotaDefs = QUOTA_DEFINITIONS[tier];

    for (const [resource, def] of Object.entries(quotaDefs)) {
      const query = `
        INSERT INTO quotas (subscription_id, resource, limit_value, used, reset_cycle)
        VALUES ($1, $2, $3, 0, $4)
      `;

      await this.pool.query(query, [subscriptionId, resource, def.limit, def.resetCycle]);
    }
  }

  /**
   * 更新配额
   */
  private async updateQuotas(subscriptionId: string, tier: SubscriptionTier): Promise<void> {
    const quotaDefs = QUOTA_DEFINITIONS[tier];

    for (const [resource, def] of Object.entries(quotaDefs)) {
      const query = `
        UPDATE quotas
        SET limit_value = $1, reset_cycle = $2, updated_at = CURRENT_TIMESTAMP
        WHERE subscription_id = $3 AND resource = $4
      `;

      await this.pool.query(query, [def.limit, def.resetCycle, subscriptionId, resource]);
    }
  }

  /**
   * 验证降级
   */
  private async validateDowngrade(subscriptionId: string, newTier: SubscriptionTier): Promise<void> {
    const quotas = await this.getAllQuotas(subscriptionId);
    const newQuotaDefs = QUOTA_DEFINITIONS[newTier];

    for (const quota of quotas) {
      const newDef = newQuotaDefs[quota.resource];
      if (newDef && newDef.limit !== -1 && quota.used > newDef.limit) {
        throw new Error(
          `无法降级：${quota.resource} 的使用量 (${quota.used}) 超过新等级的限制 (${newDef.limit})`
        );
      }
    }
  }

  /**
   * 计算周期结束日期
   */
  private calculatePeriodEnd(startDate: Date, billingCycle: BillingCycle): Date {
    const endDate = new Date(startDate);
    if (billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    return endDate;
  }

  /**
   * 映射数据库行到 Subscription 对象
   */
  private mapRowToSubscription(row: any): Subscription {
    return {
      id: row.id,
      organizationId: row.organization_id,
      tier: row.tier,
      status: row.status,
      billingCycle: row.billing_cycle,
      autoRenew: row.auto_renew,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      nextBillingDate: row.next_billing_date,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 映射数据库行到 Quota 对象
   */
  private mapRowToQuota(row: any): Quota {
    return {
      id: row.id,
      subscriptionId: row.subscription_id,
      resource: row.resource,
      limitValue: row.limit_value,
      used: row.used,
      resetDate: row.reset_date,
      resetCycle: row.reset_cycle,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
