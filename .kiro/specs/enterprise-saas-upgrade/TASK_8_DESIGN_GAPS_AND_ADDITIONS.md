# 任务 8 设计补充：遗漏项和需要补充的设计

经过仔细思考，我发现了以下需要补充和完善的地方：

## 1. 🔴 关键遗漏：项目所有者的自动添加

### 问题
当创建项目时，创建者应该自动成为项目的 owner，但设计中没有明确说明这一点。

### 补充设计
```typescript
// 在 CreateProjectAction 中应该自动添加创建者为项目 owner
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
    
    // 2. 自动添加创建者为项目 owner
    await this.projectMemberRepo.addMember(
      project.id,
      context.memberId,  // 注意：这里需要 memberId，不是 userId
      'owner',
      context.userId
    );
    
    return project;
  }
}
```

### 影响
- 需要在 CreateProjectAction 中添加逻辑
- 需要在 ProjectMemberRepository 中实现 addMember 方法
- 需要确保项目创建时自动创建 ProjectMember 记录

---

## 2. 🔴 关键遗漏：userId vs memberId 的区分

### 问题
设计中混淆了 userId（用户表中的ID）和 memberId（成员表中的ID）。这两个是不同的概念：
- userId：用户账户的ID
- memberId：用户在组织中的成员记录ID

### 补充设计

```typescript
// 正确的关系应该是：
interface ProjectMemberObject extends OntologyObject {
  projectId: string;
  organizationId: string;
  memberId: string;        // 这是 members 表中的 ID
  // 不应该直接存储 userId，而是通过 memberId 关联
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Date;
  addedBy: string;         // 这也应该是 memberId
}

// 当需要获取用户信息时，通过 JOIN 获取：
// SELECT pm.*, m.user_id, m.role as org_role 
// FROM project_members pm
// JOIN members m ON pm.member_id = m.id
```

### 影响
- 所有 Action 中的 memberId 参数都是正确的
- 需要在 ShareProjectAction 中验证 memberId 存在
- 需要在 API 路由中正确处理 memberId

---

## 3. 🟡 遗漏：项目成员的在线状态管理

### 需求
需求 4.4 要求：**WHEN 多个用户同时编辑 Project THEN THE System SHALL 显示其他用户的在线状态**

### 补充设计

```typescript
// 需要添加在线状态跟踪
interface ProjectPresenceObject extends OntologyObject {
  type: 'ProjectPresence';
  projectId: string;
  memberId: string;
  organizationId: string;
  status: 'online' | 'offline' | 'idle';
  lastActivityAt: Date;
  currentEditingElement?: {
    type: 'module' | 'entity' | 'relationship';
    id: string;
  };
}

// 需要创建 project_presence 表
CREATE TABLE project_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'online',
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  current_editing_element JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(project_id, member_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

// 需要创建 ProjectPresenceService
class ProjectPresenceService {
  async updatePresence(projectId: string, memberId: string, status: 'online' | 'offline' | 'idle'): Promise<void>;
  async getActiveUsers(projectId: string): Promise<ProjectPresenceObject[]>;
  async updateEditingElement(projectId: string, memberId: string, element?: any): Promise<void>;
  async cleanupOfflineUsers(projectId: string, timeoutMinutes: number = 30): Promise<void>;
}

// 需要创建 WebSocket 连接来实时更新在线状态
// 或者使用 Server-Sent Events (SSE)
```

### 影响
- 需要新增 project_presence 表
- 需要新增 ProjectPresenceService
- 需要在前端实现在线状态更新
- 需要实现自动清理离线用户的机制

---

## 4. 🟡 遗漏：项目成员的访问权限细粒度控制

### 问题
设计中只有 editor/viewer 两种角色，但没有考虑更细粒度的权限控制。

### 补充设计

```typescript
// 可以考虑添加更细粒度的权限
enum ProjectPermissionLevel {
  OWNER = 'owner',              // 完全权限
  EDITOR = 'editor',            // 可编辑
  COMMENTER = 'commenter',      // 只能评论
  VIEWER = 'viewer',            // 只读
}

// 或者使用权限位图
interface ProjectMemberPermissions {
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canApprove: boolean;
  canShare: boolean;
  canDelete: boolean;
}
```

### 建议
暂时保持 editor/viewer 两种角色，后续可以扩展。

---

## 5. 🟡 遗漏：项目成员的批量操作

### 问题
设计中没有考虑批量添加/移除成员的场景。

### 补充设计

```typescript
// 添加批量操作 Action
class BulkShareProjectAction implements Action<BulkShareProjectInput, ProjectMemberObject[]> {
  name = 'BulkShareProject';
  
  async execute(input: BulkShareProjectInput, context: ActionContext): Promise<ProjectMemberObject[]> {
    // 批量添加成员
    const results = [];
    for (const memberId of input.memberIds) {
      const result = await this.shareProject(input.projectId, memberId, input.role);
      results.push(result);
    }
    return results;
  }
}

// 添加批量移除 Action
class BulkRemoveProjectMembersAction implements Action<BulkRemoveProjectMembersInput, void> {
  name = 'BulkRemoveProjectMembers';
  
  async execute(input: BulkRemoveProjectMembersInput, context: ActionContext): Promise<void> {
    // 批量移除成员
    for (const projectMemberId of input.projectMemberIds) {
      await this.removeProjectMember(projectMemberId);
    }
  }
}
```

