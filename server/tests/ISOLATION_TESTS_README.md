# 数据隔离安全测试文档

## 概述

本文档描述了数据隔离机制的完整测试套件，用于验证多租户系统的数据安全隔离。

**测试目标**:
- ✅ 验证租户数据完全隔离
- ✅ 验证跨组织访问被拒绝
- ✅ 验证权限控制正常工作
- ✅ 验证审计日志记录完整
- ✅ 验证数据一致性

---

## 测试文件

### 1. `test-data-isolation.js` - 数据库层隔离测试

**测试范围**: 数据库查询和数据隔离

**测试套件**:

#### 项目隔离测试
- ✅ 用户1应该能访问自己组织的项目
- ✅ 用户1不应该能访问其他组织的项目
- ✅ 数据库查询应该自动过滤组织ID

#### 成员隔离测试
- ✅ 组织1的成员列表应该只包含组织1的成员
- ✅ 组织2的成员列表应该只包含组织2的成员
- ✅ 用户1不应该能看到用户2

#### 审计日志隔离测试
- ✅ 审计日志应该记录操作者的组织ID

#### 跨组织访问防护测试
- ✅ 不应该能通过 SQL 注入访问其他组织的数据
- ✅ 应该使用参数化查询防止 SQL 注入

#### 权限验证测试
- ✅ 应该验证用户是否属于组织
- ✅ 应该拒绝不属于组织的用户访问

#### 数据一致性测试
- ✅ 所有项目都应该有 organization_id
- ✅ 所有成员都应该有 organization_id
- ✅ organization_id 应该与用户的组织一致

#### 索引性能测试
- ✅ organization_id 索引应该存在
- ✅ 应该能快速查询特定组织的项目

### 2. `test-api-isolation.js` - API 层隔离测试

**测试范围**: API 端点的权限控制和隔离

**测试套件**:

#### 项目 API 隔离测试
- ✅ GET /api/projects 应该返回 401（未认证）
- ✅ GET /api/projects/:id 应该验证项目权限

#### 实体 API 隔离测试
- ✅ GET /api/entities?projectId=xxx 应该验证项目权限
- ✅ GET /api/entities/:id 应该验证实体权限
- ✅ POST /api/entities 应该验证项目权限

#### 任务 API 隔离测试
- ✅ GET /api/tasks?projectId=xxx 应该验证项目权限
- ✅ POST /api/tasks 应该验证项目权限

#### 链接 API 隔离测试
- ✅ GET /api/links?sourceId=xxx 应该验证权限
- ✅ POST /api/links 应该验证权限

#### 审计日志测试
- ✅ 所有修改操作都应该被记录
- ✅ 审计日志应该包含必要的字段

#### 错误处理测试
- ✅ 访问不存在的资源应该返回 404
- ✅ 无效的请求应该返回 400
- ✅ 未认证的请求应该返回 401

#### 数据一致性验证
- ✅ 项目应该有 organization_id
- ✅ 实体应该有 project_id
- ✅ 模块应该有 project_id

#### 跨组织访问防护
- ✅ 组织1的用户不应该能访问组织2的项目
- ✅ 组织1的用户不应该能访问组织2的实体

---

## 运行测试

### 前置条件

1. **启动数据库**
   ```bash
   docker-compose up -d postgres
   ```

2. **启动后端服务**
   ```bash
   cd server
   npm run dev
   ```

3. **等待服务启动**
   - 确保 API 在 http://localhost:5000 可访问
   - 确保数据库连接正常

### 运行所有隔离测试

```bash
cd server
npm run test:isolation
```

### 运行特定测试文件

```bash
# 运行数据库层隔离测试
npx vitest run tests/integration/test-data-isolation.js

# 运行 API 层隔离测试
npx vitest run tests/integration/test-api-isolation.js
```

### 运行特定测试套件

```bash
# 运行项目隔离测试
npx vitest run tests/integration/test-data-isolation.js -t "项目隔离测试"

# 运行权限验证测试
npx vitest run tests/integration/test-data-isolation.js -t "权限验证测试"
```

### 查看详细输出

