# 任务 8 设计审查：关键发现

## 执行摘要

经过详细审查，发现了 **15 个设计遗漏点**，其中 **2 个是关键问题**，需要立即修正。

---

## 🔴 关键问题（必须修正）

### 问题 1：项目所有者的自动添加缺失

**严重程度**：🔴 关键

**描述**：
当创建项目时，创建者应该自动成为项目的 owner，但原设计中没有明确说明这一点。这会导致项目创建后没有任何成员能够管理项目。

**影响**：
- 项目创建后无法共享
- 项目创建后无法配置审批流程
- 项目创建后无法管理成员

**修正方案**：
在 `CreateProjectAction` 中添加逻辑，自动创建 `ProjectMember` 记录：

```typescript
class CreateProjectAction extends Action<CreateProjectInput, ProjectObject> {
  async execute(input: CreateProjectInput, context: ActionContext): Promise<ProjectObject> {
    // 1. 创建项目
    const project = await this.ontology.createObject('Project', {
      ...input,
      organizationId: context.organizationId,
      userId: context.userId,
      visibility: 'private',
      approvalEnabled: false,
    });
    
    // 2. 获取创建者的 memberId
    const member = await this.memberRepo.getMemberByUserId(
      context.userId,
      context.organizationId
    );
    
    // 3. 自动添加创建者为项目 owner
    await this.projectMemberRepo.addMember(
      project.id,
      member.id,  // memberId，不是 userId
      'owner',
      context.userId
    );
    
    return project;
  }
}
```

**实施步骤**：
1. 修改 `CreateProjectAction` 的 `execute` 方法
2. 在 `ProjectMemberRepository` 中实现 `addMember` 方法
3. 添加单元测试验证自动添加功能

---

### 问题 2：userId vs memberId 的混淆

**严重程度**：🔴 关键

**描述**：
设计中混淆了两个不同的概念：
- `userId`：用户账户的 ID（来自 users 表）
- `memberId`：用户在组织中的成员记录 ID（来自 members 表）

这两个 ID 是不同的，混淆会导致数据关联错误。

**当前问题**：
- `ProjectMember.addedBy` 应该存储 `memberId`，不是 `userId`
- `ShareProjectAction` 中的 `memberId` 参数是正确的，但需要验证
- 所有 API 端点都应该使用 `memberId`，不是 `userId`

**修正方案**：

```typescript
// 正确的 ProjectMemberObject 定义
interface ProjectMemberObject extends OntologyObject {
  projectId: string;
  organizationId: string;
  memberId: string;        // ✅ 这是 members 表中的 ID
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Date;
  addedBy: string;         // ✅ 这也应该是 memberId
  lastAccessedAt?: Date;
  isActive: boolean;
}

// 在 ShareProjectAction 中验证 memberId
class ShareProjectAction extends Action<ShareProjectInput, ShareProjectOutput> {
  async validate(input: ShareProjectInput, context: ActionContext): Promise<void> {
    // 1. 验证项目存在
    const project = await this.projectRepo.get(input.projectId);
    if (!project) throw new Error('项目不存在');
    
    // 2. 验证 memberId 存在且属于同一组织
    const member = await this.memberRepo.get(input.memberId);
    if (!member) throw new Error('成员不存在');
    if (member.organizationId !== project.organizationId) {
      throw new Error('成员不属于同一组织');
    }
    
    // 3. 验证成员未被添加到项目
    const existing = await this.projectMemberRepo.getProjectMember(
      input.projectId,
      input.memberId
    );
    if (existing) throw new Error('成员已被添加到项目');
  }
}
```

**实施步骤**：
1. 审查所有 Action 中的 `memberId` 使用
2. 审查所有 API 端点中的参数处理
3. 添加集成测试验证 `memberId` 的正确性

---

## 🟡 重要遗漏（应该补充）

### 遗漏 3：项目成员的在线状态管理

**需求来源**：需求 4.4
> WHEN 多个用户同时编辑 Project THEN THE System SHALL 显示其他用户的在线状态

**当前状态**：设计中完全没有提及

**需要补充**：
- `ProjectPresenceObject` 对象定义
- `project_presence` 表设计
- `ProjectPresenceService` 实现
- WebSocket 或 SSE 实时更新机制
- 自动清理离线用户的机制

**优先级**：高（影响用户体验）

---

### 遗漏 4：项目成员的批量操作

**需求来源**：实际使用场景

**当前状态**：设计中只有单个成员的操作

**需要补充**：
- `BulkShareProjectAction` - 批量添加成员
- `BulkRemoveProjectMembersAction` - 批量移除成员
- 相应的 API 端点

**优先级**：中（提高用户效率）

---

### 遗漏 5：项目成员的邀请链接

**需求来源**：实际使用场景

**当前状态**：设计中没有邀请链接功能

**需要补充**：
- `ProjectInvitationObject` 对象定义
- `project_invitations` 表设计
- `CreateProjectInvitationAction` - 创建邀请
- `AcceptProjectInvitationAction` - 接受邀请
- 相应的 API 端点

**优先级**：中（支持外部用户加入）

---

### 遗漏 6：项目成员的角色变更历史

**需求来源**：审计和追踪需求

**当前状态**：设计中没有历史记录

