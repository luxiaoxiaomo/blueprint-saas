# 第一阶段快速参考指南

## 🚀 快速开始

### 1. 运行测试
```bash
# 运行所有测试
npm run test:all

# 运行属性测试
npm run test:property

# 运行权限测试
npm run test:permissions

# 运行订阅测试
npm run test:subscription

# 运行隔离测试
npm run test:isolation
```

### 2. 执行数据库迁移
```bash
# 迁移权限覆盖表
node server/migrations/run-migration.js 003_add_permission_overrides.sql

# 迁移订阅和配额表
node server/migrations/run-migration.js 004_add_subscription_and_quota.sql
```

### 3. 启动开发服务器
```bash
# 开发模式
npm run dev:watch

# 生产模式
npm run build && npm run start
```

---

## 📚 核心概念

### 权限系统

**基础权限检查**:
```typescript
const result = await permissionService.check(userId, [Permission.PROJECT_READ]);
if (result.allowed) {
  // 允许访问
} else {
  // 拒绝访问
  console.log(result.reason);
}
```

**项目级权限覆盖**:
```typescript
// 为用户在特定项目上授予额外权限
await permissionService.createOverride(
  userId,
  projectId,
  'project',
  [Permission.PROJECT_UPDATE],  // 授予
  [Permission.PROJECT_READ],    // 撤销
  0,                            // 优先级
  createdBy
);
```

**权限缓存**:
- 自动缓存用户权限到 Redis
- 缓存键: `permissions:${userId}:${resourceId}`
- 权限变更时自动清除缓存

### 订阅系统

**创建订阅**:
```typescript
const subscription = await subscriptionService.createSubscription(
  organizationId,
  'free'  // 'free' | 'professional' | 'enterprise'
);
```

**检查配额**:
```typescript
const canCreate = await subscriptionService.checkQuota(
  subscriptionId,
  'projects',  // 资源类型
  1            // 数量
);

if (!canCreate) {
  throw new Error('超过配额限制');
}
```

**更新配额使用量**:
```typescript
await subscriptionService.updateQuotaUsage(
  subscriptionId,
  'projects',
  1,           // 数量
  'increment', // 'increment' | 'decrement' | 'reset'
  '创建新项目',
  userId
);
```

**升级/降级订阅**:
```typescript
// 升级
const upgraded = await subscriptionService.upgradeSubscription(
  organizationId,
  'professional'
);

// 降级（会验证使用量）
const downgraded = await subscriptionService.downgradeSubscription(
  organizationId,
  'free'
);
```

### 数据隔离

**租户中间件**:
```typescript
// 在路由中使用
app.get('/api/projects', tenantMiddleware, async (req, res) => {
  // 租户上下文已自动设置
  const projects = await projectRepository.findAll();
  res.json(projects);
});
```

**租户感知仓库**:
```typescript
// 自动添加租户过滤
class ProjectRepository extends TenantAwareRepository<Project> {
  constructor(pool: Pool) {
    super(pool, 'projects', 'organization_id');
  }

  async findAll(): Promise<Project[]> {
    // 自动添加 WHERE organization_id = current_org_id
    return super.findAll();
  }
}
```

---

## 🔑 关键文件

### 服务层
- `server/src/services/PermissionService.ts` - 权限管理
- `server/src/services/SubscriptionService.ts` - 订阅管理
- `server/src/services/TenantContext.ts` - 租户上下文

### 中间件
- `server/src/middleware/tenant.ts` - 租户中间件

### 仓库
- `server/src/repositories/TenantAwareRepository.ts` - 租户感知基类
- `server/src/repositories/DepartmentRepository.ts` - 部门仓库

### 测试
- `server/src/ontology/__tests__/permissions.property.test.ts` - 权限测试
- `server/src/services/__tests__/subscription.property.test.ts` - 订阅测试
- `server/tests/integration/test-data-isolation.property.test.js` - 隔离测试

