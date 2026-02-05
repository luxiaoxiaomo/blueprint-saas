-- 迁移 004: 添加订阅和配额表
-- 用于支持订阅套餐管理和配额限制功能

-- 创建订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'professional', 'enterprise')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'expired')),
  billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  auto_renew BOOLEAN DEFAULT true,
  current_period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMP NOT NULL,
  next_billing_date TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT fk_subscriptions_organization FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 创建配额表
CREATE TABLE IF NOT EXISTS quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  resource VARCHAR(50) NOT NULL CHECK (resource IN ('projects', 'members', 'storage', 'api_calls', 'modules', 'entities')),
  limit_value BIGINT NOT NULL,
  used BIGINT NOT NULL DEFAULT 0,
  reset_date TIMESTAMP,
  reset_cycle VARCHAR(50) NOT NULL DEFAULT 'never' CHECK (reset_cycle IN ('never', 'monthly', 'annual')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 唯一约束：每个订阅的每个资源只能有一个配额
  UNIQUE(subscription_id, resource),
  
  -- 外键约束
  CONSTRAINT fk_quotas_subscription FOREIGN KEY (subscription_id) 
    REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_quotas_subscription_id ON quotas(subscription_id);
CREATE INDEX IF NOT EXISTS idx_quotas_resource ON quotas(resource);
CREATE INDEX IF NOT EXISTS idx_quotas_subscription_resource ON quotas(subscription_id, resource);

-- 创建配额使用历史表
CREATE TABLE IF NOT EXISTS quota_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quota_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('increment', 'decrement', 'reset')),
  reason TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT fk_quota_usage_history_quota FOREIGN KEY (quota_id) 
    REFERENCES quotas(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_quota_usage_history_quota_id ON quota_usage_history(quota_id);
CREATE INDEX IF NOT EXISTS idx_quota_usage_history_created_at ON quota_usage_history(created_at);
CREATE INDEX IF NOT EXISTS idx_quota_usage_history_operation ON quota_usage_history(operation);

-- 创建触发器以自动更新 updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quotas_updated_at ON quotas;
CREATE TRIGGER trigger_quotas_updated_at
BEFORE UPDATE ON quotas
FOR EACH ROW
EXECUTE FUNCTION update_quotas_updated_at();

-- 添加注释
COMMENT ON TABLE subscriptions IS '组织订阅信息表';
COMMENT ON TABLE quotas IS '订阅配额表';
COMMENT ON TABLE quota_usage_history IS '配额使用历史表';

COMMENT ON COLUMN subscriptions.tier IS '订阅等级：free（免费）、professional（专业）、enterprise（企业）';
COMMENT ON COLUMN subscriptions.status IS '订阅状态：active（活跃）、cancelled（已取消）、suspended（已暂停）、expired（已过期）';
COMMENT ON COLUMN quotas.resource IS '配额资源类型：projects（项目）、members（成员）、storage（存储）、api_calls（API调用）、modules（模块）、entities（实体）';
COMMENT ON COLUMN quotas.limit_value IS '配额限制值，-1 表示无限';
COMMENT ON COLUMN quotas.reset_cycle IS '配额重置周期：never（永不）、monthly（每月）、annual（每年）';