### API 端点
```
POST /api/v1/projects/:projectId/members/bulk-add
     { memberIds: string[], role: 'editor' | 'viewer' }

POST /api/v1/projects/:projectId/members/bulk-remove
     { projectMemberIds: string[] }
```

---

## 6. 🟡 遗漏：项目成员的邀请链接

### 问题
设计中没有考虑通过邀请链接共享项目的场景。

### 补充设计

```typescript
// 创建项目邀请对象
interface ProjectInvitationObject extends OntologyObject {
  type: 'ProjectInvitation';
  projectId: string;
  organizationId: string;
  email: string;
  role: 'editor' | 'viewer';
  token: string;
  expiresAt: Date;
  createdBy: string;
  acceptedAt?: Date;
  acceptedBy?: string;
}

// 创建项目邀请 Action
class CreateProjectInvitationAction implements Action<CreateProjectInvitationInput, ProjectInvitationObject> {
  name = 'CreateProjectInvitation';
  
  async execute(input: CreateProjectInvitationInput, context: ActionContext): Promise<ProjectInvitationObject> {
    // 生成邀请令牌
    // 发送邀请邮件
    // 创建邀请记录
  }
}

// 接受项目邀请 Action
class AcceptProjectInvitationAction implements Action<AcceptProjectInvitationInput, ProjectMemberObject> {
  name = 'AcceptProjectInvitation';
  
  async execute(input: AcceptProjectInvitationInput, context: ActionContext): Promise<ProjectMemberObject> {
    // 验证邀请令牌
    // 添加成员到项目
    // 标记邀请为已接受
  }
}
```

### 影响
- 需要新增 project_invitations 表
- 需要新增两个 Action
- 需要新增 API 端点

---

## 7. 🟡 遗漏：项目成员的角色变更历史

### 问题
设计中没有记录成员角色变更的历史。

### 补充设计

```typescript
// 创建项目成员历史表
CREATE TABLE project_member_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_member_id UUID NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  member_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  old_role VARCHAR(20),
  new_role VARCHAR(20),
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

// 在 UpdateProjectMemberRoleAction 中记录历史
class UpdateProjectMemberRoleAction {
  async execute(input: UpdateProjectMemberRoleInput, context: ActionContext): Promise<ProjectMemberObject> {
    const oldMember = await this.projectMemberRepo.get(input.projectMemberId);
    
    // 更新角色
    const updatedMember = await this.projectMemberRepo.updateMemberRole(
      input.projectMemberId,
      input.newRole
    );
    
    // 记录历史
    await this.projectMemberHistoryRepo.create({
      projectMemberId: input.projectMemberId,
      projectId: oldMember.projectId,
      memberId: oldMember.memberId,
      organizationId: oldMember.organizationId,
      oldRole: oldMember.role,
      newRole: input.newRole,
      changedBy: context.userId,
      reason: input.reason,
    });
    
    return updatedMember;
  }
}
```

---

## 8. 🟡 遗漏：项目成员的权限继承规则

### 问题
设计中没有明确说明当组织成员角色变更时，项目成员权限如何处理。

### 补充设计

```typescript
// 权限继承规则：
// 1. 如果成员在组织中被移除，自动从所有项目中移除
// 2. 如果成员在组织中的角色被降级，项目中的权限不自动降级
// 3. 如果成员在组织中的角色被升级，项目中的权限不自动升级

// 在 RemoveMemberFromOrganizationAction 中应该：
class RemoveMemberFromOrganizationAction {
  async execute(input: RemoveMemberFromOrganizationInput, context: ActionContext): Promise<void> {
    // 1. 从组织中移除成员
    await this.memberRepo.remove(input.memberId);
    
    // 2. 从所有项目中移除该成员
    const projectMembers = await this.projectMemberRepo.getMemberProjects(input.memberId);
    for (const projectMember of projectMembers) {
      await this.projectMemberRepo.removeMember(projectMember.id);
    }
  }
}
```

---

## 9. 🟡 遗漏：项目成员的最后访问时间更新

### 问题
设计中定义了 lastAccessedAt 字段，但没有说明如何更新。

### 补充设计

```typescript
// 在每次访问项目时更新 lastAccessedAt
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await ontologyService.getObject('Project', req.params.id);
    
    // 更新最后访问时间
    const organizationId = tenantContext.getOrganizationId();
    const memberId = await this.memberRepo.getMemberIdByUserId(req.user!.id, organizationId);
    
    if (memberId) {
      await this.projectMemberRepo.updateLastAccessedAt(project.id, memberId);
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: '获取项目失败' });
  }
});
```

---

## 10. 🟡 遗漏：项目成员的通知偏好

### 问题
设计中没有考虑项目级别的通知偏好。

### 补充设计

