-- 迁移 003: 添加权限覆盖表
-- 用于支持项目级权限覆盖功能

-- 创建权限覆盖表
CREATE TABLE IF NOT EXISTS permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('project', 'module', 'entity')),
  granted_permissions TEXT[] DEFAULT '{}',
  revoked_permissions TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 唯一约束：每个用户在每个资源上只能有一个覆盖
  UNIQUE(user_id, resource_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_permission_overrides_user_id ON permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_resource_id ON permission_overrides(resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_resource_type ON permission_overrides(resource_type);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_user_resource ON permission_overrides(user_id, resource_id);

-- 创建用户权限表（如果不存在）
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255),
  role VARCHAR(50),
  permissions TEXT[] DEFAULT '{}',
  granted_by VARCHAR(255),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 唯一约束：每个用户在每个资源上只能有一个权限记录
  UNIQUE(user_id, resource_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource_id ON user_permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_resource ON user_permissions(user_id, resource_id);

-- 创建触发器以自动更新 updated_at
CREATE OR REPLACE FUNCTION update_permission_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_permission_overrides_updated_at ON permission_overrides;
CREATE TRIGGER trigger_permission_overrides_updated_at
BEFORE UPDATE ON permission_overrides
FOR EACH ROW
EXECUTE FUNCTION update_permission_overrides_updated_at();

CREATE OR REPLACE FUNCTION update_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER trigger_user_permissions_updated_at
BEFORE UPDATE ON user_permissions
FOR EACH ROW
EXECUTE FUNCTION update_user_permissions_updated_at();
