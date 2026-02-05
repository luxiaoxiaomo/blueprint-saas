-- 迁移脚本：为 projects 表添加 organization_id
-- 日期：2026-01-19
-- 目的：实现项目的组织级隔离

-- 步骤1：添加 organization_id 列（允许 NULL，稍后更新）
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 步骤2：为现有项目设置 organization_id
-- 将用户的项目关联到该用户所属的第一个活跃组织
UPDATE projects p
SET organization_id = (
  SELECT m.organization_id 
  FROM members m 
  WHERE m.user_id = p.user_id 
  AND m.status = 'active'
  ORDER BY m.created_at ASC
  LIMIT 1
)
WHERE organization_id IS NULL;

-- 步骤3：对于没有组织的项目，创建个人组织
-- 为每个没有组织成员关系的用户创建个人组织
INSERT INTO organizations (name, identifier, description, owner_id, plan)
SELECT 
  CONCAT(u.name, '的个人空间'),
  CONCAT('personal-', u.id),
  '自动创建的个人工作空间',
  u.id,
  'free'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM members m WHERE m.user_id = u.id
)
AND EXISTS (
  SELECT 1 FROM projects p WHERE p.user_id = u.id AND p.organization_id IS NULL
)
ON CONFLICT (identifier) DO NOTHING;

-- 为这些用户创建成员关系
INSERT INTO members (organization_id, user_id, role, status, joined_at)
SELECT 
  o.id,
  u.id,
  'owner',
  'active',
  CURRENT_TIMESTAMP
FROM users u
JOIN organizations o ON o.identifier = CONCAT('personal-', u.id)
WHERE NOT EXISTS (
  SELECT 1 FROM members m WHERE m.user_id = u.id AND m.organization_id = o.id
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 更新剩余的项目
UPDATE projects p
SET organization_id = (
  SELECT m.organization_id 
  FROM members m 
  WHERE m.user_id = p.user_id 
  AND m.status = 'active'
  ORDER BY m.created_at ASC
  LIMIT 1
)
WHERE organization_id IS NULL;

-- 步骤4：设置 NOT NULL 约束
ALTER TABLE projects 
ALTER COLUMN organization_id SET NOT NULL;

-- 步骤5：创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_archived ON projects(organization_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_projects_org_created ON projects(organization_id, created_at DESC);

-- 步骤6：为其他表添加复合索引优化
CREATE INDEX IF NOT EXISTS idx_members_org_status ON members(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_departments_org_parent ON departments(organization_id, parent_id);

-- 验证：检查是否所有项目都有 organization_id
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM projects WHERE organization_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION '迁移失败：仍有 % 个项目没有 organization_id', null_count;
  ELSE
    RAISE NOTICE '✅ 迁移成功：所有项目都已关联到组织';
  END IF;
END $$;

-- 输出统计信息
DO $$
DECLARE
  total_projects INTEGER;
  total_orgs INTEGER;
  projects_per_org RECORD;
BEGIN
  SELECT COUNT(*) INTO total_projects FROM projects;
  SELECT COUNT(*) INTO total_orgs FROM organizations;
  
  RAISE NOTICE '=== 迁移统计 ===';
  RAISE NOTICE '总项目数: %', total_projects;
  RAISE NOTICE '总组织数: %', total_orgs;
  RAISE NOTICE '';
  RAISE NOTICE '每个组织的项目数:';
  
  FOR projects_per_org IN 
    SELECT o.name, COUNT(p.id) as project_count
    FROM organizations o
    LEFT JOIN projects p ON p.organization_id = o.id
    GROUP BY o.id, o.name
    ORDER BY project_count DESC
  LOOP
    RAISE NOTICE '  %: % 个项目', projects_per_org.name, projects_per_org.project_count;
  END LOOP;
END $$;
