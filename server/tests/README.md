# 测试目录

本目录包含服务端的所有测试文件，已按类型分类整理。

## 📁 目录结构

```
server/tests/
├── README.md                    # 本文件
├── run-all-tests.js            # 运行所有测试的脚本
└── integration/                 # 集成测试
    ├── test-ontology.js        # 本体论核心测试
    ├── test-repositories.js    # Repositories 测试
    ├── test-audit.js           # 审计日志测试
    ├── test-permissions.js     # 权限系统测试
    ├── test-routes.js          # 路由集成测试
    ├── test-links.js           # 链接系统测试
    ├── test-enterprise.js      # 企业版 Repository 测试
    ├── test-enterprise-actions.js # 企业版 Actions 测试
    └── test-performance.js     # 性能优化测试
```

## 🧪 测试分类

### 单元测试 (Unit Tests)

位于源码目录中：
- `src/ontology/__tests__/ontology.test.ts` - 本体论核心单元测试
- `src/ontology/__tests__/actions.test.ts` - Actions 单元测试

**运行方式**:
```bash
npm test
```

### 集成测试 (Integration Tests)

位于 `integration/` 目录中，测试各模块的集成功能。

**运行方式**:
```bash
# 运行所有集成测试
node tests/run-all-tests.js

# 运行单个测试
node tests/integration/test-ontology.js
node tests/integration/test-repositories.js
# ... 其他测试文件
```

## 📊 测试统计

| 测试套件 | 文件 | 测试数量 | 状态 |
|---------|------|---------|------|
| 本体论核心 | test-ontology.js | 6 | ✅ |
| Actions | ontology.test.ts, actions.test.ts | 12 | ✅ |
| Repositories | test-repositories.js | 5 | ✅ |
| 审计日志 | test-audit.js | 5 | ✅ |
| 权限系统 | test-permissions.js | 6 | ✅ |
| 路由集成 | test-routes.js | 4 | ✅ |
| 链接系统 | test-links.js | 6 | ✅ |
| 企业功能 | test-enterprise.js, test-enterprise-actions.js | 14 | ✅ |
| 性能优化 | test-performance.js | 7 | ✅ |
| **总计** | - | **53** | **✅ 100%** |

## 🚀 运行测试

### 运行所有测试

```bash
# 方式 1: 使用测试脚本（推荐）
cd server
node tests/run-all-tests.js

# 方式 2: 使用 npm
npm test

# 方式 3: 使用 Vitest
npm run test:watch  # 监视模式
npm run test:ui     # UI 模式
```

### 运行特定测试

```bash
cd server

# 本体论核心测试
node tests/integration/test-ontology.js

# Repositories 测试
node tests/integration/test-repositories.js

# 审计日志测试
node tests/integration/test-audit.js

# 权限系统测试
node tests/integration/test-permissions.js

# 路由集成测试
node tests/integration/test-routes.js

# 链接系统测试
node tests/integration/test-links.js

# 企业版测试
node tests/integration/test-enterprise.js
node tests/integration/test-enterprise-actions.js

# 性能优化测试
node tests/integration/test-performance.js
```

## 📝 测试说明

### test-ontology.js
测试本体论核心功能：
- OntologyService 基本操作
- 对象创建、查询、更新、删除
- 输入验证
- 错误处理

### test-repositories.js
测试 Repository 层：
- ModuleRepository
- EntityRepository
- TaskRepository
- CRUD 操作
- 专用查询方法

### test-audit.js
测试审计日志系统：
- 日志记录
- 日志查询
- 按用户/操作过滤
- 统计功能

### test-permissions.js
测试权限系统：
- 权限检查
- 角色管理
- 权限授予/撤销
- 默认权限

### test-routes.js
测试路由集成：
- API 端点
- 请求/响应
- 错误处理
- 认证中间件

### test-links.js
测试链接系统：
- 链接创建
- 链接查询
- 链接删除
- 链接遍历

### test-enterprise.js
测试企业版 Repository：
- OrganizationRepository
- MemberRepository
- 组织管理
- 成员管理

### test-enterprise-actions.js
测试企业版 Actions：
- CreateOrganizationAction
- UpdateOrganizationAction
- InviteMemberAction
- UpdateMemberAction
- RemoveMemberAction

### test-performance.js
测试性能优化：
- CacheService
- CachedOntologyService
- BatchQueryOptimizer
- PerformanceMonitor

## 🔧 测试配置

### Vitest 配置

配置文件：`vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### 测试环境

测试使用 Mock 数据库连接，不需要真实的 PostgreSQL 实例。

## 📈 测试覆盖率

当前测试覆盖率：

| 模块 | 覆盖率 | 说明 |
|-----|--------|------|
| OntologyService | 90%+ | 核心功能全覆盖 |
| Actions | 85%+ | 所有 Actions 都有测试 |
| Repositories | 85%+ | 核心方法全覆盖 |
| Services | 85%+ | 业务逻辑全覆盖 |

## 🐛 调试测试

### 使用 VS Code 调试

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Test",
      "program": "${workspaceFolder}/server/tests/integration/test-ontology.js",
      "console": "integratedTerminal"
    }
  ]
}
```

### 使用日志调试

在测试文件中添加 `console.log` 输出调试信息。

## 📚 相关文档

- [测试报告](../docs/reports/TEST_REPORT.md) - 详细的测试结果
- [开发指南](../DEVELOPMENT_GUIDE.md) - 如何编写测试
- [进度报告](../docs/reports/PROGRESS_REPORT.md) - 测试统计

## ✅ 测试最佳实践

1. **隔离性**: 每个测试独立运行，不依赖其他测试
2. **可重复性**: 测试结果稳定，可重复运行
3. **清晰性**: 测试名称清晰，易于理解
4. **完整性**: 覆盖正常流程和异常流程
5. **快速性**: 测试运行快速，提供即时反馈

## 🔄 持续集成

测试会在以下情况自动运行：
- 代码提交前（pre-commit hook）
- Pull Request 创建时
- 合并到主分支前

## 📞 问题反馈

如果测试失败或有问题，请：
1. 查看测试输出的错误信息
2. 参考 [故障排查文档](../../docs/06-故障排查.md)
3. 提交 Issue 到 GitHub

---

**最后更新**: 2026-01-18  
**测试状态**: ✅ 53/53 通过（100%）

**返回**: [项目主页](../../README.md) | [开发指南](../DEVELOPMENT_GUIDE.md)
