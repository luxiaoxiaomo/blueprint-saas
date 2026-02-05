# 任务 8：实施检查清单

## 📋 核心实施清单

### 第一部分：关键修正（必须）

#### 1. 项目所有者自动添加
- [ ] 修改 `CreateProjectAction` 的 `execute` 方法
- [ ] 在 `ProjectMemberRepository` 中实现 `addMember` 方法
- [ ] 添加单元测试
- [ ] 添加集成测试
- [ ] 验证项目创建后自动添加 owner

#### 2. userId vs memberId 区分
- [ ] 审查所有 Action 中的参数使用
- [ ] 审查所有 API 端点中的参数处理
- [ ] 在 `ShareProjectAction` 中添加 memberId 验证
- [ ] 在 `UpdateProjectMemberRoleAction` 中添加 memberId 验证
- [ ] 在 `RemoveProjectMemberAction` 中添加 memberId 验证
- [ ] 添加集成测试验证 memberId 的正确性

---

### 第二部分：数据库设计

#### 3. 创建 project_members 表
- [ ] 编写迁移脚本
- [ ] 创建表结构
- [ ] 创建索引
- [ ] 添加外键约束
- [ ] 验证数据隔离（organization_id）

#### 4. 扩展 projects 表
- [ ] 添加 approval_enabled 字段
- [ ] 添加 approval_config 字段
- [ ] 添加 permission_overrides 字段
- [ ] 添加 visibility 字段
- [ ] 添加 shared_at 字段
- [ ] 添加 shared_by 字段
- [ ] 创建索引

#### 5. 创建 project_presence 表（P1）
- [ ] 编写迁移脚本
- [ ] 创建表结构
- [ ] 创建索引
- [ ] 添加外键约束

#### 6. 创建 project_member_history 表（P2）
- [ ] 编写迁移脚本
- [ ] 创建表结构
- [ ] 创建索引

---

### 第三部分：类型定义

#### 7. 定义 ProjectMemberObject
- [ ] 在 `types.ts` 中定义接口
- [ ] 添加类型守卫函数
- [ ] 验证与数据库表的对应关系

#### 8. 定义 ProjectPresenceObject（P1）
- [ ] 在 `types.ts` 中定义接口
- [ ] 添加类型守卫函数

#### 9. 定义 ProjectMemberHistoryObject（P2）
- [ ] 在 `types.ts` 中定义接口
- [ ] 添加类型守卫函数

---

### 第四部分：Repository 实现

#### 10. 实现 ProjectRepository 扩展
- [ ] 实现 `getProjectMembers` 方法
- [ ] 实现 `hasProjectAccess` 方法
- [ ] 实现 `getProjectMemberRole` 方法
- [ ] 实现 `getProjectMembersWithRoles` 方法
- [ ] 添加单元测试

#### 11. 实现 ProjectMemberRepository
- [ ] 继承 `TenantAwareRepository`
- [ ] 实现 `addMember` 方法
- [ ] 实现 `updateMemberRole` 方法
- [ ] 实现 `removeMember` 方法
- [ ] 实现 `getProjectMembers` 方法
- [ ] 实现 `getMemberProjects` 方法
- [ ] 实现 `isProjectOwner` 方法
- [ ] 实现 `getProjectMember` 方法
- [ ] 添加单元测试

#### 12. 实现 ProjectPresenceRepository（P1）
- [ ] 继承 `TenantAwareRepository`
- [ ] 实现 `updatePresence` 方法
- [ ] 实现 `getActiveUsers` 方法
- [ ] 实现 `updateEditingElement` 方法
- [ ] 实现 `cleanupOfflineUsers` 方法

#### 13. 实现 ProjectMemberHistoryRepository（P2）
- [ ] 继承 `TenantAwareRepository`
- [ ] 实现 `create` 方法
- [ ] 实现 `getHistory` 方法

---

### 第五部分：Action 实现

