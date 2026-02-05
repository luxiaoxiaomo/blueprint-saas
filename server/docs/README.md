# 服务端文档目录

本目录包含服务端的所有文档，已按类型分类整理。

## 📁 目录结构

```
server/docs/
├── README.md                    # 本文件
├── stages/                      # 阶段总结文档
│   ├── STAGE1_SUMMARY.md       # 阶段 1: 核心架构实现
│   ├── STAGE2_SUMMARY.md       # 阶段 2: 扩展 Actions
│   ├── STAGE3_SUMMARY.md       # 阶段 3: 扩展 Repositories
│   ├── STAGE5_SUMMARY.md       # 阶段 5: 权限系统
│   ├── STAGE6_SUMMARY.md       # 阶段 6: 路由集成
│   ├── STAGE7_SUMMARY.md       # 阶段 7: 链接系统
│   ├── STAGE8_SUMMARY.md       # 阶段 8: 企业版功能
│   ├── STAGE9_SUMMARY.md       # 阶段 9: 性能优化
│   └── STAGE10_SUMMARY.md      # 阶段 10: 文档和部署
└── reports/                     # 项目报告
    ├── PROGRESS_REPORT.md      # 进度报告
    ├── TEST_REPORT.md          # 测试报告
    └── PERFORMANCE_BENCHMARK.md # 性能基准测试报告
```

## 📚 文档分类

### 阶段总结文档 (stages/)

记录每个开发阶段的详细信息，包括：
- 实现的功能
- 技术细节
- 测试结果
- 使用示例
- 下一步计划

**阅读顺序**：按阶段编号顺序阅读（STAGE1 → STAGE10）

### 项目报告 (reports/)

项目的各类报告文档：

#### PROGRESS_REPORT.md
- 项目整体进度
- 各阶段完成情况
- 测试统计
- 性能指标
- 里程碑追踪

#### TEST_REPORT.md
- 所有测试套件的详细结果
- 测试覆盖率
- 测试用例说明
- 运行测试的方法

#### PERFORMANCE_BENCHMARK.md
- 详细的性能测试数据
- 各种场景的性能表现
- 性能优化建议
- 容量规划

## 🔗 相关文档

### 根目录文档

在 `server/` 根目录下还有以下重要文档：

- **API_DOCUMENTATION.md** - 完整的 API 接口文档
- **DEVELOPMENT_GUIDE.md** - 开发指南（环境设置、开发流程）
- **DEPLOYMENT_GUIDE.md** - 部署指南（Docker、传统部署）
- **ACTIONS_REFERENCE.md** - Actions 参考文档

### 源码文档

- **src/ontology/README.md** - 本体论架构说明

## 📖 快速导航

### 新手入门
1. 阅读 `STAGE1_SUMMARY.md` 了解核心架构
2. 查看 `DEVELOPMENT_GUIDE.md` 设置开发环境
3. 参考 `API_DOCUMENTATION.md` 了解接口

### 了解功能
1. 按顺序阅读 `stages/` 下的阶段文档
2. 查看 `PROGRESS_REPORT.md` 了解整体进度
3. 参考 `TEST_REPORT.md` 了解测试覆盖

### 性能优化
1. 阅读 `STAGE9_SUMMARY.md` 了解优化方案
2. 查看 `PERFORMANCE_BENCHMARK.md` 了解性能数据
3. 参考 `DEPLOYMENT_GUIDE.md` 进行生产配置

### 部署上线
1. 阅读 `DEPLOYMENT_GUIDE.md` 了解部署方式
2. 查看 `STAGE10_SUMMARY.md` 了解文档体系
3. 参考 `PERFORMANCE_BENCHMARK.md` 进行容量规划

## 🔄 文档更新

文档会随着项目发展持续更新。每次重大更新都会在相应文档中标注更新时间。

**最后更新**: 2026-01-18

---

**返回**: [项目主页](../../README.md) | [用户文档](../../docs/README.md)
