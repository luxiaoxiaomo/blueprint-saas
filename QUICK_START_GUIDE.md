# 快速开始指南 - 企业级 SaaS 升级

**最后更新**: 2026-01-21  
**版本**: 1.0.0

---

## 🚀 5分钟快速开始

### 1. 启动数据库
```bash
docker-compose up -d postgres
```

### 2. 启动后端服务
```bash
cd server
npm install
npm run dev
```

### 3. 启动前端应用
```bash
npm install
npm run dev
```

### 4. 访问应用
- 前端: http://localhost:3000
- 后端 API: http://localhost:5000
- 健康检查: http://localhost:5000/health

---

## 📋 常用命令

### 后端命令

```bash
# 编译
npm run build

# 开发模式（自动重启）
npm run dev:watch

# 运行测试
npm run test

# 运行隔离测试
npm run test:isolation

# 运行数据库层测试
npm run test:isolation:db

# 运行 API 层测试
npm run test:isolation:api
```

### 前端命令

```bash
# 开发模式
npm run dev

# 编译生产版本
npm run build

# 预览生产版本
npm run preview
```

### 数据库命令

```bash
# 连接数据库
psql -h localhost -U postgres -d blueprint_saas

# 执行迁移
node server/migrations/run-migration.js 001_add_organization_to_projects.sql

# 备份数据库
pg_dump -h localhost -U postgres blueprint_saas > backup.sql

# 恢复数据库
psql -h localhost -U postgres blueprint_saas < backup.sql
```

---

## 🔑 关键概念

### 多租户隔离
- 每个组织的数据完全隔离
- 用户只能访问自己组织的资源
- 所有查询自动添加组织过滤

### 本体论架构
- 灵活的对象和链接系统
- 所有写操作通过 Actions 执行
- 完整的审计日志记录

### 权限控制
- 基于角色的权限 (RBAC)
- 组织级和项目级权限
- 细粒度的权限检查

---

## 📁 项目结构

```
blueprint-saas/
├── server/                          # 后端
│   ├── src/
│   │   ├── routes/                 # API 路由
│   │   ├── middleware/             # 中间件
│   │   ├── services/               # 业务逻辑
│   │   ├── repositories/           # 数据访问
│   │   ├── ontology/               # 本体论
│   │   └── index.ts                # 入口
│   ├── tests/                      # 测试
│   ├── migrations/                 # 数据库迁移
│   └── package.json
├── components/                      # 前端组件
├── services/                        # 前端服务
├── docs/                           # 文档
└── package.json
```

---

## 🔐 安全检查

### 部署前检查清单

- [ ] 运行所有测试
  ```bash
  npm run test:isolation
  ```

- [ ] 检查编译错误
  ```bash
  npm run build
  ```

- [ ] 验证数据库迁移
  ```bash
  # 检查 organization_id 列
  SELECT COUNT(*) FROM projects WHERE organization_id IS NULL;
  ```

- [ ] 检查审计日志
  ```bash
  SELECT COUNT(*) FROM audit_logs;
  ```

- [ ] 验证索引
  ```bash
  SELECT * FROM pg_indexes WHERE tablename = 'projects';
  ```

---

## 🧪 测试指南

### 运行所有测试

```bash
cd server
npm run test:isolation
```

### 运行特定测试

```bash
# 数据库层测试
npm run test:isolation:db

# API 层测试
npm run test:isolation:api

# 特定测试套件
npx vitest run -t "项目隔离测试"
```

### 查看测试覆盖率

```bash
npx vitest run --coverage
```

---

## 📊 API 端点

### 认证
```
POST   /api/auth/login              登录
POST   /api/auth/register           注册
POST   /api/auth/logout             登出
```

### 成员管理
```
GET    /api/members                 获取成员列表
GET    /api/members/:id             获取成员详情
POST   /api/members                 邀请成员
PUT    /api/members/:id             更新成员
DELETE /api/members/:id             移除成员
```

### 部门管理
```
GET    /api/departments             获取部门列表
GET    /api/departments/:id         获取部门详情
POST   /api/departments             创建部门
PUT    /api/departments/:id         更新部门
DELETE /api/departments/:id         删除部门
```

### 项目管理
```
GET    /api/projects                获取项目列表
GET    /api/projects/:id            获取项目详情
POST   /api/projects                创建项目
PUT    /api/projects/:id            更新项目
DELETE /api/projects/:id            删除项目
```

### 实体管理
```
GET    /api/entities?projectId=xxx  获取实体列表
GET    /api/entities/:id            获取实体详情
POST   /api/entities                创建实体
PUT    /api/entities/:id            更新实体
DELETE /api/entities/:id            删除实体
```

### 任务管理
```
GET    /api/tasks?projectId=xxx     获取任务列表
GET    /api/tasks/:id               获取任务详情
POST   /api/tasks                   创建任务
PUT    /api/tasks/:id               更新任务
DELETE /api/tasks/:id               删除任务
PATCH  /api/tasks/:id/status        更新任务状态
```

### 链接管理
```
GET    /api/links?sourceId=xxx      获取链接列表
GET    /api/links/:id               获取链接详情
POST   /api/links                   创建链接
PUT    /api/links/:id               更新链接
DELETE /api/links/:id               删除链接
```

