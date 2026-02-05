# 归档文档

本目录包含项目历史文档和已被新版本替代的旧文档。

## 📁 文件说明

| 文件 | 原文件名 | 说明 | 归档日期 |
|------|---------|------|---------|
| [old-project-summary.md](./old-project-summary.md) | 项目完成总结.md | 旧版项目总结 | 2026-01-18 |
| [old-doc-list.md](./old-doc-list.md) | 文档清单.md | 旧版文档清单 | 2026-01-18 |
| [old-ontology-summary.md](./old-ontology-summary.md) | ONTOLOGY_REFACTORING_SUMMARY.md | 旧版本体论总结 | 2026-01-18 |

## 📋 归档原因

### old-project-summary.md

**原因**: 已被新版本替代

**新版本**: [PROJECT_COMPLETION_SUMMARY.md](../../PROJECT_COMPLETION_SUMMARY.md)

**主要区别**:
- 旧版: SaaS 版本的项目总结
- 新版: 本体论架构重构的完整总结，包含 10 个阶段的详细信息

### old-doc-list.md

**原因**: 文档结构已重新组织

**新版本**: 
- [docs/README.md](../README.md) - 用户文档索引
- [server/DOCUMENTATION_INDEX.md](../../server/DOCUMENTATION_INDEX.md) - 开发文档索引

**主要区别**:
- 旧版: 简单的文档列表
- 新版: 完整的文档导航系统，按角色和主题分类

### old-ontology-summary.md

**原因**: 已被阶段文档替代

**新版本**: 
- [server/docs/stages/](../../server/docs/stages/) - 10 个阶段的详细文档
- [PROJECT_COMPLETION_SUMMARY.md](../../PROJECT_COMPLETION_SUMMARY.md) - 项目完成总结

**主要区别**:
- 旧版: 单个文件记录所有阶段
- 新版: 每个阶段独立文档，更详细和结构化

## 🔍 查找新文档

### 项目总结

**旧位置**: `项目完成总结.md`  
**新位置**: [PROJECT_COMPLETION_SUMMARY.md](../../PROJECT_COMPLETION_SUMMARY.md)

### 文档索引

**旧位置**: `文档清单.md`  
**新位置**: 
- 用户文档: [docs/README.md](../README.md)
- 开发文档: [server/DOCUMENTATION_INDEX.md](../../server/DOCUMENTATION_INDEX.md)

### 本体论总结

**旧位置**: `ONTOLOGY_REFACTORING_SUMMARY.md`  
**新位置**: 
- 阶段文档: [server/docs/stages/](../../server/docs/stages/)
- 项目总结: [PROJECT_COMPLETION_SUMMARY.md](../../PROJECT_COMPLETION_SUMMARY.md)

## 📊 文档演进历史

### 第一版 (2026-01-16)

**特点**:
- 基础的 SaaS 功能
- Docker 部署
- 用户认证系统

**文档**:
- 项目完成总结.md
- 文档清单.md
- 快速开始指南

### 第二版 (2026-01-17 - 2026-01-18)

**特点**:
- 本体论架构重构
- 10 个阶段实现
- 企业级功能
- 性能优化

**文档**:
- 10 个阶段总结文档
- 完整的 API 文档
- 开发指南
- 部署指南
- 性能基准报告

### 当前版本 (2026-01-18)

**特点**:
- 完整的文档体系
- 清晰的目录结构
- 按角色和主题分类
- 完善的导航系统

**文档结构**:
```
docs/
├── README.md                    # 用户文档索引
├── 01-快速开始.md
├── 02-Docker安装.md
├── ...
├── database/                    # 数据库文档
├── tools/                       # 工具文档
└── archive/                     # 归档文档

server/
├── DOCUMENTATION_INDEX.md       # 开发文档索引
├── API_DOCUMENTATION.md
├── DEVELOPMENT_GUIDE.md
├── DEPLOYMENT_GUIDE.md
├── docs/
│   ├── stages/                  # 阶段文档
│   └── reports/                 # 项目报告
└── tests/                       # 测试文档
```

## ⚠️ 使用说明

### 这些文档还有用吗？

**有用的情况**:
- 了解项目历史
- 查看早期设计思路
- 对比新旧版本差异

**不推荐的情况**:
- 作为当前项目的参考
- 用于新功能开发
- 分享给新成员

### 应该使用哪些文档？

**新成员**: 从 [README.md](../../README.md) 开始

**开发者**: 查看 [server/DOCUMENTATION_INDEX.md](../../server/DOCUMENTATION_INDEX.md)

**用户**: 查看 [docs/README.md](../README.md)

## 🗑️ 删除政策

### 保留期限

归档文档将保留至少 6 个月，之后可以考虑删除。

### 删除条件

满足以下所有条件时可以删除：
- [ ] 归档超过 6 个月
- [ ] 新文档已完全覆盖旧内容
- [ ] 没有人引用这些文档
- [ ] 团队同意删除

### 删除前检查

1. 确认没有外部链接指向这些文档
2. 确认 Git 历史中已有备份
3. 通知团队成员
4. 创建最终备份

## 📞 问题反馈

如果你需要这些归档文档中的信息，但在新文档中找不到：

1. 查看 [DOCUMENTATION_INDEX.md](../../server/DOCUMENTATION_INDEX.md)
2. 搜索相关关键词
3. 提交 Issue 说明需求
4. 联系文档维护者

## 🔗 相关链接

### 当前文档

- [项目主页](../../README.md)
- [用户文档](../README.md)
- [开发文档](../../server/DOCUMENTATION_INDEX.md)
- [项目完成总结](../../PROJECT_COMPLETION_SUMMARY.md)

### 归档说明

- [归档完成总结](../../ARCHIVE_COMPLETION_SUMMARY.md)
- [服务端归档说明](../../server/ARCHIVE_NOTES.md)
- [主目录整理方案](../../MAIN_DIRECTORY_ORGANIZATION.md)

---

**归档日期**: 2026-01-18  
**维护者**: 开发团队  
**保留期限**: 至少 6 个月