### 数据库
- `server/migrations/003_add_permission_overrides.sql` - 权限覆盖表
- `server/migrations/004_add_subscription_and_quota.sql` - 订阅和配额表

---

## 📊 配额定义

### Free 等级
- 项目: 3 个
- 成员: 5 个
- 存储: 1GB
- API 调用: 10,000/月
- 模块: 50 个
- 实体: 500 个

### Professional 等级
- 项目: 50 个
- 成员: 50 个
- 存储: 50GB
- API 调用: 1,000,000/月
- 模块: 500 个
- 实体: 50,000 个

### Enterprise 等级
- 项目: 无限
- 成员: 无限
- 存储: 1TB
- API 调用: 无限
- 模块: 无限
- 实体: 无限

---

## 🔐 权限列表

### 项目权限
- `PROJECT_CREATE` - 创建项目
- `PROJECT_READ` - 读取项目
- `PROJECT_UPDATE` - 更新项目
- `PROJECT_DELETE` - 删除项目
- `PROJECT_ARCHIVE` - 归档项目

### 模块权限
- `MODULE_CREATE` - 创建模块
- `MODULE_READ` - 读取模块
- `MODULE_UPDATE` - 更新模块
- `MODULE_DELETE` - 删除模块

### 实体权限
- `ENTITY_CREATE` - 创建实体
- `ENTITY_READ` - 读取实体
- `ENTITY_UPDATE` - 更新实体
- `ENTITY_DELETE` - 删除实体

### 任务权限
- `TASK_CREATE` - 创建任务
- `TASK_READ` - 读取任务
- `TASK_UPDATE` - 更新任务
- `TASK_DELETE` - 删除任务

### 系统权限
- `AUDIT_READ` - 读取审计日志
- `SYSTEM_ADMIN` - 系统管理员

---

## 👥 角色权限映射

### Owner（所有者）
- 拥有所有权限
- 包括系统管理员权限

### Admin（管理员）
- 拥有大部分权限
- 不包括系统管理员权限

### Member（成员）
- 基本权限
- 可以创建和修改项目、模块、实体、任务

### Viewer（查看者）
- 只读权限
- 只能读取项目、模块、实体、任务

### Guest（访客）
- 受限的只读权限
- 只能读取项目

---

## 🧪 属性测试

### 运行属性测试
```bash
npm run test:property
```

### 属性测试列表

| ID | 名称 | 验证需求 | 状态 |
|----|------|---------|------|
| P4 | 角色权限边界 | 2.2-2.5 | ✅ |
| P5 | 项目级权限覆盖 | 2.6 | ✅ |
| P6 | 未授权访问被拒绝 | 2.7 | ✅ |
| P7 | 权限变更被审计 | 2.9 | ✅ |
| P24 | 审计日志不可修改 | 10.11 | ✅ |
| P25 | 安全事件被审计 | 10.2-10.5 | ✅ |
| P38 | 数据隔离完整性 | 26.2, 26.3, 26.6 | ✅ |
| P39 | 配额限制强制执行 | 28.8 | ✅ |
| P40 | 订阅降级配额调整 | 28.7 | ✅ |

---

## 🐛 常见问题

### Q: 权限检查失败怎么办？
```typescript
const result = await permissionService.check(userId, [Permission.PROJECT_READ]);
if (!result.allowed) {
  console.log('缺少权限:', result.missingPermissions);
  console.log('原因:', result.reason);
}
```

### Q: 如何清除权限缓存？
```typescript
// 清除特定用户的所有权限缓存
await permissionService.clearUserCache(userId);

// 或者禁用缓存（用于测试）
permissionService.disableCache();
```

### Q: 如何检查配额是否超限？
```typescript
try {
  const canCreate = await subscriptionService.checkQuota(subscriptionId, 'projects', 1);
  if (!canCreate) {
    throw new Error('超过配额限制');
  }
} catch (error) {
  console.error('配额检查失败:', error.message);
}
```

