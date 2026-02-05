# 数据隔离机制迁移 - 下一步工作清单

**当前进度：** 65% 完成  
**最后更新：** 2026-01-19

## 已完成 ✅

1. **成员和部门管理**
   - ✅ `/api/members/*` 路由已迁移
   - ✅ `/api/departments/*` 路由已迁移
   - ✅ 前端 API 调用已更新

2. **项目管理基础**
   - ✅ 数据库模式已更新（projects 表添加 organization_id）
   - ✅ ProjectRepository 已更新
   - ✅ `/api/projects/*` 路由已迁移
   - ✅ CreateProjectAction 已更新

3. **数据库迁移脚本**
   - ✅ `server/migrations/001_add_organization_to_projects.sql` 已创建
   - ✅ `server/migrations/run-migration.js` 已创建
   - ✅ `server/migrations/README.md` 已创建

## 立即需要做 🔴

### 1. 修复编译错误（30分钟）
**文件：** `server/src/ontology/__tests__/actions.test.ts`
**问题：** 18个 CreateProjectAction 调用缺少 organizationId
**解决：** 在所有测试中添加 `organizationId: 'test-org-id'`

**文件：** `server/src/ontology/__tests__/ontology.test.ts`
**问题：** 9个 CreateProjectAction 调用缺少 organizationId
**解决：** 在所有测试中添加 `organizationId: 'test-org-id'`

**文件：** `server/src/routes/projects.ontology.ts`
**问题：** 1个 CreateProjectAction 调用缺少 organizationId
**解决：** 添加 `organizationId: tenantContext.getOrganizationId()`

### 2. 执行数据库迁移（15分钟）
```bash
# 备份数据库
pg_dump -h localhost -U postgres blueprint_saas > backup_$(date +%Y%m%d_%H%M%S).sql

# 执行迁移
cd server
node migrations/run-migration.js 001_add_organization_to_projects.sql
```

### 3. 验证编译和测试（30分钟）
```bash
cd server
npm run build
npm test
```

## 短期工作 🟡

### 1. 迁移其他路由（2小时）
- [ ] `/api/modules/*` - 应用 tenantMiddleware
- [ ] `/api/entities/*` - 应用 tenantMiddleware
- [ ] `/api/tasks/*` - 应用 tenantMiddleware
- [ ] `/api/links/*` - 应用 tenantMiddleware

### 2. 迁移其他 Repository（1小时）
- [ ] ModuleRepository - 支持组织级查询
- [ ] EntityRepository - 支持组织级查询
- [ ] TaskRepository - 支持组织级查询
- [ ] LinkRepository - 支持组织级查询

### 3. 更新前端 API 调用（1小时）
- [ ] 项目相关组件的 API 路径更新
- [ ] 移除 organizationId 参数（从上下文获取）

## 长期工作 🟢

### 1. 测试和验证（2小时）
- [ ] 编写跨租户访问测试
- [ ] 编写租户过滤测试
- [ ] 编写资源验证测试
- [ ] 性能测试

### 2. 文档完善（1小时）
- [ ] 更新 API 文档
- [ ] 编写安全最佳实践
- [ ] 创建部署指南

## 关键文件位置

### 需要修复的文件
```
server/src/ontology/__tests__/actions.test.ts      (7个错误)
server/src/ontology/__tests__/ontology.test.ts     (9个错误)
server/src/routes/projects.ontology.ts             (1个错误)
```

### 需要迁移的路由
```
server/src/routes/modules.ts
server/src/routes/entities.ts
server/src/routes/tasks.ts
server/src/routes/links.ts
```

### 需要迁移的 Repository
```
server/src/repositories/ModuleRepository.ts
server/src/repositories/EntityRepository.ts
server/src/repositories/TaskRepository.ts
server/src/repositories/LinkRepository.ts
```

## 快速参考

### 租户中间件应用模板
```typescript
import { tenantMiddleware } from '../middleware/tenant.js';
import { tenantContext } from '../services/TenantContext.js';

// 应用到所有路由
router.use(tenantMiddleware);

// 在路由处理器中使用
const organizationId = tenantContext.getOrganizationId();
```

### 权限验证模板
```typescript
// 验证资源是否属于当前组织
const organizationId = tenantContext.getOrganizationId();
if (resource.organizationId !== organizationId) {
  return res.status(403).json({ error: '无权访问此资源' });
}
```

### 创建 Action 模板
```typescript
const result = await action.run(
  {
    // ... 其他参数
    organizationId: tenantContext.getOrganizationId(),
  },
  context
);
```

## 进度统计

| 任务 | 完成度 | 状态 |
|------|--------|------|
| 成员管理 | 100% | ✅ |
| 部门管理 | 100% | ✅ |
| 项目管理 | 80% | 🟡 |
| 模块管理 | 0% | ⏳ |
| 实体管理 | 0% | ⏳ |
| 任务管理 | 0% | ⏳ |
| 链接管理 | 0% | ⏳ |
| 测试 | 0% | ⏳ |
| 文档 | 50% | 🟡 |

**总体进度：** 65% 完成

## 重要提醒 ⚠️

1. **数据库迁移前必须备份**
2. **在测试环境先执行迁移**
3. **修复编译错误后再执行迁移**
4. **保留回滚脚本**

## 相关文档

- `server/DATA_ISOLATION_IMPLEMENTATION.md` - 实施指南
- `server/DATA_ISOLATION_PROGRESS.md` - 详细进度
- `DATA_ISOLATION_CURRENT_STATUS.md` - 当前状态
- `DATA_ISOLATION_MIGRATION_SUMMARY.md` - 迁移总结
- `server/migrations/README.md` - 迁移指南

---

**下次开始时：**
1. 先修复编译错误
2. 执行数据库迁移
3. 继续迁移其他路由
