# 任务 8：Project 对象类型扩展 - 详细设计文档

## 1. 概述

任务 8 是第二阶段的基础任务，主要目标是扩展现有的 Project 对象类型，支持项目协作功能。这包括：
- 项目共享和访问控制
- 项目成员管理
- 审批流程配置
- 项目级权限覆盖

## 2. 需求分析

### 2.1 相关需求
- **需求 4：项目协作** - 项目共享、成员列表、在线状态、评论系统
- **需求 5：变更审批流程** - 审批流程启用/禁用、审批配置

### 2.2 核心功能
1. **项目共享** - 项目所有者可以将项目共享给组织内的其他成员
2. **访问级别控制** - 支持编辑、只读两种访问级别
3. **成员列表** - 显示项目的所有协作成员
4. **审批流程配置** - 启用/禁用项目级别的变更审批
5. **项目级权限** - 项目级权限可以覆盖组织级权限

## 3. 数据模型设计

### 3.1 Project 对象扩展

当前 Project 对象：
```typescript
interface ProjectObject extends OntologyObject {
  type: 'Project';
  userId: string;                    // 创建者
  organizationId?: string;           // 所属组织
  name: string;
  description?: string;
  model: any;                        // SystemModel JSON
  isArchived: boolean;
}
```

扩展后的 Project 对象：
```typescript
interface ProjectObject extends OntologyObject {
  type: 'Project';
  userId: string;                    // 创建者/所有者
  organizationId: string;            // 所属组织（必需）
  name: string;
  description?: string;
  model: any;                        // SystemModel JSON
  isArchived: boolean;
  
  // 新增字段：审批流程配置
  approvalEnabled: boolean;          // 是否启用审批流程
  approvalConfig: {
    requiresApproval: boolean;       // 是否需要审批
    approvers: string[];             // 审批者ID列表
    autoApproveAfterDays?: number;   // 自动批准天数（可选）
  };
  
  // 新增字段：项目级权限配置
  permissionOverrides?: {
    [memberId: string]: {
      role: 'editor' | 'viewer';     // 项目级角色
      grantedAt: Date;
      grantedBy: string;
    };
  };
  
  // 新增字段：项目元数据
  visibility: 'private' | 'shared';  // 私有或共享
  sharedAt?: Date;                   // 共享时间
  sharedBy?: string;                 // 共享者
}
```

### 3.2 ProjectMember 对象（新增）

用于管理项目成员关系：

```typescript
interface ProjectMemberObject extends OntologyObject {
  type: 'ProjectMember';
  projectId: string;                 // 项目ID
  organizationId: string;            // 组织ID（用于数据隔离）
  memberId: string;                  // 成员ID
  role: 'owner' | 'editor' | 'viewer'; // 项目内角色
  addedAt: Date;
  addedBy: string;                   // 添加者
  lastAccessedAt?: Date;             // 最后访问时间
  isActive: boolean;                 // 是否活跃
}
```

### 3.3 数据库表设计

#### 3.3.1 projects 表扩展

```sql
-- 扩展现有 projects 表
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_config JSONB DEFAULT '{"requiresApproval": false, "approvers": []}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS permission_overrides JSONB DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shared_by UUID;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_approval_enabled ON projects(approval_enabled);
```

#### 3.3.2 project_members 表（新增）

```sql
-- 创建项目成员表
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  member_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by UUID NOT NULL,
  last_accessed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- 复合唯一约束：同一项目中每个成员只能有一个角色
  UNIQUE(project_id, member_id),
  
  -- 外键约束
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES members(id)
);

-- 创建索引
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_member_id ON project_members(member_id);
CREATE INDEX idx_project_members_organization_id ON project_members(organization_id);
CREATE INDEX idx_project_members_role ON project_members(role);
```

## 4. 本体链接设计

### 4.1 新增链接类型

```typescript
// 项目与成员的关系
'Project→ProjectMember'    // 一对多：项目有多个成员
'ProjectMember→Member'     // 多对一：项目成员关联到组织成员
'ProjectMember→Project'    // 多对一：项目成员关联到项目
```

### 4.2 链接关系图

```
Organization
    ├─→ Project (一对多)
    │   ├─→ ProjectMember (一对多)
    │   │   └─→ Member (多对一)
    │   └─→ Module (一对多)
    │
    └─→ Member (一对多)
```

## 5. Action 设计

### 5.1 ShareProjectAction（共享项目）

