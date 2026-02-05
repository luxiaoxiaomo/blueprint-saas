# 数据库迁移脚本

本目录包含数据库模式迁移脚本，用于升级数据库结构。

## 迁移列表

### 001_add_organization_to_projects.sql
**日期：** 2026-01-19  
**目的：** 为 projects 表添加 organization_id，实现项目的组织级隔离

**变更内容：**
1. 添加 `organization_id` 列到 `projects` 表
2. 迁移现有项目数据到组织
3. 为没有组织的用户创建个人工作空间
4. 添加必要的索引优化查询性能

**影响：**
- 所有项目必须属于一个组织
- 用户通过组织成员关系访问项目
- 支持多租户数据隔离

## 执行迁移

### 方法1：使用 psql 命令行
```bash
# 连接到数据库
psql -h localhost -U postgres -d blueprint_saas

# 执行迁移脚本
\i server/migrations/001_add_organization_to_projects.sql
```

### 方法2：使用 Node.js 脚本
```bash
cd server
node migrations/run-migration.js 001_add_organization_to_projects.sql
```

### 方法3：使用 Docker
```bash
# 如果数据库在 Docker 容器中
docker exec -i blueprint-postgres psql -U postgres -d blueprint_saas < server/migrations/001_add_organization_to_projects.sql
```

## 回滚

如果需要回滚迁移，执行以下 SQL：

```sql
-- 移除索引
DROP INDEX IF EXISTS idx_projects_organization_id;
DROP INDEX IF EXISTS idx_projects_org_archived;
DROP INDEX IF EXISTS idx_projects_org_created;
DROP INDEX IF EXISTS idx_members_org_status;
DROP INDEX IF EXISTS idx_departments_org_parent;

-- 移除列
ALTER TABLE projects DROP COLUMN IF EXISTS organization_id;

-- 删除自动创建的个人组织（可选）
DELETE FROM organizations WHERE identifier LIKE 'personal-%';
```

## 注意事项

⚠️ **执行前必读：**

1. **备份数据库**
   ```bash
   pg_dump -h localhost -U postgres blueprint_saas > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **在测试环境先执行**
   - 确保迁移脚本正确运行
   - 验证数据完整性
   - 测试应用功能

3. **停机时间**
   - 迁移过程中建议停止应用服务
   - 避免数据不一致

4. **验证结果**
   - 检查所有项目都有 organization_id
   - 验证用户可以访问其项目
   - 测试权限控制

## 迁移后验证

执行以下查询验证迁移结果：

```sql
-- 检查是否有项目没有 organization_id
SELECT COUNT(*) FROM projects WHERE organization_id IS NULL;
-- 应该返回 0

-- 检查每个组织的项目数
SELECT o.name, COUNT(p.id) as project_count
FROM organizations o
LEFT JOIN projects p ON p.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY project_count DESC;

-- 检查用户是否可以访问其项目
SELECT 
  u.email,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT m.organization_id) as org_count
FROM users u
LEFT JOIN projects p ON p.user_id = u.id
LEFT JOIN members m ON m.user_id = u.id AND m.status = 'active'
GROUP BY u.id, u.email
ORDER BY project_count DESC;
```

## 故障排查

### 问题1：迁移失败，提示有项目没有 organization_id
**原因：** 用户没有任何组织成员关系  
**解决：** 脚本会自动创建个人工作空间

### 问题2：外键约束错误
**原因：** 数据不一致  
**解决：** 检查 users 和 organizations 表的数据完整性

### 问题3：性能问题
**原因：** 大量数据迁移  
**解决：** 
- 分批执行更新
- 在低峰期执行
- 增加数据库资源

## 支持

如有问题，请查看：
- `server/DATA_ISOLATION_IMPLEMENTATION.md` - 数据隔离实施指南
- `server/DATA_ISOLATION_PROGRESS.md` - 迁移进度跟踪