#### 14. 实现 ShareProjectAction
- [ ] 创建文件 `server/src/ontology/actions/ShareProjectAction.ts`
- [ ] 实现 `validate` 方法
  - [ ] 验证项目存在
  - [ ] 验证成员存在且属于同一组织
  - [ ] 验证当前用户是项目所有者
  - [ ] 验证成员未被添加到项目
- [ ] 实现 `execute` 方法
  - [ ] 创建 ProjectMember 对象
  - [ ] 更新项目 visibility
  - [ ] 创建通知（可选）
- [ ] 实现 `audit` 方法
- [ ] 添加单元测试
- [ ] 添加集成测试

#### 15. 实现 UpdateProjectMemberRoleAction
- [ ] 创建文件 `server/src/ontology/actions/UpdateProjectMemberRoleAction.ts`
- [ ] 实现 `validate` 方法
  - [ ] 验证项目成员存在
  - [ ] 验证当前用户有权限修改
  - [ ] 检测权限冲突（不能移除最后一个 owner）
- [ ] 实现 `execute` 方法
  - [ ] 更新角色
  - [ ] 记录历史（P2）
- [ ] 实现 `audit` 方法
- [ ] 添加单元测试
- [ ] 添加集成测试

#### 16. 实现 RemoveProjectMemberAction
- [ ] 创建文件 `server/src/ontology/actions/RemoveProjectMemberAction.ts`
- [ ] 实现 `validate` 方法
  - [ ] 验证项目成员存在
  - [ ] 验证当前用户有权限移除
  - [ ] 检测权限冲突（不能移除最后一个 owner）
- [ ] 实现 `execute` 方法
  - [ ] 删除 ProjectMember 记录
  - [ ] 如果项目没有其他成员，更新 visibility 为 'private'
- [ ] 实现 `audit` 方法
- [ ] 添加单元测试
- [ ] 添加集成测试

#### 17. 实现 EnableApprovalWorkflowAction
- [ ] 创建文件 `server/src/ontology/actions/EnableApprovalWorkflowAction.ts`
- [ ] 实现 `validate` 方法
  - [ ] 验证项目存在
  - [ ] 验证当前用户是项目所有者
  - [ ] 验证审批者都是项目成员
- [ ] 实现 `execute` 方法
  - [ ] 更新项目的 approvalEnabled 和 approvalConfig
- [ ] 实现 `audit` 方法
- [ ] 添加单元测试
- [ ] 添加集成测试

#### 18. 实现 DisableApprovalWorkflowAction
- [ ] 创建文件 `server/src/ontology/actions/DisableApprovalWorkflowAction.ts`
- [ ] 实现 `validate` 方法
  - [ ] 验证项目存在
  - [ ] 验证当前用户是项目所有者
- [ ] 实现 `execute` 方法
  - [ ] 更新项目的 approvalEnabled 为 false
- [ ] 实现 `audit` 方法
- [ ] 添加单元测试
- [ ] 添加集成测试

#### 19. 修改 CreateProjectAction
- [ ] 添加自动添加项目所有者的逻辑
- [ ] 添加单元测试
- [ ] 添加集成测试

#### 20. 修改 RemoveMemberFromOrganizationAction（P1）
- [ ] 添加级联删除项目成员的逻辑
- [ ] 添加单元测试
- [ ] 添加集成测试

---

### 第六部分：Service 实现

#### 21. 实现 ProjectCollaborationService
- [ ] 创建文件 `server/src/services/ProjectCollaborationService.ts`
- [ ] 实现 `shareProject` 方法
- [ ] 实现 `unshareProject` 方法
- [ ] 实现 `updateMemberRole` 方法
- [ ] 实现 `getProjectMembers` 方法
- [ ] 实现 `getProjectMembersWithDetails` 方法
- [ ] 实现 `canUserEditProject` 方法
- [ ] 实现 `canUserViewProject` 方法
- [ ] 实现 `canUserShareProject` 方法
- [ ] 实现 `enableApprovalWorkflow` 方法
- [ ] 实现 `disableApprovalWorkflow` 方法
- [ ] 实现 `getApprovalConfig` 方法
- [ ] 添加单元测试