**目的**：将项目共享给组织内的其他成员

```typescript
interface ShareProjectInput {
  projectId: string;
  memberId: string;
  role: 'editor' | 'viewer';
  reason?: string;
}

interface ShareProjectOutput {
  projectMember: ProjectMemberObject;
  notification?: NotificationObject;
}

class ShareProjectAction implements Action<ShareProjectInput, ShareProjectOutput> {
  name = 'ShareProject';
  permissions = [Permission.PROJECT_SHARE];
  
  async validate(input: ShareProjectInput, context: ActionContext): Promise<ValidationResult> {
    // 1. 验证项目存在
    // 2. 验证成员存在且属于同一组织
    // 3. 验证当前用户是项目所有者或有共享权限
    // 4. 验证成员未被添加到项目
  }
  
  async execute(input: ShareProjectInput, context: ActionContext): Promise<ShareProjectOutput> {
    // 1. 创建 ProjectMember 对象
    // 2. 更新项目的 visibility 为 'shared'
    // 3. 创建通知（可选）
    // 4. 记录审计日志
    // 5. 创建 DecisionReceipt
  }
}
```

### 5.2 UpdateProjectMemberRoleAction（更新项目成员角色）

**目的**：更改项目成员的访问级别

```typescript
interface UpdateProjectMemberRoleInput {
  projectMemberId: string;
  newRole: 'editor' | 'viewer';
  reason?: string;
}

class UpdateProjectMemberRoleAction implements Action<UpdateProjectMemberRoleInput, ProjectMemberObject> {
  name = 'UpdateProjectMemberRole';
  permissions = [Permission.PROJECT_SHARE];
  
  async execute(input: UpdateProjectMemberRoleInput, context: ActionContext): Promise<ProjectMemberObject> {
    // 1. 验证项目成员存在
    // 2. 验证当前用户有权限修改
    // 3. 更新角色
    // 4. 记录审计日志
    // 5. 创建 DecisionReceipt
  }
}
```

### 5.3 RemoveProjectMemberAction（移除项目成员）

**目的**：从项目中移除成员

```typescript
interface RemoveProjectMemberInput {
  projectMemberId: string;
  reason?: string;
}

class RemoveProjectMemberAction implements Action<RemoveProjectMemberInput, void> {
  name = 'RemoveProjectMember';
  permissions = [Permission.PROJECT_SHARE];
  
  async execute(input: RemoveProjectMemberInput, context: ActionContext): Promise<void> {
    // 1. 验证项目成员存在
    // 2. 验证当前用户有权限移除
    // 3. 删除 ProjectMember 记录
    // 4. 如果项目没有其他成员，更新 visibility 为 'private'
    // 5. 记录审计日志
    // 6. 创建 DecisionReceipt
  }
}
```

### 5.4 EnableApprovalWorkflowAction（启用审批流程）

**目的**：为项目启用变更审批流程

```typescript
interface EnableApprovalWorkflowInput {
  projectId: string;
  approvers: string[];
  autoApproveAfterDays?: number;
}

class EnableApprovalWorkflowAction implements Action<EnableApprovalWorkflowInput, ProjectObject> {
  name = 'EnableApprovalWorkflow';
  permissions = [Permission.PROJECT_EDIT];
  
  async execute(input: EnableApprovalWorkflowInput, context: ActionContext): Promise<ProjectObject> {
    // 1. 验证项目存在
    // 2. 验证当前用户是项目所有者
    // 3. 验证审批者都是项目成员
    // 4. 更新项目的 approvalEnabled 和 approvalConfig
    // 5. 记录审计日志
    // 6. 创建 DecisionReceipt
  }
}
```

### 5.5 DisableApprovalWorkflowAction（禁用审批流程）

**目的**：为项目禁用变更审批流程

```typescript
interface DisableApprovalWorkflowInput {
  projectId: string;
}

class DisableApprovalWorkflowAction implements Action<DisableApprovalWorkflowInput, ProjectObject> {
  name = 'DisableApprovalWorkflow';
  permissions = [Permission.PROJECT_EDIT];
  
  async execute(input: DisableApprovalWorkflowInput, context: ActionContext): Promise<ProjectObject> {
    // 1. 验证项目存在
    // 2. 验证当前用户是项目所有者
    // 3. 更新项目的 approvalEnabled 为 false
    // 4. 记录审计日志
    // 5. 创建 DecisionReceipt
  }
}
```

## 6. Repository 设计

