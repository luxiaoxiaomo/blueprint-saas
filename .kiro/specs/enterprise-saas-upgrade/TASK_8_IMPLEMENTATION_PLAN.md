# 任务 8：实施计划 - 项目对象类型扩展

## 📋 执行摘要

任务 8 是第二阶段的基础任务，目标是实现项目协作功能。本文档是实施计划，指导整个实施过程。

**总体工作量**：26-33 小时
**预计完成时间**：3-4 天（每天 8 小时）

---

## 🎯 实施阶段

### 第一阶段：基础设施（第 1 天）
**目标**：建立数据库、类型定义和 Repository 层

1. **数据库迁移**
   - 创建 `project_members` 表
   - 扩展 `projects` 表
   - 创建必要的索引

2. **类型定义**
   - 定义 `ProjectMemberObject`
   - 定义相关的输入/输出类型
   - 添加类型守卫函数

3. **Repository 实现**
   - 扩展 `ProjectRepository`
   - 创建 `ProjectMemberRepository`
   - 添加单元测试

**预计工作量**：6-8 小时

---

### 第二阶段：业务逻辑（第 2 天）
**目标**：实现 Action 和 Service 层

1. **Action 实现**
   - `ShareProjectAction` - 共享项目
   - `UpdateProjectMemberRoleAction` - 更新成员角色
   - `RemoveProjectMemberAction` - 移除成员
   - `EnableApprovalWorkflowAction` - 启用审批
   - `DisableApprovalWorkflowAction` - 禁用审批
   - 修改 `CreateProjectAction` - 自动添加所有者

2. **Service 实现**
   - `ProjectCollaborationService` - 项目协作服务
   - 权限检查逻辑
   - 缓存策略

3. **测试**
   - 单元测试
   - 集成测试

**预计工作量**：8-10 小时

---

### 第三阶段：API 和前端（第 3 天）
**目标**：实现 API 路由和前端组件

1. **API 路由**
   - 项目共享相关端点
   - 审批流程相关端点
   - 权限检查和数据隔离

2. **前端组件**
   - `ProjectSharingModal` - 项目共享对话框
   - `ProjectMembersPanel` - 项目成员面板
   - `ApprovalConfigPanel` - 审批配置面板

3. **集成测试**
   - 端到端测试
   - 权限检查测试
   - 数据隔离测试

**预计工作量**：6-8 小时

---

### 第四阶段：优化和文档（第 4 天）
**目标**：性能优化、安全审查和文档更新

1. **性能优化**
   - 缓存策略实施
   - 查询优化
   - 性能测试

2. **安全审查**
   - 权限检查验证
   - 数据隔离验证
   - SQL 注入防护

3. **文档更新**
   - API 文档
   - 开发指南
   - 用户文档

4. **数据迁移**
   - 处理现有项目
   - 处理现有成员
   - 验证迁移结果

**预计工作量**：6-7 小时

---

## 📊 当前状态

### ✅ 已完成
- 任务 8 详细设计文档
- 关键问题识别和修正方案
- 实施检查清单

### ⏳ 待完成
- 数据库迁移脚本
- 类型定义
- Repository 实现
- Action 实现
- Service 实现
- API 路由
- 前端组件
- 测试
- 文档更新

---

## 🚀 立即行动

### 今天的任务（第 1 天）

#### 1. 创建数据库迁移脚本
- 文件：`server/migrations/002_create_project_members_table.sql`
- 内容：创建 `project_members` 表，扩展 `projects` 表

#### 2. 定义类型
- 文件：`server/src/ontology/types.ts`
- 添加：`ProjectMemberObject` 接口和类型守卫

#### 3. 创建 ProjectMemberRepository
- 文件：`server/src/repositories/ProjectMemberRepository.ts`
- 实现：基本的 CRUD 操作

#### 4. 扩展 ProjectRepository
- 文件：`server/src/repositories/ProjectRepository.ts`
- 添加：项目成员相关的查询方法

#### 5. 添加单元测试
- 文件：`server/src/repositories/__tests__/ProjectMemberRepository.test.ts`
- 测试：Repository 的所有方法

---

## 📝 关键注意事项

1. **数据隔离**：所有查询都必须包含 `organization_id` 过滤
2. **权限检查**：所有操作都必须进行权限检查
3. **userId vs memberId**：严格区分这两个概念
4. **向后兼容**：现有项目必须能够正确迁移
5. **测试驱动**：每个功能都应该有对应的测试

---

## 🔗 相关文档

- `TASK_8_PROJECT_EXTENSION_DESIGN.md` - 详细设计
- `TASK_8_CRITICAL_FINDINGS.md` - 关键发现
- `TASK_8_IMPLEMENTATION_CHECKLIST.md` - 实施检查清单

---

## 📞 联系方式

如有问题，请参考相关设计文档或联系项目负责人。