```typescript
// 添加项目成员通知偏好
interface ProjectMemberNotificationPreferences {
  projectMemberId: string;
  notifyOnComment: boolean;
  notifyOnChangeRequest: boolean;
  notifyOnApproval: boolean;
  notifyOnMemberJoin: boolean;
  notifyOnMemberLeave: boolean;
  notificationChannel: 'in-app' | 'email' | 'both';
}

// 创建 project_member_notification_preferences 表
CREATE TABLE project_member_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_member_id UUID NOT NULL UNIQUE REFERENCES project_members(id) ON DELETE CASCADE,
  notify_on_comment BOOLEAN DEFAULT true,
  notify_on_change_request BOOLEAN DEFAULT true,
  notify_on_approval BOOLEAN DEFAULT true,
  notify_on_member_join BOOLEAN DEFAULT false,
  notify_on_member_leave BOOLEAN DEFAULT false,
  notification_channel VARCHAR(20) DEFAULT 'both',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 11. 🟡 遗漏：项目成员的访问日志

### 问题
设计中没有记录成员的访问日志。

### 补充设计

```typescript
// 创建项目访问日志表
CREATE TABLE project_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  action VARCHAR(50),  -- 'view', 'edit', 'comment', etc.
  resource_type VARCHAR(50),
  resource_id UUID,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

// 在每次操作时记录访问日志
```

---

## 12. 🟡 遗漏：项目成员的导出功能

### 问题
设计中没有考虑导出项目成员列表的功能。

### 补充设计

```typescript
// 添加导出 API 端点
GET /api/v1/projects/:projectId/members/export?format=csv|json

// 实现导出功能
class ExportProjectMembersAction {
  async execute(input: ExportProjectMembersInput, context: ActionContext): Promise<Buffer> {
    const members = await this.projectMemberRepo.getProjectMembersWithDetails(input.projectId);
    
    if (input.format === 'csv') {
      return this.convertToCsv(members);
    } else {
      return this.convertToJson(members);
    }
  }
}
```

---

## 13. 🟡 遗漏：项目成员的导入功能

### 问题
设计中没有考虑批量导入项目成员的功能。

### 补充设计

```typescript
// 添加导入 API 端点
POST /api/v1/projects/:projectId/members/import
Content-Type: multipart/form-data
{ file: CSV/JSON file }

// 实现导入功能
class ImportProjectMembersAction {
  async execute(input: ImportProjectMembersInput, context: ActionContext): Promise<ImportResult> {
    const members = this.parseFile(input.file);
    const results = [];
    
    for (const member of members) {
      try {
        const result = await this.shareProject(input.projectId, member.memberId, member.role);
        results.push({ success: true, memberId: member.memberId });
      } catch (error) {
        results.push({ success: false, memberId: member.memberId, error: error.message });
      }
    }
    
    return { total: members.length, successful: results.filter(r => r.success).length, results };
  }
}
```

---

## 14. 🟡 遗漏：项目成员的权限冲突检测

### 问题
设计中没有考虑权限冲突的情况（例如，成员既是项目 owner 又是 viewer）。

### 补充设计

```typescript
// 在 UpdateProjectMemberRoleAction 中添加冲突检测
class UpdateProjectMemberRoleAction {
  async validate(input: UpdateProjectMemberRoleInput, context: ActionContext): Promise<void> {
    const member = await this.projectMemberRepo.get(input.projectMemberId);
    
    // 检查是否是唯一的 owner
    if (member.role === 'owner' && input.newRole !== 'owner') {
      const owners = await this.projectMemberRepo.getProjectMembers(member.projectId);
      const ownerCount = owners.filter(m => m.role === 'owner').length;
      
      if (ownerCount <= 1) {
        throw new Error('不能移除项目的最后一个所有者');
      }
    }
  }
}
```

---

## 15. 🟡 遗漏：项目成员的审计日志详细程度

### 问题
设计中的审计日志可能不够详细。

### 补充设计

```typescript
// 审计日志应该记录以下信息：
interface ProjectMemberAuditLog {
  id: string;
  projectId: string;
  memberId: string;
  organizationId: string;
  action: 'added' | 'updated' | 'removed';
  oldRole?: string;
  newRole?: string;
  addedBy: string;
  timestamp: Date;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}
```

---

## 总结

### 必须补充的（🔴 关键）
1. **项目所有者的自动添加** - 在 CreateProjectAction 中
2. **userId vs memberId 的区分** - 确保所有地方都正确使用

### 应该补充的（🟡 重要）
3. 项目成员的在线状态管理
4. 项目成员的批量操作
5. 项目成员的邀请链接
6. 项目成员的角色变更历史
7. 项目成员的权限继承规则
8. 项目成员的最后访问时间更新
9. 项目成员的通知偏好
10. 项目成员的访问日志
11. 项目成员的导出/导入功能
12. 项目成员的权限冲突检测
13. 项目成员的审计日志详细程度

### 建议的优先级
**第一阶段（必须）**：1, 2
**第二阶段（应该）**：3, 5, 6, 7, 8
**第三阶段（可以）**：4, 9, 10, 11, 12, 13