### 6.1 ProjectRepository 扩展

```typescript
class ProjectRepository extends TenantAwareRepository<ProjectObject> {
  // 现有方法...
  
  // 新增方法：获取项目成员
  async getProjectMembers(projectId: string): Promise<ProjectMemberObject[]> {
    // 查询 project_members 表
  }
  
  // 新增方法：检查成员是否有项目访问权限
  async hasProjectAccess(projectId: string, memberId: string): Promise<boolean> {
    // 检查 project_members 表
  }
  
  // 新增方法：获取成员的项目角色
  async getProjectMemberRole(projectId: string, memberId: string): Promise<'owner' | 'editor' | 'viewer' | null> {
    // 查询 project_members 表
  }
  
  // 新增方法：获取项目的所有成员及其角色
  async getProjectMembersWithRoles(projectId: string): Promise<Array<{
    member: MemberObject;
    role: 'owner' | 'editor' | 'viewer';
    addedAt: Date;
  }>> {
    // JOIN project_members 和 members 表
  }
}
```

### 6.2 ProjectMemberRepository（新增）

```typescript
class ProjectMemberRepository extends TenantAwareRepository<ProjectMemberObject> {
  constructor(pool: Pool) {
    super(pool, 'project_members');
  }
  
  // 添加项目成员
  async addMember(projectId: string, memberId: string, role: string, addedBy: string): Promise<ProjectMemberObject> {
    // INSERT 到 project_members 表
  }
  
  // 更新项目成员角色
  async updateMemberRole(projectMemberId: string, newRole: string): Promise<ProjectMemberObject> {
    // UPDATE project_members 表
  }
  
  // 移除项目成员
  async removeMember(projectMemberId: string): Promise<void> {
    // DELETE 从 project_members 表
  }
  
  // 获取项目的所有成员
  async getProjectMembers(projectId: string): Promise<ProjectMemberObject[]> {
    // SELECT 从 project_members 表
  }
  
  // 获取成员的所有项目
  async getMemberProjects(memberId: string): Promise<ProjectMemberObject[]> {
    // SELECT 从 project_members 表
  }
  
  // 检查成员是否是项目所有者
  async isProjectOwner(projectId: string, memberId: string): Promise<boolean> {
    // 检查 role = 'owner'
  }
}
```

## 7. 权限控制设计

### 7.1 项目级权限

```typescript
enum ProjectPermission {
  // 项目所有者权限
  PROJECT_OWNER_SHARE = 'project:owner:share',           // 共享项目
  PROJECT_OWNER_MANAGE_MEMBERS = 'project:owner:manage_members', // 管理成员
  PROJECT_OWNER_CONFIGURE_APPROVAL = 'project:owner:configure_approval', // 配置审批
  PROJECT_OWNER_DELETE = 'project:owner:delete',         // 删除项目
  
  // 编辑者权限
  PROJECT_EDITOR_EDIT = 'project:editor:edit',           // 编辑项目
  PROJECT_EDITOR_CREATE_CHANGE_REQUEST = 'project:editor:create_change_request', // 创建变更请求
  
  // 查看者权限
  PROJECT_VIEWER_VIEW = 'project:viewer:view',           // 查看项目
}
```

### 7.2 权限检查流程

```
用户请求 → 认证 → 提取用户角色
  ↓
检查组织级权限 → 检查项目级权限 → 检查项目成员角色
  ↓
执行操作 → 记录审计日志
```

### 7.3 权限覆盖规则

```typescript
// 权限覆盖优先级（从高到低）
1. 项目级权限（ProjectMember.role）
2. 项目级权限覆盖（Project.permissionOverrides）
3. 组织级权限（Member.role）
4. 默认权限

// 示例：
// 用户在组织中是 Developer（可编辑）
// 但在项目中被设置为 Viewer（只读）
// → 最终权限是 Viewer（项目级权限覆盖组织级权限）
```

## 8. 服务层设计

### 8.1 ProjectCollaborationService（新增）