#### 22. 实现 ProjectPresenceService（P1）
- [ ] 创建文件 `server/src/services/ProjectPresenceService.ts`
- [ ] 实现 `updatePresence` 方法
- [ ] 实现 `getActiveUsers` 方法
- [ ] 实现 `updateEditingElement` 方法
- [ ] 实现 `cleanupOfflineUsers` 方法
- [ ] 添加单元测试

---

### 第七部分：API 路由

#### 23. 创建项目共享相关端点
- [ ] `POST /api/v1/projects/:projectId/share` - 共享项目
- [ ] `PUT /api/v1/projects/:projectId/members/:memberId` - 更新成员角色
- [ ] `DELETE /api/v1/projects/:projectId/members/:memberId` - 移除成员
- [ ] `GET /api/v1/projects/:projectId/members` - 获取项目成员
- [ ] `GET /api/v1/projects/:projectId/members/:memberId` - 获取成员详情
- [ ] 添加权限检查
- [ ] 添加数据隔离验证
- [ ] 添加集成测试

#### 24. 创建审批流程相关端点
- [ ] `POST /api/v1/projects/:projectId/approval/enable` - 启用审批
- [ ] `POST /api/v1/projects/:projectId/approval/disable` - 禁用审批
- [ ] `GET /api/v1/projects/:projectId/approval/config` - 获取审批配置
- [ ] 添加权限检查
- [ ] 添加集成测试

#### 25. 创建在线状态相关端点（P1）
- [ ] `POST /api/v1/projects/:projectId/presence/update` - 更新在线状态
- [ ] `GET /api/v1/projects/:projectId/presence/active-users` - 获取活跃用户
- [ ] 添加权限检查

---

### 第八部分：前端组件

#### 26. 创建 ProjectSharingModal 组件
- [ ] 显示当前项目成员列表
- [ ] 添加新成员功能
- [ ] 修改成员角色功能
- [ ] 移除成员功能
- [ ] 错误处理和加载状态
- [ ] 添加单元测试

#### 27. 创建 ProjectMembersPanel 组件
- [ ] 显示项目成员列表
- [ ] 显示在线状态（P1）
- [ ] 快速操作（编辑、移除）
- [ ] 成员搜索和筛选
- [ ] 添加单元测试

#### 28. 创建 ApprovalConfigPanel 组件
- [ ] 启用/禁用审批流程
- [ ] 选择审批者
- [ ] 配置自动批准时间
- [ ] 添加单元测试

---

### 第九部分：测试

#### 29. 单元测试
- [ ] ProjectRepository 扩展测试
- [ ] ProjectMemberRepository 测试
- [ ] ShareProjectAction 测试
- [ ] UpdateProjectMemberRoleAction 测试
- [ ] RemoveProjectMemberAction 测试
- [ ] EnableApprovalWorkflowAction 测试
- [ ] DisableApprovalWorkflowAction 测试
- [ ] ProjectCollaborationService 测试

#### 30. 集成测试
- [ ] 项目共享完整流程
- [ ] 权限覆盖验证
- [ ] 审批流程配置
- [ ] 数据隔离验证
- [ ] 权限冲突检测
- [ ] 级联删除验证

#### 31. 属性测试
- [ ] 属性 11：项目共享建立访问关系
- [ ] 属性 5：项目级权限覆盖

#### 32. 端到端测试
- [ ] 项目创建和自动添加 owner
- [ ] 项目共享和成员管理
- [ ] 审批流程启用/禁用
- [ ] 权限检查

---

### 第十部分：文档