**需要补充**：
- `project_member_history` 表设计
- 在 `UpdateProjectMemberRoleAction` 中记录历史
- 查询历史的 API 端点

**优先级**：中（支持审计）

---

### 遗漏 7：项目成员的权限继承规则

**需求来源**：数据一致性

**当前状态**：设计中没有明确说明

**需要补充**：
- 当成员从组织中移除时，自动从所有项目中移除
- 当成员在组织中的角色变更时，项目中的权限如何处理
- 在 `RemoveMemberFromOrganizationAction` 中实现级联删除

**优先级**：高（影响数据一致性）

---

### 遗漏 8：项目成员的最后访问时间更新

**需求来源**：使用统计

**当前状态**：定义了字段但没有说明如何更新

**需要补充**：
- 在每次访问项目时更新 `lastAccessedAt`
- 在项目路由中实现更新逻辑

**优先级**：低（可选功能）

---

### 遗漏 9：项目成员的通知偏好

**需求来源**：需求 6.7
> THE System SHALL 允许用户配置通知偏好

**当前状态**：设计中没有项目级别的通知偏好

**需要补充**：
- `ProjectMemberNotificationPreferences` 对象定义
- `project_member_notification_preferences` 表设计
- 通知服务中的偏好检查逻辑

**优先级**：中（支持通知定制）

---

### 遗漏 10：项目成员的访问日志

**需求来源**：安全审计

**当前状态**：设计中没有访问日志

**需要补充**：
- `project_access_logs` 表设计
- 在每次操作时记录访问日志
- 查询访问日志的 API 端点

**优先级**：低（可选功能）

---

### 遗漏 11：项目成员的导出/导入功能

**需求来源**：实际使用场景

**当前状态**：设计中没有提及

**需要补充**：
- `ExportProjectMembersAction` - 导出成员列表
- `ImportProjectMembersAction` - 导入成员列表
- 相应的 API 端点

**优先级**：低（可选功能）

---

### 遗漏 12：项目成员的权限冲突检测

**需求来源**：数据一致性

**当前状态**：设计中没有冲突检测

**需要补充**：
- 在 `UpdateProjectMemberRoleAction` 中检测权限冲突
- 防止移除项目的最后一个 owner
- 防止权限降级导致的不一致

**优先级**：高（影响数据一致性）

---

### 遗漏 13：项目成员的审计日志详细程度

**需求来源**：需求 10（审计日志）

**当前状态**：设计中的审计日志可能不够详细

**需要补充**：
- 记录角色变更的原因
- 记录成员添加/移除的原因
- 记录权限覆盖的原因

**优先级**：中（支持审计）

---

## 📊 遗漏点汇总表

| # | 问题 | 严重程度 | 优先级 | 影响范围 |
|---|------|--------|-------|--------|
| 1 | 项目所有者自动添加 | 🔴 关键 | P0 | 项目创建流程 |
| 2 | userId vs memberId 混淆 | 🔴 关键 | P0 | 所有 Action 和 API |
| 3 | 在线状态管理 | 🟡 重要 | P1 | 实时协作 |
| 4 | 批量操作 | 🟡 重要 | P2 | 用户效率 |
| 5 | 邀请链接 | 🟡 重要 | P2 | 外部用户 |
| 6 | 角色变更历史 | 🟡 重要 | P2 | 审计追踪 |
| 7 | 权限继承规则 | 🟡 重要 | P1 | 数据一致性 |
| 8 | 最后访问时间 | 🟡 重要 | P3 | 使用统计 |
| 9 | 通知偏好 | 🟡 重要 | P2 | 通知系统 |
| 10 | 访问日志 | 🟡 重要 | P3 | 安全审计 |
| 11 | 导出/导入 | 🟡 重要 | P3 | 数据迁移 |
| 12 | 权限冲突检测 | 🟡 重要 | P1 | 数据一致性 |
| 13 | 审计日志详细程度 | 🟡 重要 | P2 | 审计追踪 |

---

## 🎯 建议的修正计划

### 第一阶段（立即修正）- P0
1. ✅ 项目所有者的自动添加
2. ✅ userId vs memberId 的区分

**预计工作量**：2-3 小时

### 第二阶段（设计阶段补充）- P1
3. 项目成员的在线状态管理
7. 项目成员的权限继承规则
12. 项目成员的权限冲突检测

**预计工作量**：4-6 小时

### 第三阶段（实施阶段补充）- P2
4. 项目成员的批量操作
5. 项目成员的邀请链接
6. 项目成员的角色变更历史
9. 项目成员的通知偏好
13. 项目成员的审计日志详细程度

**预计工作量**：8-12 小时

### 第四阶段（后续优化）- P3
8. 项目成员的最后访问时间更新
10. 项目成员的访问日志
11. 项目成员的导出/导入功能

**预计工作量**：6-8 小时

---

## 📝 后续行动

1. **立即**：修正关键问题 1 和 2
2. **设计阶段**：补充 P1 级别的遗漏
3. **实施阶段**：补充 P2 级别的遗漏
4. **优化阶段**：补充 P3 级别的遗漏

---

## 📚 相关文档

- `TASK_8_PROJECT_EXTENSION_DESIGN.md` - 原始设计文档
- `TASK_8_DESIGN_GAPS_AND_ADDITIONS.md` - 详细的补充设计