### 审计日志
```
GET    /api/audit-logs              获取审计日志
GET    /api/audit-logs/:id          获取日志详情
```

---

## 🐛 故障排查

### 问题: 连接不到数据库

**解决方案**:
```bash
# 检查容器是否运行
docker ps | grep postgres

# 检查数据库配置
echo $DB_HOST $DB_PORT $DB_USER

# 重启数据库
docker-compose restart postgres
```

### 问题: 后端启动失败

**解决方案**:
```bash
# 检查依赖
npm install

# 清理编译文件
rm -rf dist

# 重新编译
npm run build

# 查看错误日志
npm run dev 2>&1 | head -50
```

### 问题: 测试失败

**解决方案**:
```bash
# 查看详细错误
npm run test:isolation -- --reporter=verbose

# 清理测试数据
npm run test:isolation

# 检查数据库状态
psql -h localhost -U postgres -d blueprint_saas -c "SELECT COUNT(*) FROM projects;"
```

### 问题: 性能缓慢

**解决方案**:
```bash
# 检查索引
SELECT * FROM pg_indexes WHERE tablename = 'projects';

# 分析查询性能
EXPLAIN ANALYZE SELECT * FROM projects WHERE organization_id = 'xxx';

# 检查连接池
SELECT count(*) FROM pg_stat_activity;
```

---

## 📚 文档导航

### 快速参考
- `QUICK_REFERENCE.md` - 快速命令参考
- `QUICK_START_GUIDE.md` - 本文档

### 详细文档
- `server/DATA_ISOLATION_IMPLEMENTATION.md` - 数据隔离实施
- `server/API_DOCUMENTATION.md` - API 文档
- `server/DEVELOPMENT_GUIDE.md` - 开发指南
- `server/DEPLOYMENT_GUIDE.md` - 部署指南

### 测试文档
- `server/tests/ISOLATION_TESTS_README.md` - 隔离测试指南
- `DATA_ISOLATION_SECURITY_TESTS_COMPLETE.md` - 测试完成报告

### 项目文档
- `ENTERPRISE_SAAS_PHASE1_COMPLETE.md` - 第一阶段完成报告
- `PROJECT_COMPLETION_SUMMARY.md` - 项目完成总结

---

## 🎯 常见任务

### 创建新组织

```bash
# 通过 API
curl -X POST http://localhost:5000/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Organization",
    "identifier": "my-org",
    "plan": "free"
  }'
```

### 邀请成员

```bash
# 通过 API
curl -X POST http://localhost:5000/api/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "user@example.com",
    "role": "developer"
  }'
```

### 创建项目

```bash
# 通过 API
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Project",
    "description": "Project description"
  }'
```

### 查看审计日志

```bash
# 通过 API
curl http://localhost:5000/api/audit-logs \
  -H "Authorization: Bearer $TOKEN"

# 通过数据库
psql -h localhost -U postgres -d blueprint_saas \
  -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## 🔗 有用的链接

### 官方文档
- [Express.js](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)

### 工具
- [Postman](https://www.postman.com/) - API 测试
- [pgAdmin](https://www.pgadmin.org/) - 数据库管理
- [VS Code](https://code.visualstudio.com/) - 代码编辑

### 社区
- [GitHub Issues](https://github.com/issues) - 问题报告
- [Stack Overflow](https://stackoverflow.com/) - 技术问答

---

## 📞 获取帮助

### 查看日志

```bash
# 后端日志
tail -f server/logs/app.log

# 数据库日志
docker logs postgres

# 前端控制台
# 打开浏览器开发者工具 (F12)
```

### 检查状态

```bash
# 后端健康检查
curl http://localhost:5000/health

# 数据库连接
psql -h localhost -U postgres -d blueprint_saas -c "SELECT 1;"

# 前端应用
curl http://localhost:3000
```

### 联系支持

1. 查看相关文档
2. 检查日志和错误信息
3. 运行诊断命令
4. 联系开发团队

---

## ✅ 检查清单

### 开发环境设置
- [ ] Node.js 18+ 已安装
- [ ] PostgreSQL 已安装
- [ ] Docker 已安装
- [ ] Git 已配置

### 项目初始化
- [ ] 克隆仓库
- [ ] 安装依赖
- [ ] 配置环境变量
- [ ] 初始化数据库

### 开发准备
- [ ] 后端编译成功
- [ ] 前端编译成功
- [ ] 所有测试通过
- [ ] 应用可以启动

### 部署准备
- [ ] 代码审查完成
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 备份已创建

---

## 🎓 学习路径

### 初级 (1-2 天)
1. 理解多租户架构
2. 学习本体论设计
3. 运行示例代码
4. 阅读 API 文档

### 中级 (3-5 天)
1. 修改现有功能
2. 添加新的 API 端点
3. 编写测试
4. 部署到测试环境

### 高级 (1-2 周)
1. 设计新功能
2. 实现复杂业务逻辑
3. 性能优化
4. 安全加固

---

## 📝 总结

这个快速开始指南涵盖了：
- ✅ 快速启动步骤
- ✅ 常用命令
- ✅ API 端点
- ✅ 故障排查
- ✅ 文档导航
- ✅ 常见任务

**下一步**: 选择一个任务开始开发！

---

**最后更新**: 2026-01-21  
**维护者**: Kiro AI  
**项目**: 蓝图平台企业级 SaaS 升级