```typescript
interface ProjectCollaborationService {
  // 项目共享
  shareProject(projectId: string, memberId: string, role: 'editor' | 'viewer'): Promise<ProjectMemberObject>;
  unshareProject(projectId: string, memberId: string): Promise<void>;
  updateMemberRole(projectMemberId: string, newRole: 'editor' | 'viewer'): Promise<ProjectMemberObject>;
  
  // 项目成员查询
  getProjectMembers(projectId: string): Promise<ProjectMemberObject[]>;
  getProjectMembersWithDetails(projectId: string): Promise<Array<{
    member: MemberObject;
    role: 'owner' | 'editor' | 'viewer';
    addedAt: Date;
    lastAccessedAt?: Date;
  }>>;
  
  // 权限检查
  canUserEditProject(projectId: string, userId: string): Promise<boolean>;
  canUserViewProject(projectId: string, userId: string): Promise<boolean>;
  canUserShareProject(projectId: string, userId: string): Promise<boolean>;
  
  // 审批流程配置
  enableApprovalWorkflow(projectId: string, approvers: string[]): Promise<ProjectObject>;
  disableApprovalWorkflow(projectId: string): Promise<ProjectObject>;
  getApprovalConfig(projectId: string): Promise<ApprovalConfig>;
}
```

## 9. API 路由设计

### 9.1 项目共享相关端点

```
POST   /api/v1/projects/:projectId/share
       - 共享项目给成员
       - 请求体：{ memberId, role }

PUT    /api/v1/projects/:projectId/members/:memberId
       - 更新项目成员角色
       - 请求体：{ role }

DELETE /api/v1/projects/:projectId/members/:memberId
       - 移除项目成员

GET    /api/v1/projects/:projectId/members
       - 获取项目的所有成员

GET    /api/v1/projects/:projectId/members/:memberId
       - 获取项目成员详情
```

### 9.2 审批流程相关端点

```
POST   /api/v1/projects/:projectId/approval/enable
       - 启用审批流程
       - 请求体：{ approvers, autoApproveAfterDays? }

POST   /api/v1/projects/:projectId/approval/disable
       - 禁用审批流程

GET    /api/v1/projects/:projectId/approval/config
       - 获取审批配置
```

## 10. 前端组件设计

### 10.1 ProjectSharingModal（项目共享对话框）

功能：
- 显示当前项目成员列表
- 添加新成员
- 修改成员角色
- 移除成员

### 10.2 ProjectMembersPanel（项目成员面板）

功能：
- 显示项目成员列表（带在线状态）
- 快速操作（编辑、移除）
- 成员搜索和筛选

### 10.3 ApprovalConfigPanel（审批配置面板）

功能：
- 启用/禁用审批流程
- 选择审批者
- 配置自动批准时间

## 11. 测试设计

### 11.1 单元测试

- ShareProjectAction 验证和执行
- UpdateProjectMemberRoleAction 验证和执行
- RemoveProjectMemberAction 验证和执行
- 权限检查逻辑

### 11.2 集成测试

- 项目共享完整流程
- 权限覆盖验证
- 审批流程配置
- 数据隔离验证

### 11.3 属性测试

- **属性 11：项目共享建立访问关系** - 验证共享后成员可以访问项目
- **属性 5：项目级权限覆盖** - 验证项目级权限覆盖组织级权限

## 12. 实施步骤

1. **数据库迁移** - 创建 project_members 表，扩展 projects 表
2. **类型定义** - 定义 ProjectMemberObject 和相关接口
3. **Repository 实现** - 实现 ProjectRepository 和 ProjectMemberRepository
4. **Action 实现** - 实现 5 个 Action
5. **Service 实现** - 实现 ProjectCollaborationService
6. **API 路由** - 创建相关 API 端点
7. **前端组件** - 实现前端组件
8. **测试** - 编写单元测试、集成测试和属性测试
9. **文档** - 更新 API 文档和用户文档

## 13. 风险和注意事项

### 13.1 数据隔离
- 确保所有查询都包含 organization_id 过滤
- 防止跨组织的数据泄露

### 13.2 权限检查
- 在 Action 中进行权限验证
- 在 Repository 中进行数据隔离验证
- 双重验证机制

### 13.3 并发问题
- 处理同时添加和移除成员的情况
- 使用数据库事务确保一致性

### 13.4 向后兼容性
- 现有项目应该自动设置为 visibility = 'private'
- 现有项目所有者应该自动添加到 project_members 表

## 14. 性能考虑

### 14.1 索引优化
- 在 project_id、member_id、organization_id 上创建索引
- 在 role 上创建索引用于权限检查

### 14.2 缓存策略
- 缓存项目成员列表（TTL: 5分钟）
- 缓存权限检查结果（TTL: 1分钟）

### 14.3 查询优化
- 使用 JOIN 而不是多次查询
- 使用分页处理大量成员列表