### Q: 如何处理订阅降级时的配额冲突？
```typescript
try {
  await subscriptionService.downgradeSubscription(organizationId, 'free');
} catch (error) {
  if (error.message.includes('无法降级')) {
    // 需要先删除一些资源
    console.log('需要删除资源以满足新等级的配额限制');
  }
}
```

---

## 📝 API 端点

### 权限相关
- `GET /api/permissions/check` - 检查权限
- `POST /api/permissions/grant` - 授予权限
- `POST /api/permissions/revoke` - 撤销权限
- `POST /api/permissions/overrides` - 创建权限覆盖
- `DELETE /api/permissions/overrides/:resourceId` - 删除权限覆盖

### 订阅相关
- `GET /api/subscriptions/:organizationId` - 获取订阅
- `POST /api/subscriptions` - 创建订阅
- `PUT /api/subscriptions/:organizationId/upgrade` - 升级订阅
- `PUT /api/subscriptions/:organizationId/downgrade` - 降级订阅
- `DELETE /api/subscriptions/:organizationId` - 取消订阅
- `GET /api/subscriptions/:organizationId/quotas` - 获取配额
- `POST /api/subscriptions/:organizationId/quotas/check` - 检查配额

### 成员相关
- `GET /api/members` - 获取成员列表
- `POST /api/members` - 创建成员
- `PUT /api/members/:memberId` - 更新成员
- `DELETE /api/members/:memberId` - 删除成员

### 部门相关
- `GET /api/departments` - 获取部门列表
- `POST /api/departments` - 创建部门
- `PUT /api/departments/:departmentId` - 更新部门
- `DELETE /api/departments/:departmentId` - 删除部门

---

## 🔄 工作流示例

### 创建新组织和成员

```typescript
// 1. 创建组织
const org = await organizationRepository.create({
  name: 'My Organization',
  tier: 'free'
});

// 2. 创建订阅
const subscription = await subscriptionService.createSubscription(org.id, 'free');

// 3. 创建成员
const member = await memberRepository.create({
  userId: userId,
  organizationId: org.id,
  role: 'member',
  status: 'active'
});

// 4. 授予权限
await permissionService.grant(
  userId,
  [Permission.PROJECT_CREATE, Permission.PROJECT_READ],
  userId
);
```

### 创建项目并检查配额

```typescript
// 1. 检查配额
const canCreate = await subscriptionService.checkQuota(subscriptionId, 'projects', 1);
if (!canCreate) {
  throw new Error('超过项目配额限制');
}

// 2. 创建项目
const project = await projectRepository.create({
  organizationId: organizationId,
  name: 'New Project'
});

// 3. 更新配额使用量
await subscriptionService.updateQuotaUsage(
  subscriptionId,
  'projects',
  1,
  'increment',
  `创建项目: ${project.id}`,
  userId
);
```

### 升级订阅

```typescript
// 1. 获取当前订阅
const subscription = await subscriptionService.getSubscription(organizationId);

// 2. 升级到 professional
const upgraded = await subscriptionService.upgradeSubscription(
  organizationId,
  'professional'
);

// 3. 验证配额已更新
const quotas = await subscriptionService.getAllQuotas(upgraded.id);
console.log('新配额:', quotas);
```

---

## 📞 获取帮助

### 文档
- `PHASE1_COMPLETION_SUMMARY.md` - 第一阶段完成总结
- `server/DATA_ISOLATION_IMPLEMENTATION.md` - 数据隔离实施指南
- `server/API_DOCUMENTATION.md` - API 文档
- `server/DEVELOPMENT_GUIDE.md` - 开发指南

### 测试
- 查看测试文件了解使用示例
- 运行 `npm run test:watch` 进行交互式测试

### 代码
- 查看源代码中的注释和类型定义
- 查看测试文件中的使用示例

---

**最后更新**: 2026-01-22  
**版本**: 1.0.0 - Phase 1 Complete