```bash
# 显示详细的测试输出
npx vitest run --reporter=verbose tests/integration/test-data-isolation.js

# 显示覆盖率报告
npx vitest run --coverage tests/integration/test-data-isolation.js
```

---

## 测试数据

### 测试环境设置

每个测试文件都会自动创建以下测试数据：

**用户**:
- User 1: org1user@test.com (属于 Organization 1)
- User 2: org2user@test.com (属于 Organization 2)

**组织**:
- Organization 1: testorg1
- Organization 2: testorg2

**项目**:
- Project 1: 属于 Organization 1
- Project 2: 属于 Organization 2

**模块**:
- Module 1: 属于 Project 1
- Module 2: 属于 Project 2

**实体**:
- Entity 1: 属于 Project 1
- Entity 2: 属于 Project 2

### 测试数据清理

所有测试完成后，测试数据会自动清理：
- 删除创建的实体、模块、项目
- 删除创建的成员、组织
- 删除创建的用户

---

## 测试结果解释

### 成功的测试

```
✅ 用户1应该能访问自己组织的项目
```

表示测试通过，数据隔离机制正常工作。

### 失败的测试

```
❌ 用户1不应该能访问其他组织的项目
```

表示测试失败，可能存在数据隔离问题。

### 跳过的测试

```
⊘ 某个测试被跳过
```

表示测试被跳过，通常是因为前置条件不满足。

---

## 常见问题

### Q: 测试连接不到数据库

**A**: 确保：
1. PostgreSQL 容器正在运行: `docker ps | grep postgres`
2. 数据库配置正确: 检查 `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
3. 数据库已初始化: 运行 `npm run db:init`

### Q: 测试连接不到 API

**A**: 确保：
1. 后端服务正在运行: `npm run dev`
2. API 地址正确: 默认为 `http://localhost:5000`
3. 服务已完全启动: 检查日志中是否有错误

### Q: 某些测试失败

**A**: 
1. 检查测试日志中的错误信息
2. 验证数据库中的数据是否正确
3. 检查是否有其他进程占用端口
4. 清理测试数据后重新运行: `npm run test:isolation`

### Q: 如何调试失败的测试

**A**: 
1. 添加 `console.log()` 语句到测试代码
2. 使用 `--reporter=verbose` 查看详细输出
3. 在测试中添加 `debugger` 语句并使用 Node 调试器
4. 检查数据库中的实际数据

---

## 性能基准

### 预期性能

| 操作 | 预期时间 | 实际时间 |
|------|--------|--------|
| 查询单个项目 | < 10ms | - |
| 查询组织的所有项目 | < 50ms | - |
| 创建新项目 | < 100ms | - |
| 创建新实体 | < 50ms | - |
| 创建新链接 | < 50ms | - |

### 性能测试

运行性能测试：
```bash
npx vitest run tests/integration/test-data-isolation.js -t "索引性能测试"
```

---

## 安全检查清单

在部署到生产环境前，确保：

- [ ] 所有隔离测试都通过
- [ ] 没有 SQL 注入漏洞
- [ ] 所有 API 端点都验证权限
- [ ] 所有修改操作都记录审计日志
- [ ] 数据库索引已创建
- [ ] 性能满足要求
- [ ] 错误处理正确
- [ ] 没有敏感信息泄露

---

## 持续集成

### GitHub Actions 配置

```yaml
name: Data Isolation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run isolation tests
        run: npm run test:isolation
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USER: postgres
          DB_PASSWORD: postgres
          DB_NAME: blueprint_saas
```

---

## 相关文档

- `server/DATA_ISOLATION_IMPLEMENTATION.md` - 实施指南
- `server/DATA_ISOLATION_PROGRESS.md` - 进度跟踪
- `DATA_ISOLATION_CURRENT_STATUS.md` - 当前状态
- `server/API_DOCUMENTATION.md` - API 文档

---

## 支持

如有问题或建议，请：
1. 检查本文档的常见问题部分
2. 查看测试日志中的错误信息
3. 联系开发团队

---

**最后更新**: 2026-01-21  
**维护者**: Kiro AI  
**项目**: 蓝图平台企业级 SaaS 升级
