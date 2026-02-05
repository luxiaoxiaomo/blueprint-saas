# 服务端文档索引

本文档提供服务端所有文档的快速导航和说明。

## 📚 文档分类

### 🏗️ 核心文档（根目录）

这些是最重要的文档，位于 `server/` 根目录：

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | 完整的 RESTful API 文档 | 前端开发者、集成开发者 |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | 开发指南（环境设置、开发流程） | 后端开发者 |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | 部署指南（Docker、传统部署） | 运维人员、DevOps |
| [ACTIONS_REFERENCE.md](./ACTIONS_REFERENCE.md) | Actions 参考文档 | 后端开发者 |

### 📊 项目报告（docs/reports/）

项目的各类报告文档：

| 文档 | 说明 | 更新频率 |
|------|------|---------|
| [PROGRESS_REPORT.md](./docs/reports/PROGRESS_REPORT.md) | 项目进度报告 | 每阶段更新 |
| [TEST_REPORT.md](./docs/reports/TEST_REPORT.md) | 测试报告 | 每次测试后更新 |
| [PERFORMANCE_BENCHMARK.md](./docs/reports/PERFORMANCE_BENCHMARK.md) | 性能基准测试报告 | 重大更新后 |

### 📖 阶段总结（docs/stages/）

每个开发阶段的详细总结：

| 阶段 | 文档 | 主要内容 |
|------|------|---------|
| 阶段 1 | [STAGE1_SUMMARY.md](./docs/stages/STAGE1_SUMMARY.md) | 核心架构实现 |
| 阶段 2 | [STAGE2_SUMMARY.md](./docs/stages/STAGE2_SUMMARY.md) | 扩展 Actions |
| 阶段 3 | [STAGE3_SUMMARY.md](./docs/stages/STAGE3_SUMMARY.md) | 扩展 Repositories |
| 阶段 5 | [STAGE5_SUMMARY.md](./docs/stages/STAGE5_SUMMARY.md) | 权限系统 |
| 阶段 6 | [STAGE6_SUMMARY.md](./docs/stages/STAGE6_SUMMARY.md) | 路由集成 |
| 阶段 7 | [STAGE7_SUMMARY.md](./docs/stages/STAGE7_SUMMARY.md) | 链接系统 |
| 阶段 8 | [STAGE8_SUMMARY.md](./docs/stages/STAGE8_SUMMARY.md) | 企业版功能 |
| 阶段 9 | [STAGE9_SUMMARY.md](./docs/stages/STAGE9_SUMMARY.md) | 性能优化 |
| 阶段 10 | [STAGE10_SUMMARY.md](./docs/stages/STAGE10_SUMMARY.md) | 文档和部署 |

### 🧪 测试文档（tests/）

测试相关的文档和脚本：

| 文档/脚本 | 说明 |
|----------|------|
| [tests/README.md](./tests/README.md) | 测试目录说明 |
| [tests/run-all-tests.js](./tests/run-all-tests.js) | 运行所有测试的脚本 |
| [tests/integration/](./tests/integration/) | 集成测试文件目录 |

### 📝 源码文档（src/）

源码中的文档：

| 文档 | 说明 |
|------|------|
| [src/ontology/README.md](./src/ontology/README.md) | 本体论架构详细说明 |

## 🎯 按角色导航

### 新手开发者

**学习路径**：
1. 📖 [STAGE1_SUMMARY.md](./docs/stages/STAGE1_SUMMARY.md) - 了解核心架构
2. 📖 [src/ontology/README.md](./src/ontology/README.md) - 理解本体论设计
3. 💻 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 设置开发环境
4. 📡 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - 了解 API 接口

### 后端开发者

**常用文档**：
1. 💻 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 开发流程
2. ⚡ [ACTIONS_REFERENCE.md](./ACTIONS_REFERENCE.md) - Actions 参考
3. 📖 [src/ontology/README.md](./src/ontology/README.md) - 架构说明
4. 🧪 [tests/README.md](./tests/README.md) - 测试指南

### 前端开发者

**常用文档**：
1. 📡 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API 接口
2. 📊 [PROGRESS_REPORT.md](./docs/reports/PROGRESS_REPORT.md) - 功能进度
3. 🧪 [TEST_REPORT.md](./docs/reports/TEST_REPORT.md) - 测试状态

### 运维人员

**常用文档**：
1. 🚀 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南
2. 📊 [PERFORMANCE_BENCHMARK.md](./docs/reports/PERFORMANCE_BENCHMARK.md) - 性能数据
3. 📈 [PROGRESS_REPORT.md](./docs/reports/PROGRESS_REPORT.md) - 系统状态

### 项目经理

**常用文档**：
1. 📈 [PROGRESS_REPORT.md](./docs/reports/PROGRESS_REPORT.md) - 项目进度
2. 🧪 [TEST_REPORT.md](./docs/reports/TEST_REPORT.md) - 质量报告
3. 📊 [PERFORMANCE_BENCHMARK.md](./docs/reports/PERFORMANCE_BENCHMARK.md) - 性能指标

## 🔍 按主题导航

### 架构设计