#### 33. 更新 API 文档
- [ ] 添加项目共享相关端点文档
- [ ] 添加审批流程相关端点文档
- [ ] 添加在线状态相关端点文档
- [ ] 添加错误码文档

#### 34. 更新开发指南
- [ ] 添加 ProjectMember 对象说明
- [ ] 添加权限控制说明
- [ ] 添加数据隔离说明

#### 35. 更新用户文档
- [ ] 添加项目共享使用说明
- [ ] 添加成员管理使用说明
- [ ] 添加审批流程使用说明

---

### 第十一部分：数据迁移

#### 36. 处理现有项目
- [ ] 为现有项目设置 visibility = 'private'
- [ ] 为现有项目创建 ProjectMember 记录（项目创建者为 owner）
- [ ] 验证迁移结果

#### 37. 处理现有成员
- [ ] 验证所有成员都有对应的 memberId
- [ ] 验证数据一致性

---

### 第十二部分：性能优化

#### 38. 缓存策略
- [ ] 缓存项目成员列表（TTL: 5分钟）
- [ ] 缓存权限检查结果（TTL: 1分钟）
- [ ] 缓存在线状态（TTL: 30秒）

#### 39. 查询优化
- [ ] 使用 JOIN 而不是多次查询
- [ ] 使用分页处理大量成员列表
- [ ] 添加必要的数据库索引

#### 40. 性能测试
- [ ] 测试大量成员的查询性能
- [ ] 测试权限检查的性能
- [ ] 测试在线状态更新的性能

---

### 第十三部分：安全审查

#### 41. 权限检查
- [ ] 验证所有 Action 都进行权限检查
- [ ] 验证所有 API 端点都进行权限检查
- [ ] 验证权限检查的正确性

#### 42. 数据隔离
- [ ] 验证所有查询都包含 organization_id 过滤
- [ ] 验证跨组织访问被阻止
- [ ] 验证 SQL 注入防护

#### 43. 审计日志
- [ ] 验证所有操作都被记录
- [ ] 验证审计日志的完整性
- [ ] 验证审计日志的不可修改性

---

## 📊 进度跟踪

### 第一阶段：关键修正（P0）
- [ ] 项目所有者自动添加
- [ ] userId vs memberId 区分
- **预计完成时间**：2-3 小时

### 第二阶段：核心功能（P1）
- [ ] 数据库设计和迁移
- [ ] 类型定义
- [ ] Repository 实现
- [ ] Action 实现
- [ ] Service 实现
- [ ] API 路由
- [ ] 前端组件
- [ ] 测试
- **预计完成时间**：16-20 小时

### 第三阶段：优化和文档（P2）
- [ ] 性能优化
- [ ] 安全审查
- [ ] 文档更新
- [ ] 数据迁移
- **预计完成时间**：8-10 小时

---

## 🎯 总体进度

**总任务数**：43 项
**预计总工作量**：26-33 小时

---

## ✅ 完成标准

任务 8 完成的标准：
1. ✅ 所有关键修正已完成
2. ✅ 所有核心功能已实现
3. ✅ 所有测试都通过（单元、集成、属性、端到端）
4. ✅ 所有 API 端点都已实现并文档化
5. ✅ 所有前端组件都已实现
6. ✅ 数据隔离验证通过
7. ✅ 权限检查验证通过
8. ✅ 审计日志验证通过
9. ✅ 性能测试通过
10. ✅ 安全审查通过
11. ✅ 文档已更新
12. ✅ 数据迁移已完成

---

## 📝 注意事项

1. **关键修正优先**：必须先完成 P0 级别的修正
2. **测试驱动**：每个功能都应该有对应的测试
3. **数据隔离**：确保所有查询都包含 organization_id 过滤
4. **权限检查**：确保所有操作都进行权限检查
5. **审计日志**：确保所有操作都被记录
6. **向后兼容**：确保现有项目能够正确迁移
7. **性能考虑**：确保大量成员的查询性能
8. **文档更新**：确保文档与代码同步
