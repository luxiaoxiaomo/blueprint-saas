# 数据隔离机制实施指南

## 概述
本文档描述了多租户SaaS系统的数据隔离机制实现，确保不同组织的数据完全隔离。

## 已实现的组件

### 1. 租户上下文服务 (`TenantContext.ts`)
**功能：**
- 使用 AsyncLocalStorage 管理租户上下文
- 存储当前请求的 organizationId、userId、userEmail
- 提供上下文访问和验证方法

**关键方法：**
- `run()` - 运行带租户上下文的函数
- `getOrganizationId()` - 获取当前组织ID
- `validateResourceAccess()` - 验证资源访问权限

### 2. 租户中间件 (`middleware/tenant.ts`)
**功能：**
- 从请求中提取组织ID
- 验证用户是否属于该组织
- 设置租户上下文

**两种模式：**
- `tenantMiddleware` - 强制要求租户上下文
- `optionalTenantMiddleware` - 可选租户上下文

### 3. 租户感知基础仓库 (`TenantAwareRepository.ts`)
**功能：**
- 自动在所有查询中添加 organizationId 过滤
- 自动验证资源访问权限
- 防止跨租户数据访问

**核心方法：**
- `findAll()` - 查找所有记录（自动过滤）
- `findById()` - 根据ID查找（自动验证）
- `create()` - 创建记录（自动添加 organizationId）
- `update()` - 更新记录（自动验证）
- `delete()` - 删除记录（自动验证）

## 使用指南

### 步骤1：在路由中应用租户中间件

```typescript
import { tenantMiddleware } from '../middleware/tenant';

// 需要租户上下文的路由
router.get('/api/departments', 
  authenticateToken,  // 先认证
  tenantMiddleware,   // 再设置租户上下文
  async (req, res) => {
    // 处理请求
  }
);
```

### 步骤2：迁移 Repository 到 TenantAwareRepository

**之前（不安全）：**
```typescript
export class DepartmentRepository extends BaseRepository<Department> {
  async findByOrganization(organizationId: string): Promise<Department[]> {
    const query = `SELECT * FROM departments WHERE organization_id = $1`;
    const result = await this.pool.query(query, [organizationId]);
    return result.rows;
  }
}
```

**之后（安全）：**
```typescript
export class DepartmentRepository extends TenantAwareRepository<Department> {
  constructor(pool: Pool) {
    super(pool, 'departments', 'organization_id');
  }

  async findByOrganization(): Promise<Department[]> {
    // 自动添加租户过滤，无需传入 organizationId
    return this.findAll();
  }
}
```

### 步骤3：更新路由处理器

**之前：**
```typescript
router.get('/api/departments/:orgId', async (req, res) => {
  const { orgId } = req.params;
  const departments = await departmentRepo.findByOrganization(orgId);
  res.json({ success: true, data: departments });
});
```

**之后：**
```typescript
router.get('/api/departments', 
  authenticateToken,
  tenantMiddleware,  // 自动设置租户上下文
  async (req, res) => {
    // 无需传入 orgId，自动从上下文获取
    const departments = await departmentRepo.findByOrganization();
    res.json({ success: true, data: departments });
  }
);
```

## 安全保证

### 1. 自动租户过滤
所有查询自动添加 `WHERE organization_id = $1` 条件

### 2. 资源访问验证
在更新/删除操作前，自动验证资源是否属于当前租户

### 3. 防止租户ID篡改
创建/更新时，organizationId 从上下文获取，无法被客户端篡改

### 4. 上下文隔离
使用 AsyncLocalStorage 确保不同请求的上下文完全隔离

## 迁移清单

### 需要迁移的 Repository
- [ ] ProjectRepository
- [ ] ModuleRepository
- [ ] EntityRepository
- [x] DepartmentRepository（示例已创建）
- [ ] MemberRepository
- [ ] TaskRepository
- [ ] OrganizationRepository（特殊处理）

### 需要更新的路由
- [ ] `/api/projects/*`
- [ ] `/api/modules/*`
- [ ] `/api/entities/*`
- [x] `/api/departments/*`
- [x] `/api/members/*`
- [ ] `/api/tasks/*`

## 测试要点

### 1. 跨租户访问测试
```typescript
test('不能访问其他组织的资源', async () => {
  // 用户A属于组织1
  // 尝试访问组织2的资源
  // 应该抛出错误或返回空结果
});
```

### 2. 租户过滤测试
```typescript
test('查询只返回当前组织的数据', async () => {
  // 创建多个组织的数据
  // 查询应该只返回当前组织的数据
});
```

### 3. 资源验证测试
```typescript
test('不能更新其他组织的资源', async () => {
  // 尝试更新其他组织的资源
  // 应该抛出访问被拒绝错误
});
```

## 性能考虑

### 1. 索引优化
确保所有表的 `organization_id` 列都有索引：
```sql
CREATE INDEX idx_departments_org_id ON departments(organization_id);
CREATE INDEX idx_members_org_id ON members(organization_id);
CREATE INDEX idx_projects_org_id ON projects(organization_id);
```

### 2. 查询优化
使用复合索引优化常见查询：
```sql
CREATE INDEX idx_members_org_status ON members(organization_id, status);
CREATE INDEX idx_departments_org_parent ON departments(organization_id, parent_id);
```

## 下一步

1. **完成所有 Repository 迁移**
2. **更新所有路由使用租户中间件**
3. **编写全面的安全测试**
4. **进行渗透测试**
5. **文档化所有API的租户行为**

## 注意事项

⚠️ **关键安全提示：**
1. 永远不要信任客户端传入的 organizationId
2. 所有数据访问必须经过租户验证
3. 使用 TenantAwareRepository 时，避免使用原始SQL
4. 定期审计代码，确保没有绕过租户过滤的查询

## 完成时间
2026-01-19

## 相关文件
- `server/src/services/TenantContext.ts`
- `server/src/middleware/tenant.ts`
- `server/src/repositories/TenantAwareRepository.ts`
