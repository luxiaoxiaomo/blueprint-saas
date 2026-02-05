# 快速参考指南

## 🚀 快速开始

### 1. 编译代码
```bash
# 后端
cd server
npm run build

# 前端
npm run build
```

### 2. 执行数据库迁移
```bash
# 备份数据库
pg_dump -h localhost -U postgres blueprint_saas > backup_$(date +%Y%m%d_%H%M%S).sql

# 执行迁移
psql -h localhost -U postgres -d blueprint_saas -f server/migrations/001_add_organization_to_projects.sql
```

### 3. 运行测试
```bash
cd server
npm test
```

## 📋 关键文件位置

### 核心实现
- `server/src/services/TenantContext.ts` - 租户上下文
- `server/src/middleware/tenant.ts` - 租户中间件
- `server/src/repositories/TenantAwareRepository.ts` - 租户感知仓库

### 已迁移的路由
- `server/src/routes/members.ts` - 成员管理
- `server/src/routes/departments.ts` - 部门管理
- `server/src/routes/projects.ts` - 项目管理

### 需要迁移的路由
- `server/src/routes/modules.ts` - 模块管理
- `server/src/routes/entities.ts` - 实体管理
- `server/src/routes/tasks.ts` - 任务管理
- `server/src/routes/links.ts` - 链接管理

### 数据库迁移
- `server/migrations/001_add_organization_to_projects.sql` - 迁移脚本
- `server/migrations/README.md` - 迁移指南

## 🔧 常用命令

### 编译
```bash
# 后端编译
cd server && npm run build

# 前端编译
npm run build

# 同时编译
npm run build && cd server && npm run build
```

### 测试
```bash
# 运行所有测试
cd server && npm test

# 运行特定测试
npm test -- actions.test.ts

# 监视模式
npm test -- --watch
```

### 数据库
```bash
# 备份数据库
pg_dump -h localhost -U postgres blueprint_saas > backup.sql

# 恢复数据库
psql -h localhost -U postgres blueprint_saas < backup.sql

# 连接数据库
psql -h localhost -U postgres -d blueprint_saas

# 执行 SQL 文件
psql -h localhost -U postgres -d blueprint_saas -f script.sql
```

## 📝 代码模板

### 应用租户中间件
```typescript
import { tenantMiddleware } from '../middleware/tenant.js';

router.use(tenantMiddleware);
```

### 获取组织ID
```typescript
import { tenantContext } from '../services/TenantContext.js';

const organizationId = tenantContext.getOrganizationId();
```

### 验证资源访问
```typescript
const organizationId = tenantContext.getOrganizationId();
if (resource.organizationId !== organizationId) {
  return res.status(403).json({ error: '无权访问' });
}
```

### 创建 Action 时传入 organizationId
```typescript
const result = await action.run(
  {
    name: 'Project Name',
    userId: req.user!.id,
    organizationId: tenantContext.getOrganizationId(),
  },
  context
);
```

## 🐛 常见问题

### Q: 编译失败，提示缺少 organizationId
**A:** 在所有 CreateProjectAction 调用中添加 `organizationId` 参数

### Q: 数据库迁移失败
**A:** 
1. 检查数据库连接
2. 确保有备份
3. 查看错误信息
4. 检查 SQL 语法

### Q: 租户上下文为空
**A:** 确保路由应用了 `tenantMiddleware`

### Q: 跨租户访问
**A:** 检查是否在所有查询中添加了 organizationId 过滤

## 📊 进度检查清单

### 已完成 ✅
- [x] 租户上下文服务
- [x] 租户中间件
- [x] 租户感知仓库
- [x] 成员路由迁移
- [x] 部门路由迁移
- [x] 项目路由迁移
- [x] 前端 API 更新
- [x] 编译修复
- [x] 数据库迁移脚本

### 待完成 ⏳
- [ ] 执行数据库迁移
- [ ] 验证迁移结果
- [ ] 模块路由迁移
- [ ] 实体路由迁移
- [ ] 任务路由迁移
- [ ] 链接路由迁移
- [ ] 编写测试
- [ ] 性能优化
- [ ] 文档完善

## 🎯 下一步行动

1. **立即执行**
   ```bash
   # 备份数据库
   pg_dump -h localhost -U postgres blueprint_saas > backup.sql
   
   # 执行迁移
   psql -h localhost -U postgres -d blueprint_saas -f server/migrations/001_add_organization_to_projects.sql
   
   # 验证迁移
   psql -h localhost -U postgres -d blueprint_saas -c "SELECT COUNT(*) FROM projects WHERE organization_id IS NULL;"
   ```

2. **验证结果**
   - 检查所有项目都有 organization_id
   - 运行测试
   - 测试 API

3. **继续迁移**
   - 迁移其他路由
   - 更新前端
   - 编写测试

## 📞 获取帮助

### 查看文档
- `NEXT_STEPS.md` - 下一步工作清单
- `SESSION_SUMMARY.md` - 本次会话总结
- `server/DATA_ISOLATION_IMPLEMENTATION.md` - 实施指南
- `server/migrations/README.md` - 迁移指南

### 查看代码
- `server/src/services/TenantContext.ts` - 租户上下文实现
- `server/src/middleware/tenant.ts` - 租户中间件实现
- `server/src/routes/members.ts` - 已迁移路由示例

## ⚠️ 重要提醒

1. **数据库迁移前必须备份**
2. **在测试环境先执行迁移**
3. **迁移后验证数据完整性**
4. **保留回滚脚本**
5. **更新所有 API 文档**

---

**最后更新：** 2026-01-20  
**维护者：** Kiro AI