- [src/ontology/README.md](./src/ontology/README.md) - 本体论架构
- [STAGE1_SUMMARY.md](./docs/stages/STAGE1_SUMMARY.md) - 核心架构实现
- [ACTIONS_REFERENCE.md](./ACTIONS_REFERENCE.md) - Actions 模式

### 功能实现

- [STAGE2_SUMMARY.md](./docs/stages/STAGE2_SUMMARY.md) - Project/Module Actions
- [STAGE3_SUMMARY.md](./docs/stages/STAGE3_SUMMARY.md) - Repositories
- [STAGE5_SUMMARY.md](./docs/stages/STAGE5_SUMMARY.md) - 权限系统
- [STAGE7_SUMMARY.md](./docs/stages/STAGE7_SUMMARY.md) - 链接系统
- [STAGE8_SUMMARY.md](./docs/stages/STAGE8_SUMMARY.md) - 企业功能

### 性能优化

- [STAGE9_SUMMARY.md](./docs/stages/STAGE9_SUMMARY.md) - 性能优化实现
- [PERFORMANCE_BENCHMARK.md](./docs/reports/PERFORMANCE_BENCHMARK.md) - 性能测试数据

### 测试

- [tests/README.md](./tests/README.md) - 测试指南
- [TEST_REPORT.md](./docs/reports/TEST_REPORT.md) - 测试报告
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#测试) - 如何编写测试

### 部署

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 完整部署指南
- [STAGE10_SUMMARY.md](./docs/stages/STAGE10_SUMMARY.md) - 文档和部署

### API

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - 完整 API 文档
- [STAGE6_SUMMARY.md](./docs/stages/STAGE6_SUMMARY.md) - 路由集成

## 📂 目录结构

```
server/
├── DOCUMENTATION_INDEX.md       # 本文件 - 文档索引
├── API_DOCUMENTATION.md         # API 文档
├── DEVELOPMENT_GUIDE.md         # 开发指南
├── DEPLOYMENT_GUIDE.md          # 部署指南
├── ACTIONS_REFERENCE.md         # Actions 参考
│
├── docs/                        # 文档目录
│   ├── README.md               # 文档目录说明
│   ├── stages/                 # 阶段总结
│   │   ├── STAGE1_SUMMARY.md
│   │   ├── STAGE2_SUMMARY.md
│   │   ├── STAGE3_SUMMARY.md
│   │   ├── STAGE5_SUMMARY.md
│   │   ├── STAGE6_SUMMARY.md
│   │   ├── STAGE7_SUMMARY.md
│   │   ├── STAGE8_SUMMARY.md
│   │   ├── STAGE9_SUMMARY.md
│   │   └── STAGE10_SUMMARY.md
│   └── reports/                # 项目报告
│       ├── PROGRESS_REPORT.md
│       ├── TEST_REPORT.md
│       └── PERFORMANCE_BENCHMARK.md
│
├── tests/                       # 测试目录
│   ├── README.md               # 测试说明
│   ├── run-all-tests.js        # 测试脚本
│   └── integration/            # 集成测试
│       ├── test-ontology.js
│       ├── test-repositories.js
│       ├── test-audit.js
│       ├── test-permissions.js
│       ├── test-routes.js
│       ├── test-links.js
│       ├── test-enterprise.js
│       ├── test-enterprise-actions.js
│       └── test-performance.js
│
└── src/                         # 源代码
    ├── ontology/
    │   └── README.md           # 本体论架构说明
    ├── repositories/
    ├── services/
    └── routes/
```

## 🔗 外部链接

### 项目文档

- [项目主页](../README.md)
- [用户文档](../docs/README.md)
- [项目完成总结](../PROJECT_COMPLETION_SUMMARY.md)

### 技术文档

- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Express 文档](https://expressjs.com/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Vitest 文档](https://vitest.dev/)

## 📝 文档规范

### 文档命名

- 核心文档：大写字母 + 下划线（如 `API_DOCUMENTATION.md`）
- 阶段文档：`STAGE{N}_SUMMARY.md`
- 测试文件：`test-{module}.js`

### 文档结构

每个文档应包含：
1. 标题和概述
2. 目录（如果内容较多）
3. 详细内容
4. 示例代码
5. 相关链接
6. 更新时间

### 更新规范

- 每次重大更新都要标注更新时间
- 保持文档与代码同步
- 及时更新链接

## 🔄 文档维护

### 更新频率

- **核心文档**: 功能变更时更新
- **阶段文档**: 阶段完成时创建，不再修改
- **报告文档**: 定期更新（每周/每月）
- **测试文档**: 测试变更时更新

### 维护责任

- 开发者：维护代码相关文档
- 测试人员：维护测试文档
- 项目经理：维护报告文档
- 技术写作：审核所有文档

## 📞 反馈

如果发现文档问题或有改进建议：
1. 提交 Issue 到 GitHub
2. 发送邮件到 docs@example.com
3. 在团队会议上提出

---

**最后更新**: 2026-01-18  
**文档版本**: 2.0.0  
**维护者**: 开发团队

**返回**: [项目主页](../README.md)
