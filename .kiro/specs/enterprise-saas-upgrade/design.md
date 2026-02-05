# 设计文档：企业级 SaaS 升级

## 概述

本设计文档描述了将蓝图AI系统架构梳理工具升级为企业级多租户 SaaS 产品的技术架构。升级采用分阶段实施策略，在保持现有功能兼容的基础上，引入组织管理、权限控制、团队协作、企业级数据管理、高级分析、知识管理、系统集成和企业服务等核心能力。

设计采用 **Palantir 本体（Ontology）设计模式**，将系统架构建模为业务对象（Object Types）和关系（Link Types）的语义层，而非传统的表和外键。这种方法将数据绑定到业务实体，通过可导航的关系连接对象，并通过受控的操作（Actions）暴露安全的读写接口。

### 设计目标

1. **本体驱动架构**：将系统建模为对象和关系的语义层，作为组织的"数字孪生"
2. **多租户架构**：实现完全的数据隔离和资源隔离，支持数千个组织同时使用
3. **可扩展性**：支持从小团队到大型企业的平滑扩展
4. **安全性**：企业级安全标准，包括加密、审计、合规性支持
5. **性能**：快速响应（<3秒），支持大规模数据和高并发
6. **兼容性**：向后兼容现有用户数据和功能
7. **模块化**：功能模块化设计，便于分阶段实施和维护

### Palantir 本体设计模式核心概念

**本体（Ontology）** 不是学术分类法，而是一个操作契约，它：
- 将数据绑定到业务对象（Object Types）
- 通过显式关系（Link Types）连接对象
- 通过受控操作（Actions）暴露安全的读写接口
- 提供类型化、可遍历、运行时可强制执行的契约

**四层架构**：
1. **数据层**：数据源的规范化和标识符统一
2. **本体层**：对象类型和链接类型的定义
3. **业务逻辑层**：对象上的函数（Functions on Objects）
4. **应用层**：基于本体的用户界面和工作流

**关键原则**：
- 从单一决策面开始，而非试图建模整个企业
- 只建模代理必须读取和可能更改的内容
- 通过受控的 Actions 提交变更，而非直接数据库操作
- 使用 DecisionReceipt 对象记录决策来源和依据

### 技术栈选择

- **后端框架**：Node.js + Express / NestJS（TypeScript）
- **数据库**：PostgreSQL（主数据库）+ Redis（缓存）
- **认证**：JWT + Passport.js（支持多种策略）
- **API 文档**：Swagger/OpenAPI
- **任务队列**：Bull（基于 Redis）
- **文件存储**：S3 兼容对象存储
- **搜索引擎**：Elasticsearch（可选，用于全文搜索）
- **监控**：Prometheus + Grafana
- **日志**：Winston + ELK Stack（可选）

## 架构

### 整体架构（基于 Palantir 本体模式）

系统采用四层本体驱动架构：

```
┌─────────────────────────────────────────────────────────┐
│                  第四层：应用体验层                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Web App (React) │ Workshop UI │ API Clients      │  │
│  │ 基于本体对象的用户界面和工作流                     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│              第三层：业务逻辑层（Functions）              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Functions on Objects (FOO)                       │  │
│  │ - 读取对象属性                                    │  │
│  │ - 遍历链接关系                                    │  │
│  │ - 执行聚合计算                                    │  │
│  │ - 通过 Actions 执行编辑                          │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Actions（受控操作）                               │  │
│  │ - 创建/更新/删除对象                              │  │
│  │ - 权限检查和业务规则验证                          │  │
│  │ - 审计日志记录                                    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│              第二层：本体建模层（Ontology）               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 对象类型（Object Types）                          │  │
│  │ Organization, Project, Module, Entity,           │  │
│  │ Member, Department, Comment, ChangeRequest,      │  │
│  │ Version, ADR, Tag, DecisionReceipt...            │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 链接类型（Link Types）                            │  │
│  │ Organization→Member, Project→Module,             │  │
│  │ Module→Entity, Comment→Resource,                 │  │
│  │ ChangeRequest→Project, Version→Project...        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│            第一层：数据落地和规范化层                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 数据源集成和标识符统一                            │  │
│  │ PostgreSQL │ Redis │ S3 │ Elasticsearch          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**关键设计决策**：
1. **对象优先于表**：业务逻辑操作对象而非直接操作数据库表
2. **链接优先于JOIN**：关系作为一等公民，可导航和查询
3. **Actions 优先于直接更新**：所有写操作通过受控的 Actions 执行
4. **DecisionReceipt 记录决策**：每个重要操作创建决策收据对象


### 多租户架构设计

采用**共享数据库、共享模式（Shared Database, Shared Schema）**的多租户模式，通过 `organization_id` 字段实现数据隔离。

**优势**：
- 成本效益高，易于维护
- 资源利用率高
- 便于跨租户分析和优化

**数据隔离策略**：
1. 所有业务表包含 `organization_id` 字段
2. 使用 Row-Level Security (RLS) 或 ORM 中间件自动添加租户过滤
3. 数据库索引优化（复合索引包含 organization_id）
4. 应用层双重验证（防止 SQL 注入绕过）

**租户上下文管理**：
```typescript
// 请求中间件提取租户上下文
interface TenantContext {
  organizationId: string;
  userId: string;
  roles: string[];
  permissions: string[];
}

// 所有数据库查询自动注入租户过滤
class TenantAwareRepository<T> {
  async find(criteria: any): Promise<T[]> {
    const tenantId = getCurrentTenantId();
    return this.repository.find({
      ...criteria,
      where: { ...criteria.where, organizationId: tenantId }
    });
  }
}
```

### 权限控制架构

采用 **RBAC (Role-Based Access Control) + ABAC (Attribute-Based Access Control)** 混合模型。

**权限层级**：
1. **组织级权限**：控制组织资源的访问（成员管理、设置）
2. **项目级权限**：控制特定项目的访问（查看、编辑、删除）
3. **资源级权限**：控制特定资源的操作（评论、审批）

**权限检查流程**：
```
用户请求 → 认证 → 提取用户角色 → 检查组织权限 → 检查项目权限 → 执行操作
```

**权限定义**：
```typescript
enum Permission {
  // 组织级
  ORG_MANAGE_MEMBERS = 'org:manage:members',
  ORG_MANAGE_SETTINGS = 'org:manage:settings',
  ORG_VIEW_AUDIT_LOGS = 'org:view:audit_logs',
  
  // 项目级
  PROJECT_CREATE = 'project:create',
  PROJECT_VIEW = 'project:view',
  PROJECT_EDIT = 'project:edit',
  PROJECT_DELETE = 'project:delete',
  PROJECT_SHARE = 'project:share',
  
  // 内容级
  CONTENT_COMMENT = 'content:comment',
  CONTENT_APPROVE = 'content:approve',
}

// 角色到权限的映射
const RolePermissions = {
  ADMIN: [/* 所有权限 */],
  ARCHITECT: [PROJECT_CREATE, PROJECT_VIEW, PROJECT_EDIT, PROJECT_DELETE, ...],
  DEVELOPER: [PROJECT_VIEW, PROJECT_EDIT, CONTENT_COMMENT, ...],
  VIEWER: [PROJECT_VIEW, ...]
};
```

## 本体定义

### 核心对象类型（Object Types）

基于 Palantir 本体模式，我们定义以下核心对象类型。每个对象类型都映射到底层数据源，具有明确的属性和主键。

#### 1. Organization（组织）

组织是多租户系统的顶层对象，代表一个独立的租户实体。

```typescript
interface Organization {
  id: string;                    // 主键
  name: string;                  // 组织名称
  slug: string;                  // URL 友好标识符
  logoUrl?: string;              // Logo URL
  settings: OrganizationSettings; // 组织配置
  createdAt: Date;
  updatedAt: Date;
}

// 链接关系
// Organization → Member (一对多)
// Organization → Department (一对多)
// Organization → Project (一对多)
// Organization → Subscription (一对一)
// Organization → Tag (一对多)
```

#### 2. Member（成员）

成员代表组织内的用户，具有特定角色和权限。

```typescript
interface Member {
  id: string;
  organizationId: string;        // 所属组织
  userId: string;                // 关联用户
  departmentId?: string;         // 所属部门
  role: Role;                    // 角色：ADMIN, ARCHITECT, DEVELOPER, VIEWER
  joinedAt: Date;
}

// 链接关系
// Member → Organization (多对一)
// Member → Department (多对一)
// Member → User (多对一)
```

#### 3. Department（部门）

部门支持树形组织结构。

```typescript
interface Department {
  id: string;
  organizationId: string;
  parentId?: string;             // 父部门
  name: string;
  description?: string;
  path: string;                  // ltree 路径
  createdAt: Date;
}

// 链接关系
// Department → Organization (多对一)
// Department → Department (父子关系)
// Department → Member (一对多)
```

#### 4. Project（项目）

项目是架构建模的工作空间。

```typescript
interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  createdBy: string;
  approvalEnabled: boolean;      // 是否启用审批流程
  approvalConfig: ApprovalConfig;
  createdAt: Date;
  updatedAt: Date;
}

// 链接关系
// Project → Organization (多对一)
// Project → Member (创建者)
// Project → ProjectMember (协作成员，多对多)
// Project → Module (一对多)
// Project → Version (一对多)
// Project → Comment (一对多)
// Project → ChangeRequest (一对多)
// Project → ADR (一对多)
```

#### 5. Module（模块）

模块是系统架构的组成部分。

```typescript
interface Module {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// 链接关系
// Module → Project (多对一)
// Module → Entity (一对多)
// Module → Module (依赖关系，多对多)
```

#### 6. ChangeRequest（变更请求）

变更请求用于审批流程。

```typescript
interface ChangeRequest {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description: string;
  changeData: any;               // 变更内容
  status: ChangeStatus;          // PENDING, APPROVED, REJECTED
  requestedBy: string;
  reviewedBy?: string;
  reviewComment?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

// 链接关系
// ChangeRequest → Project (多对一)
// ChangeRequest → Member (请求者)
// ChangeRequest → Member (审批者)
// ChangeRequest → DecisionReceipt (一对一)
```

#### 7. DecisionReceipt（决策收据）

**关键对象**：记录所有重要决策的来源和依据，这是 Palantir 模式的核心。

```typescript
interface DecisionReceipt {
  id: string;
  organizationId: string;
  resourceType: string;          // 决策涉及的资源类型
  resourceId: string;            // 决策涉及的资源ID
  action: string;                // 执行的操作
  inputsReferenced: string[];    // 引用的输入数据
  policiesApplied: string[];     // 应用的策略
  approvals: Approval[];         // 审批记录
  outcome: string;               // 结果
  riskScore?: number;            // 风险评分
  userId: string;                // 执行用户
  timestamp: Date;
  metadata: Record<string, any>;
}

// 链接关系
// DecisionReceipt → ChangeRequest (一对一)
// DecisionReceipt → Member (执行者)
// DecisionReceipt → PolicyRule (多对多)
```

#### 8. Version（版本）

版本保存项目的完整快照。

```typescript
interface Version {
  id: string;
  organizationId: string;
  projectId: string;
  versionNumber: number;
  label?: string;
  description?: string;
  snapshotData: any;             // 完整快照
  createdBy: string;
  createdAt: Date;
}

// 链接关系
// Version → Project (多对一)
// Version → Member (创建者)
```

#### 9. Comment（评论）

评论支持讨论和协作。

```typescript
interface Comment {
  id: string;
  organizationId: string;
  projectId: string;
  resourceType: string;
  resourceId: string;
  parentId?: string;             // 回复的父评论
  userId: string;
  content: string;
  mentions: string[];            // 被提及的用户
  createdAt: Date;
  updatedAt: Date;
}

// 链接关系
// Comment → Project (多对一)
// Comment → Member (作者)
// Comment → Comment (回复关系)
// Comment → Resource (多态关系)
```

#### 10. ADR（架构决策记录）

ADR 记录重要的架构决策。

```typescript
interface ADR {
  id: string;
  organizationId: string;
  projectId: string;
  number: number;
  title: string;
  status: ADRStatus;             // PROPOSED, ACCEPTED, DEPRECATED, SUPERSEDED
  context: string;
  decision: string;
  consequences: string;
  supersededBy?: string;
  relatedModules: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 链接关系
// ADR → Project (多对一)
// ADR → Member (创建者)
// ADR → ADR (替代关系)
// ADR → Module (关联模块，多对多)
```

### 链接类型（Link Types）

链接类型定义对象之间的关系，是本体的核心。

```typescript
// 组织关系
Organization → Member          // 组织的成员
Organization → Department      // 组织的部门
Organization → Project         // 组织的项目
Organization → Subscription    // 组织的订阅

// 项目关系
Project → Module               // 项目的模块
Project → Version              // 项目的版本
Project → Comment              // 项目的评论
Project → ChangeRequest        // 项目的变更请求
Project → ADR                  // 项目的架构决策
Project → ProjectMember        // 项目的协作成员

// 模块关系
Module → Entity                // 模块的实体
Module → Module                // 模块依赖（DependsOn）

// 变更和决策关系
ChangeRequest → DecisionReceipt // 变更请求的决策记录
DecisionReceipt → PolicyRule    // 决策应用的策略

// 评论关系
Comment → Comment              // 评论回复
Comment → Member               // 评论提及

// 部门关系
Department → Department        // 父子部门
Department → Member            // 部门成员
```

## 组件和接口

### 核心服务组件（基于本体模式）

#### 1. 本体服务 (OntologyService)

本体服务是核心，提供对象和链接的统一访问接口。

```typescript
interface OntologyService {
  // 对象查询
  getObject<T>(type: string, id: string): Promise<T>;
  queryObjects<T>(type: string, filters: QueryFilters): Promise<T[]>;
  searchObjects<T>(type: string, query: string): Promise<T[]>;
  
  // 链接遍历
  getLinkedObjects<T>(objectId: string, linkType: string): Promise<T[]>;
  traversePath<T>(startId: string, path: string[]): Promise<T[]>;
  
  // 对象操作（通过 Actions）
  executeAction(actionType: string, params: any): Promise<ActionResult>;
  
  // 批量操作
  batchQuery<T>(queries: Query[]): Promise<T[][]>;
}
```

#### 2. Actions（受控操作）

Actions 是本体模式的核心机制，所有写操作必须通过 Actions 执行。Actions 提供：
- 权限检查和业务规则验证
- 审计日志自动记录
- 事务性保证
- 决策收据生成

```typescript
// Action 基类
interface Action<TInput, TOutput> {
  name: string;
  description: string;
  permissions: Permission[];
  
  validate(input: TInput, context: ActionContext): Promise<ValidationResult>;
  execute(input: TInput, context: ActionContext): Promise<TOutput>;
  audit(input: TInput, output: TOutput, context: ActionContext): Promise<void>;
}

// 核心 Actions 定义

// 1. 创建组织 Action
class CreateOrganizationAction implements Action<CreateOrgInput, Organization> {
  name = 'CreateOrganization';
  permissions = [Permission.SYSTEM_ADMIN];
  
  async execute(input: CreateOrgInput, context: ActionContext): Promise<Organization> {
    // 创建组织
    const org = await this.ontology.createObject('Organization', input);
    
    // 自动将创建者设为管理员
    await this.ontology.createObject('Member', {
      organizationId: org.id,
      userId: context.userId,
      role: 'ADMIN'
    });
    
    // 创建决策收据
    await this.createDecisionReceipt({
      resourceType: 'Organization',
      resourceId: org.id,
      action: 'CREATE',
      userId: context.userId
    });
    
    return org;
  }
}

// 2. 审批变更请求 Action
class ApproveChangeRequestAction implements Action<ApproveInput, ChangeRequest> {
  name = 'ApproveChangeRequest';
  permissions = [Permission.PROJECT_APPROVE];
  
  async execute(input: ApproveInput, context: ActionContext): Promise<ChangeRequest> {
    const request = await this.ontology.getObject('ChangeRequest', input.requestId);
    
    // 验证状态
    if (request.status !== 'PENDING') {
      throw new Error('Only pending requests can be approved');
    }
    
    // 应用变更
    await this.applyChanges(request.changeData);
    
    // 更新请求状态
    request.status = 'APPROVED';
    request.reviewedBy = context.userId;
    request.reviewedAt = new Date();
    request.reviewComment = input.comment;
    
    // 创建决策收据
    await this.createDecisionReceipt({
      resourceType: 'ChangeRequest',
      resourceId: request.id,
      action: 'APPROVE',
      inputsReferenced: [request.projectId],
      policiesApplied: ['change-approval-policy'],
      userId: context.userId,
      outcome: 'APPROVED'
    });
    
    return request;
  }
}

// 3. 分配成员到部门 Action
class AssignMemberToDepartmentAction implements Action<AssignInput, Member> {
  name = 'AssignMemberToDepartment';
  permissions = [Permission.ORG_MANAGE_MEMBERS];
  
  async execute(input: AssignInput, context: ActionContext): Promise<Member> {
    const member = await this.ontology.getObject('Member', input.memberId);
    
    // 更新部门
    const oldDepartmentId = member.departmentId;
    member.departmentId = input.departmentId;
    
    // 记录审计日志
    await this.audit({
      action: 'MEMBER_DEPARTMENT_CHANGE',
      resourceType: 'Member',
      resourceId: member.id,
      oldValue: { departmentId: oldDepartmentId },
      newValue: { departmentId: input.departmentId },
      userId: context.userId
    });
    
    return member;
  }
}

// 4. 创建评论并通知 Action
class CreateCommentAction implements Action<CommentInput, Comment> {
  name = 'CreateComment';
  permissions = [Permission.CONTENT_COMMENT];
  
  async execute(input: CommentInput, context: ActionContext): Promise<Comment> {
    // 创建评论
    const comment = await this.ontology.createObject('Comment', {
      ...input,
      userId: context.userId,
      organizationId: context.organizationId
    });
    
    // 发送通知给被提及的用户
    for (const mentionedUserId of input.mentions) {
      await this.notificationService.sendNotification(mentionedUserId, {
        type: 'MENTIONED',
        title: '您在评论中被提及',
        message: `${context.userName} 在评论中提及了您`,
        data: { commentId: comment.id }
      });
    }
    
    return comment;
  }
}

// 5. 创建版本快照 Action
class CreateVersionAction implements Action<VersionInput, Version> {
  name = 'CreateVersion';
  permissions = [Permission.PROJECT_EDIT];
  
  async execute(input: VersionInput, context: ActionContext): Promise<Version> {
    // 获取项目完整数据
    const project = await this.ontology.getObject('Project', input.projectId);
    const modules = await this.ontology.getLinkedObjects(project.id, 'Project→Module');
    const entities = await Promise.all(
      modules.map(m => this.ontology.getLinkedObjects(m.id, 'Module→Entity'))
    );
    
    // 创建快照
    const snapshot = {
      project,
      modules,
      entities: entities.flat()
    };
    
    // 创建版本对象
    const version = await this.ontology.createObject('Version', {
      projectId: input.projectId,
      organizationId: context.organizationId,
      versionNumber: await this.getNextVersionNumber(input.projectId),
      label: input.label,
      description: input.description,
      snapshotData: snapshot,
      createdBy: context.userId
    });
    
    return version;
  }
}
```

#### 3. 组织管理服务 (OrganizationService)

负责组织、部门和成员的管理。

```typescript
interface OrganizationService {
  // 组织管理
  createOrganization(data: CreateOrgDto): Promise<Organization>;
  getOrganization(id: string): Promise<Organization>;
  updateOrganization(id: string, data: UpdateOrgDto): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;
  
  // 部门管理
  createDepartment(orgId: string, data: CreateDeptDto): Promise<Department>;
  getDepartmentTree(orgId: string): Promise<DepartmentTree>;
  moveDepartment(deptId: string, newParentId: string): Promise<void>;
  deleteDepartment(deptId: string, reassignTo?: string): Promise<void>;
  
  // 成员管理
  inviteMember(orgId: string, email: string, role: Role): Promise<Invitation>;
  acceptInvitation(token: string): Promise<Member>;
  removeMember(orgId: string, userId: string): Promise<void>;
  updateMemberRole(orgId: string, userId: string, role: Role): Promise<void>;
}
```


#### 2. 权限管理服务 (PermissionService)

负责权限检查和授权。

```typescript
interface PermissionService {
  // 权限检查
  hasPermission(userId: string, permission: Permission, resourceId?: string): Promise<boolean>;
  checkPermission(userId: string, permission: Permission, resourceId?: string): Promise<void>; // 抛出异常
  
  // 角色管理
  assignRole(userId: string, orgId: string, role: Role): Promise<void>;
  assignProjectRole(userId: string, projectId: string, role: Role): Promise<void>;
  getUserRoles(userId: string, orgId: string): Promise<Role[]>;
  
  // 权限查询
  getUserPermissions(userId: string, orgId: string): Promise<Permission[]>;
  getProjectMembers(projectId: string): Promise<ProjectMember[]>;
}
```

#### 3. 项目协作服务 (CollaborationService)

负责项目共享、评论和讨论。

```typescript
interface CollaborationService {
  // 项目共享
  shareProject(projectId: string, userId: string, accessLevel: AccessLevel): Promise<void>;
  unshareProject(projectId: string, userId: string): Promise<void>;
  getProjectCollaborators(projectId: string): Promise<Collaborator[]>;
  
  // 评论系统
  addComment(resourceType: string, resourceId: string, content: string, mentions: string[]): Promise<Comment>;
  replyToComment(commentId: string, content: string): Promise<Comment>;
  editComment(commentId: string, content: string): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;
  getComments(resourceType: string, resourceId: string): Promise<CommentThread[]>;
  
  // 在线状态
  updateUserPresence(projectId: string, userId: string, status: PresenceStatus): Promise<void>;
  getActiveUsers(projectId: string): Promise<ActiveUser[]>;
}
```

#### 4. 变更管理服务 (ChangeManagementService)

负责变更请求和审批流程。

```typescript
interface ChangeManagementService {
  // 变更请求
  createChangeRequest(projectId: string, data: ChangeRequestDto): Promise<ChangeRequest>;
  getChangeRequest(id: string): Promise<ChangeRequest>;
  listChangeRequests(projectId: string, status?: ChangeStatus): Promise<ChangeRequest[]>;
  
  // 审批流程
  approveChange(requestId: string, comment?: string): Promise<void>;
  rejectChange(requestId: string, reason: string): Promise<void>;
  applyChange(requestId: string): Promise<void>;
  
  // 审批配置
  enableApprovalWorkflow(projectId: string, approvers: string[]): Promise<void>;
  disableApprovalWorkflow(projectId: string): Promise<void>;
}
```

#### 5. 版本控制服务 (VersionControlService)

负责项目版本管理和历史追踪。

```typescript
interface VersionControlService {
  // 版本管理
  createVersion(projectId: string, label?: string, description?: string): Promise<Version>;
  getVersion(versionId: string): Promise<Version>;
  listVersions(projectId: string): Promise<Version[]>;
  
  // 版本比较
  compareVersions(versionId1: string, versionId2: string): Promise<VersionDiff>;
  
  // 版本回滚
  revertToVersion(projectId: string, versionId: string): Promise<Version>;
  
  // 变更日志
  getChangeLog(projectId: string, filters?: ChangeLogFilters): Promise<ChangeLogEntry[]>;
  exportChangeLog(projectId: string, format: 'csv' | 'json'): Promise<Buffer>;
}
```

#### 6. 通知服务 (NotificationService)

负责系统通知的发送和管理。

```typescript
interface NotificationService {
  // 发送通知
  sendNotification(userId: string, notification: NotificationDto): Promise<void>;
  sendBulkNotification(userIds: string[], notification: NotificationDto): Promise<void>;
  
  // 通知管理
  getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  
  // 通知偏好
  updatePreferences(userId: string, preferences: NotificationPreferences): Promise<void>;
  getPreferences(userId: string): Promise<NotificationPreferences>;
  
  // 通知渠道
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendInApp(userId: string, message: string): Promise<void>;
}
```


#### 7. 分析引擎服务 (AnalyticsService)

负责系统复杂度分析、技术债务识别和依赖分析。

```typescript
interface AnalyticsService {
  // 复杂度分析
  calculateComplexity(projectId: string): Promise<ComplexityReport>;
  getModuleComplexity(moduleId: string): Promise<ComplexityScore>;
  getComplexityTrend(projectId: string, timeRange: TimeRange): Promise<TrendData>;
  
  // 技术债务
  identifyTechnicalDebt(projectId: string): Promise<TechnicalDebtItem[]>;
  updateDebtStatus(debtId: string, status: DebtStatus): Promise<void>;
  getDebtTrend(projectId: string): Promise<TrendData>;
  
  // 依赖分析
  generateDependencyGraph(projectId: string): Promise<DependencyGraph>;
  detectCircularDependencies(projectId: string): Promise<CircularDependency[]>;
  calculateCoupling(moduleId: string): Promise<CouplingMetrics>;
  
  // 影响分析
  analyzeImpact(elementId: string, elementType: string): Promise<ImpactAnalysis>;
}
```

#### 8. 知识管理服务 (KnowledgeService)

负责文档生成、ADR 管理和搜索。

```typescript
interface KnowledgeService {
  // 文档生成
  generateDocument(projectId: string, template: string, options: DocOptions): Promise<Document>;
  exportDocument(documentId: string, format: 'md' | 'pdf'): Promise<Buffer>;
  
  // ADR 管理
  createADR(projectId: string, data: ADRDto): Promise<ADR>;
  updateADR(adrId: string, data: Partial<ADRDto>): Promise<ADR>;
  listADRs(projectId: string, filters?: ADRFilters): Promise<ADR[]>;
  supersede(oldAdrId: string, newAdrId: string): Promise<void>;
  
  // 搜索
  search(orgId: string, query: string, filters?: SearchFilters): Promise<SearchResult[]>;
  indexProject(projectId: string): Promise<void>;
  
  // 标签管理
  createTag(orgId: string, name: string, color: string): Promise<Tag>;
  addTag(resourceType: string, resourceId: string, tagId: string): Promise<void>;
  removeTag(resourceType: string, resourceId: string, tagId: string): Promise<void>;
  listTags(orgId: string): Promise<Tag[]>;
}
```

#### 9. 集成服务 (IntegrationService)

负责 API、Webhook 和第三方集成。

```typescript
interface IntegrationService {
  // API 密钥管理
  createApiKey(orgId: string, name: string, scopes: string[]): Promise<ApiKey>;
  revokeApiKey(keyId: string): Promise<void>;
  listApiKeys(orgId: string): Promise<ApiKey[]>;
  
  // Webhook 管理
  createWebhook(orgId: string, url: string, events: string[]): Promise<Webhook>;
  updateWebhook(webhookId: string, data: Partial<WebhookDto>): Promise<Webhook>;
  deleteWebhook(webhookId: string): Promise<void>;
  testWebhook(webhookId: string): Promise<WebhookTestResult>;
  
  // 第三方集成
  connectJira(orgId: string, config: JiraConfig): Promise<Integration>;
  connectConfluence(orgId: string, config: ConfluenceConfig): Promise<Integration>;
  connectGitLab(orgId: string, config: GitLabConfig): Promise<Integration>;
  disconnectIntegration(integrationId: string): Promise<void>;
  
  // 数据同步
  syncWithJira(projectId: string): Promise<SyncResult>;
  publishToConfluence(projectId: string, spaceKey: string): Promise<string>; // 返回页面 URL
}
```

#### 10. 订阅管理服务 (SubscriptionService)

负责订阅套餐、配额和计费。

```typescript
interface SubscriptionService {
  // 订阅管理
  getSubscription(orgId: string): Promise<Subscription>;
  upgradeSubscription(orgId: string, tier: SubscriptionTier): Promise<Subscription>;
  downgradeSubscription(orgId: string, tier: SubscriptionTier): Promise<Subscription>;
  cancelSubscription(orgId: string): Promise<void>;
  
  // 配额检查
  checkQuota(orgId: string, resource: QuotaResource): Promise<QuotaStatus>;
  getUsage(orgId: string): Promise<UsageStats>;
  
  // 计费
  createPaymentMethod(orgId: string, paymentMethod: PaymentMethodDto): Promise<void>;
  updatePaymentMethod(orgId: string, paymentMethod: PaymentMethodDto): Promise<void>;
  getInvoices(orgId: string): Promise<Invoice[]>;
  downloadInvoice(invoiceId: string): Promise<Buffer>;
  
  // 使用统计
  getUsageStats(orgId: string, timeRange: TimeRange): Promise<UsageReport>;
}
```


#### 11. 认证服务 (AuthenticationService)

负责用户认证、SSO 和 LDAP 集成。

```typescript
interface AuthenticationService {
  // 基础认证
  login(email: string, password: string): Promise<AuthToken>;
  logout(token: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthToken>;
  
  // 密码管理
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  
  // 双因素认证
  enable2FA(userId: string): Promise<TwoFactorSecret>;
  verify2FA(userId: string, code: string): Promise<boolean>;
  disable2FA(userId: string, code: string): Promise<void>;
  
  // SSO
  configureSAML(orgId: string, config: SAMLConfig): Promise<void>;
  configureOAuth(orgId: string, config: OAuthConfig): Promise<void>;
  loginWithSSO(orgId: string, ssoToken: string): Promise<AuthToken>;
  
  // LDAP
  configureLDAP(orgId: string, config: LDAPConfig): Promise<void>;
  syncLDAPUsers(orgId: string): Promise<SyncResult>;
  authenticateWithLDAP(username: string, password: string): Promise<AuthToken>;
}
```

#### 12. 审计服务 (AuditService)

负责审计日志记录和查询。

```typescript
interface AuditService {
  // 日志记录
  logAction(action: AuditAction): Promise<void>;
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  
  // 日志查询
  getAuditLogs(orgId: string, filters: AuditFilters): Promise<AuditLog[]>;
  searchAuditLogs(orgId: string, query: string): Promise<AuditLog[]>;
  exportAuditLogs(orgId: string, filters: AuditFilters, format: 'csv'): Promise<Buffer>;
  
  // 合规性
  generateComplianceReport(orgId: string, reportType: ComplianceReportType): Promise<Report>;
}
```

#### 13. 备份恢复服务 (BackupService)

负责数据备份和恢复。

```typescript
interface BackupService {
  // 备份管理
  createBackup(orgId: string, manual?: boolean): Promise<Backup>;
  listBackups(orgId: string): Promise<Backup[]>;
  deleteBackup(backupId: string): Promise<void>;
  downloadBackup(backupId: string): Promise<Buffer>;
  
  // 恢复
  restoreFromBackup(orgId: string, backupId: string): Promise<void>;
  
  // 自动备份
  scheduleAutoBackup(orgId: string, schedule: BackupSchedule): Promise<void>;
}
```

## 数据模型

### 本体视角 vs 数据库视角

**重要设计原则**：虽然底层使用关系数据库存储，但业务逻辑应该操作本体对象和链接，而非直接操作表和外键。

**本体视角**（业务逻辑层）：
- 对象类型：Organization, Project, Module, Member...
- 链接类型：Organization→Member, Project→Module...
- 操作：Actions（CreateOrganization, ApproveChange...）

**数据库视角**（存储层）：
- 表：organizations, projects, modules, members...
- 外键：organization_id, project_id...
- SQL 操作：INSERT, UPDATE, DELETE

**映射层**：ORM（TypeORM/Prisma）负责在两者之间转换，但应该被封装在 Repository 层，业务逻辑不直接访问。

### 核心实体关系图（本体视角）

```
Organization (组织) - 租户的根对象
    ├─→ Member (成员) - 组织的用户
    │   └─→ Department (部门) - 成员所属部门
    ├─→ Department (部门) - 树形结构
    │   └─→ Department (子部门)
    ├─→ Project (项目) - 架构工作空间
    │   ├─→ Module (模块) - 系统组件
    │   │   ├─→ Entity (实体) - 数据模型
    │   │   └─→ Module (依赖) - 模块间依赖
    │   ├─→ Version (版本) - 项目快照
    │   ├─→ Comment (评论) - 讨论和反馈
    │   ├─→ ChangeRequest (变更请求) - 审批流程
    │   │   └─→ DecisionReceipt (决策收据) - 决策记录
    │   └─→ ADR (架构决策记录) - 设计决策
    │       └─→ Module (关联模块)
    ├─→ Tag (标签) - 分类和组织
    ├─→ Subscription (订阅) - 套餐和计费
    └─→ AuditLog (审计日志) - 操作追踪
```

### 数据库表设计

数据库表是本体对象的持久化存储，每个对象类型对应一个或多个表。

#### 1. 组织相关表

```sql
-- 组织表
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 部门表（支持树形结构）
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    path LTREE, -- PostgreSQL ltree 类型用于高效树查询
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, name, parent_id)
);

CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_path ON departments USING GIST(path);

-- 成员表
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL, -- ADMIN, ARCHITECT, DEVELOPER, VIEWER
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_members_org ON members(organization_id);
CREATE INDEX idx_members_user ON members(user_id);

-- 邀请表
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_org ON invitations(organization_id);
```


#### 2. 项目和权限表

```sql
-- 项目表（扩展现有表）
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN approval_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN approval_config JSONB DEFAULT '{}';

CREATE INDEX idx_projects_org ON projects(organization_id);

-- 项目成员表（项目级权限）
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level VARCHAR(50) NOT NULL, -- OWNER, EDITOR, VIEWER
    added_at TIMESTAMP DEFAULT NOW(),
    added_by UUID REFERENCES users(id),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- 评论表
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- MODULE, ENTITY, RELATION, PROJECT
    resource_id UUID NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- 用于回复
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    mentions UUID[], -- 被 @ 的用户 ID 数组
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_comments_org ON comments(organization_id);
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id);
CREATE INDEX idx_comments_project ON comments(project_id);

-- 变更请求表
CREATE TABLE change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    change_data JSONB NOT NULL, -- 变更的具体内容
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    requested_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    review_comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

CREATE INDEX idx_change_requests_org ON change_requests(organization_id);
CREATE INDEX idx_change_requests_project ON change_requests(project_id);
CREATE INDEX idx_change_requests_status ON change_requests(status);

-- 决策收据表（关键表，Palantir 模式核心）
CREATE TABLE decision_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    inputs_referenced JSONB NOT NULL DEFAULT '[]', -- 引用的输入数据ID列表
    policies_applied JSONB NOT NULL DEFAULT '[]', -- 应用的策略ID列表
    approvals JSONB DEFAULT '[]', -- 审批记录
    outcome VARCHAR(50) NOT NULL,
    risk_score DECIMAL(5,2),
    user_id UUID NOT NULL REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_decision_receipts_org ON decision_receipts(organization_id);
CREATE INDEX idx_decision_receipts_resource ON decision_receipts(resource_type, resource_id);
CREATE INDEX idx_decision_receipts_user ON decision_receipts(user_id);
CREATE INDEX idx_decision_receipts_time ON decision_receipts(timestamp DESC);
```

#### 3. 版本控制表

```sql
-- 版本表
CREATE TABLE versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    label VARCHAR(100), -- 如 v1.0-release
    description TEXT,
    snapshot_data JSONB NOT NULL, -- 项目完整快照
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, version_number)
);

CREATE INDEX idx_versions_org ON versions(organization_id);
CREATE INDEX idx_versions_project ON versions(project_id);

-- 变更日志表
CREATE TABLE change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
    old_value JSONB,
    new_value JSONB,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_change_logs_org ON change_logs(organization_id);
CREATE INDEX idx_change_logs_project ON change_logs(project_id);
CREATE INDEX idx_change_logs_time ON change_logs(changed_at DESC);
```

#### 4. 通知表

```sql
-- 通知表
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- PROJECT_SHARED, MENTIONED, CHANGE_APPROVED, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- 额外数据
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_org ON notifications(organization_id);

-- 通知偏好表
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    UNIQUE(user_id, organization_id)
);
```


#### 5. 知识管理表

```sql
-- ADR 表
CREATE TABLE adrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- PROPOSED, ACCEPTED, DEPRECATED, SUPERSEDED
    context TEXT NOT NULL,
    decision TEXT NOT NULL,
    consequences TEXT NOT NULL,
    superseded_by UUID REFERENCES adrs(id),
    related_modules UUID[], -- 关联的模块 ID
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, number)
);

CREATE INDEX idx_adrs_org ON adrs(organization_id);
CREATE INDEX idx_adrs_project ON adrs(project_id);
CREATE INDEX idx_adrs_status ON adrs(status);

-- 标签表
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL, -- HEX 颜色
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE INDEX idx_tags_org ON tags(organization_id);

-- 资源标签关联表
CREATE TABLE resource_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tag_id, resource_type, resource_id)
);

CREATE INDEX idx_resource_tags_resource ON resource_tags(resource_type, resource_id);
CREATE INDEX idx_resource_tags_tag ON resource_tags(tag_id);
```

#### 6. 集成和 API 表

```sql
-- API 密钥表
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- 存储哈希值
    scopes TEXT[] NOT NULL,
    last_used_at TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- Webhook 表
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL, -- 用于签名
    events TEXT[] NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);

-- Webhook 日志表
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    attempt_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_time ON webhook_logs(created_at DESC);

-- 第三方集成表
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- JIRA, CONFLUENCE, GITLAB
    config JSONB NOT NULL, -- 加密存储的配置
    active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_integrations_org ON integrations(organization_id);
CREATE INDEX idx_integrations_type ON integrations(type);
```


#### 7. 订阅和计费表

```sql
-- 订阅表
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    tier VARCHAR(50) NOT NULL, -- FREE, PROFESSIONAL, ENTERPRISE
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED, EXPIRED
    billing_cycle VARCHAR(50), -- MONTHLY, YEARLY
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- 配额表（定义每个套餐的限制）
CREATE TABLE quota_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL, -- PROJECTS, MEMBERS, STORAGE
    limit_value INTEGER NOT NULL,
    UNIQUE(tier, resource)
);

-- 使用量表
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    resource VARCHAR(50) NOT NULL,
    count INTEGER NOT NULL,
    recorded_at DATE NOT NULL,
    UNIQUE(organization_id, resource, recorded_at)
);

CREATE INDEX idx_usage_org_date ON usage_records(organization_id, recorded_at DESC);

-- 发票表
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL, -- 以分为单位
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- DRAFT, OPEN, PAID, VOID
    invoice_pdf_url TEXT,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
```

#### 8. 审计和安全表

```sql
-- 审计日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    result VARCHAR(50) NOT NULL, -- SUCCESS, FAILURE
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_time ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 备份表
CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- AUTO, MANUAL
    storage_path TEXT NOT NULL,
    size_bytes BIGINT,
    status VARCHAR(50) NOT NULL, -- PENDING, COMPLETED, FAILED
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX idx_backups_org ON backups(organization_id);
CREATE INDEX idx_backups_time ON backups(created_at DESC);

-- SSO 配置表
CREATE TABLE sso_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    provider VARCHAR(50) NOT NULL, -- SAML, OAUTH
    config JSONB NOT NULL, -- 加密存储
    enabled BOOLEAN DEFAULT FALSE,
    enforce BOOLEAN DEFAULT FALSE, -- 是否强制使用 SSO
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- LDAP 配置表
CREATE TABLE ldap_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    server_url TEXT NOT NULL,
    bind_dn TEXT NOT NULL,
    bind_password TEXT NOT NULL, -- 加密存储
    user_search_base TEXT NOT NULL,
    user_search_filter TEXT NOT NULL,
    group_search_base TEXT,
    sync_schedule VARCHAR(50), -- DAILY, WEEKLY
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```


## 正确性属性

正确性属性是关于系统行为的形式化陈述，应该在所有有效执行中保持为真。属性是人类可读规范和机器可验证正确性保证之间的桥梁。每个属性都将通过基于属性的测试来验证，使用随机生成的输入来确保系统在各种场景下的正确行为。

### 属性反思

在定义具体属性之前，我们需要识别并消除冗余：

**合并的属性组**：
1. 角色权限属性（2.2-2.5）可以合并为一个综合属性，测试所有角色的权限边界
2. 通知发送属性（6.1-6.5）可以合并为一个属性，测试各种事件触发通知
3. 版本操作属性（7.1-7.10）中，版本创建和版本回滚可以作为往返属性测试
4. 数据隔离属性（26.1-26.8）是最关键的，应该有专门的综合测试

**需要特别关注的往返属性**：
- 版本创建和回滚（7.10）
- 数据导入导出（22.1-22.9）
- 序列化和反序列化（备份恢复 9.1-9.10）

### 核心属性

#### 属性 1：组织创建者自动成为管理员

*对于任何*用户创建的组织，该用户应该自动被分配为该组织的管理员角色，并拥有所有管理权限。

**验证需求：1.2**

#### 属性 2：部门树形结构一致性

*对于任何*部门树结构，每个部门的路径（path）应该正确反映其在树中的位置，且父子关系应该保持一致（子部门的路径应该以父部门路径为前缀）。

**验证需求：1.3, 1.4**

#### 属性 3：成员转移保持唯一性

*对于任何*成员从一个部门转移到另一个部门的操作，转移后该成员应该只属于新部门，不应该同时属于多个部门。

**验证需求：1.6**

#### 属性 4：角色权限边界

*对于任何*用户和资源组合：
- 管理员角色应该能够执行所有操作（创建、读取、更新、删除）
- 架构师角色应该能够创建、读取、更新、删除项目
- 开发者角色应该能够读取和更新已分配的项目，但不能删除
- 只读角色应该只能读取已分配的项目，不能进行任何修改

**验证需求：2.2, 2.3, 2.4, 2.5**

#### 属性 5：项目级权限覆盖组织级权限

*对于任何*用户在组织和项目中拥有不同权限的情况，项目级权限应该优先于组织级权限，且权限检查应该返回项目级权限的结果。

**验证需求：2.6**

#### 属性 6：未授权访问被拒绝

*对于任何*用户尝试访问其没有权限的资源，系统应该拒绝访问并返回适当的错误，不应该泄露资源信息。

**验证需求：2.7**

#### 属性 7：权限变更被审计

*对于任何*权限变更操作（分配角色、撤销权限等），系统应该在审计日志中创建一条记录，包含操作者、时间戳、变更内容和结果。

**验证需求：2.9**

#### 属性 8：邀请令牌唯一性和过期

*对于任何*创建的邀请，系统应该生成唯一的令牌，且该令牌在创建后7天应该过期，过期后不应该能够被接受。

**验证需求：3.2, 3.3**

#### 属性 9：接受邀请创建成员关系

*对于任何*有效的邀请令牌，当用户接受邀请时，系统应该创建用户与组织之间的成员关系，且成员应该具有邀请中指定的角色和部门。

**验证需求：3.4, 3.5**

#### 属性 10：移除成员撤销所有访问权限

*对于任何*从组织中移除的成员，该成员应该失去对组织内所有资源（项目、部门、设置等）的访问权限。

**验证需求：3.8**


#### 属性 11：项目共享建立访问关系

*对于任何*项目共享操作，被共享的用户应该能够根据指定的访问级别（编辑或只读）访问项目，且访问权限应该与指定的级别一致。

**验证需求：4.1, 4.2**

#### 属性 12：评论包含完整元数据

*对于任何*创建的评论，系统应该记录评论者ID、时间戳、内容和资源关联信息，且这些信息应该在查询时完整返回。

**验证需求：4.6**

#### 属性 13：评论回复形成正确的线程结构

*对于任何*评论回复，回复应该正确关联到父评论，且查询评论线程时应该能够重建完整的讨论树结构。

**验证需求：4.7**

#### 属性 14：提及触发通知

*对于任何*在评论中被 @ 提及的用户，系统应该为该用户创建一条通知，通知类型为"被提及"，且通知应该包含评论的上下文信息。

**验证需求：4.9**

#### 属性 15：审批流程强制变更请求

*对于任何*启用了审批流程的项目，直接修改操作应该被阻止，用户应该被要求创建变更请求，且变更请求的初始状态应该为"待审批"。

**验证需求：5.2, 5.4**

#### 属性 16：批准变更应用修改

*对于任何*被批准的变更请求，系统应该应用变更请求中描述的修改，更新变更请求状态为"已批准"，且项目状态应该反映变更内容。

**验证需求：5.6**

#### 属性 17：拒绝变更保持原状

*对于任何*被拒绝的变更请求，系统应该保持项目原状不变，更新变更请求状态为"已拒绝"，且不应该应用任何修改。

**验证需求：5.7**

#### 属性 18：审批历史完整记录

*对于任何*变更请求，系统应该记录所有审批操作（批准、拒绝）的历史，包括审批者、时间戳和评论，且历史记录应该按时间顺序排列。

**验证需求：5.9**

#### 属性 19：版本创建保存完整快照

*对于任何*项目版本创建操作，系统应该保存项目的完整快照（包括所有模块、实体、关系和配置），且快照应该能够完整恢复项目状态。

**验证需求：7.1, 7.2**

#### 属性 20：版本比较识别差异

*对于任何*两个不同的项目版本，系统应该能够识别并高亮显示所有差异（新增、删除、修改的元素），且差异应该准确反映版本间的变化。

**验证需求：7.7, 7.8**

#### 属性 21：版本回滚往返一致性

*对于任何*项目版本，创建版本、进行修改、然后回滚到该版本，应该使项目恢复到创建版本时的状态（往返属性）。

**验证需求：7.9, 7.10**

#### 属性 22：变更日志记录所有修改

*对于任何*项目内容的修改操作（创建、更新、删除），系统应该在变更日志中创建记录，包含操作类型、操作者、时间戳、变更前后的值。

**验证需求：8.1, 8.2**

#### 属性 23：备份包含完整组织数据

*对于任何*组织备份，备份应该包含该组织的所有数据（项目、成员、权限、配置），且从备份恢复应该能够完整重建组织状态（往返属性）。

**验证需求：9.4, 9.8**

#### 属性 24：审计日志不可修改

*对于任何*已创建的审计日志记录，系统不应该提供修改或删除该记录的功能，且日志记录应该永久保留（至少1年）。

**验证需求：10.11**

#### 属性 25：安全事件被审计

*对于任何*安全相关操作（登录、登出、权限修改、成员管理、配置变更），系统应该在审计日志中创建记录，包含操作者、IP地址、用户代理和操作结果。

**验证需求：10.2, 10.3, 10.4, 10.5**


#### 属性 26：复杂度评分单调性

*对于任何*项目，当添加模块、实体或关系时，复杂度评分应该增加或保持不变，不应该减少（单调性属性）。

**验证需求：11.1, 11.2**

#### 属性 27：循环依赖被识别为高复杂度

*对于任何*包含循环依赖的项目，系统应该将循环依赖标记为复杂度风险，且复杂度评分应该反映循环依赖的存在。

**验证需求：11.8**

#### 属性 28：技术债务检测规则一致性

*对于任何*满足技术债务模式的元素（过多依赖、过多属性、循环依赖、缺少文档），系统应该一致地将其标记为技术债务，且严重程度应该根据预定义规则确定。

**验证需求：12.2, 12.3, 12.4, 12.5**

#### 属性 29：依赖图完整性

*对于任何*项目，生成的依赖图应该包含所有模块和它们之间的所有依赖关系，且图中的每条边应该对应项目中的一个实际依赖关系。

**验证需求：13.1, 13.2**

#### 属性 30：影响分析传递性

*对于任何*模块A依赖模块B，模块B依赖模块C的情况，修改模块C的影响分析应该包含模块A和模块B（传递依赖）。

**验证需求：14.3**

#### 属性 31：搜索结果权限过滤

*对于任何*搜索查询，返回的结果应该只包含用户有权限访问的资源，不应该泄露用户无权访问的资源信息。

**验证需求：17.8**

#### 属性 32：标签删除级联清理

*对于任何*被删除的标签，系统应该从所有关联的资源中移除该标签，且删除后不应该有任何资源仍然关联到该标签。

**验证需求：18.9**

#### 属性 33：API 速率限制强制执行

*对于任何*超过速率限制的 API 请求序列，系统应该拒绝超出限制的请求并返回 429 状态码，且速率限制应该根据订阅套餐正确应用。

**验证需求：19.6, 19.7**

#### 属性 34：Webhook 重试机制

*对于任何*失败的 Webhook 请求，系统应该重试最多3次（使用指数退避），且所有尝试应该被记录在 Webhook 日志中。

**验证需求：20.8, 20.9**

#### 属性 35：数据导入导出往返一致性

*对于任何*项目，导出为 JSON 格式然后重新导入，应该产生与原项目等价的项目（往返属性），包括所有模块、实体、关系和元数据。

**验证需求：22.1, 22.4, 22.5**

#### 属性 36：SSO 令牌验证

*对于任何*SSO 登录尝试，系统应该验证 SAML 断言或 OAuth 令牌的有效性、签名和过期时间，只有有效令牌应该被接受。

**验证需求：23.4**

#### 属性 37：LDAP 同步幂等性

*对于任何*LDAP 同步操作，连续执行两次同步（在 LDAP 数据未变化的情况下）应该产生相同的结果，不应该创建重复的用户或部门（幂等性属性）。

**验证需求：24.4, 24.5**

#### 属性 38：数据隔离完整性（关键安全属性）

*对于任何*数据库查询和 API 请求，系统应该自动添加租户过滤条件，确保用户只能访问其所属组织的数据，不应该能够访问其他组织的数据（即使通过 SQL 注入或 API 参数篡改）。

**验证需求：26.2, 26.3, 26.6**

#### 属性 39：配额限制强制执行

*对于任何*尝试超过订阅配额的操作（创建项目、添加成员、使用存储），系统应该阻止操作并提示用户升级套餐，且不应该允许超出配额。

**验证需求：28.8**

#### 属性 40：订阅降级时的配额调整

*对于任何*订阅降级操作，如果当前使用量超过新套餐的配额，系统应该要求用户先减少使用量，不应该允许降级导致超出配额的状态。

**验证需求：28.7**


## 错误处理

### 错误分类

系统采用分层错误处理策略，将错误分为以下类别：

1. **验证错误（400 Bad Request）**
   - 输入数据格式错误
   - 必填字段缺失
   - 数据类型不匹配
   - 业务规则违反（如邀请令牌过期）

2. **认证错误（401 Unauthorized）**
   - 未提供认证凭证
   - 认证凭证无效或过期
   - 2FA 验证失败

3. **授权错误（403 Forbidden）**
   - 用户无权限执行操作
   - 配额限制超出
   - 订阅套餐限制

4. **资源错误（404 Not Found）**
   - 请求的资源不存在
   - 资源已被删除

5. **冲突错误（409 Conflict）**
   - 资源已存在（如重复的组织标识符）
   - 并发修改冲突
   - 状态冲突（如尝试批准已批准的变更请求）

6. **速率限制错误（429 Too Many Requests）**
   - API 调用超过速率限制

7. **服务器错误（500 Internal Server Error）**
   - 未预期的系统错误
   - 数据库连接失败
   - 第三方服务不可用

### 错误响应格式

所有 API 错误响应遵循统一格式：

```typescript
interface ErrorResponse {
  error: {
    code: string;           // 错误代码（如 INVALID_INPUT, PERMISSION_DENIED）
    message: string;        // 用户友好的错误消息
    details?: any;          // 详细错误信息（如验证错误的字段列表）
    requestId: string;      // 请求 ID，用于追踪和调试
    timestamp: string;      // 错误发生时间
  };
}
```

### 错误处理策略

#### 1. 数据库错误处理

```typescript
try {
  await repository.save(entity);
} catch (error) {
  if (error.code === '23505') { // PostgreSQL 唯一约束违反
    throw new ConflictError('Resource already exists');
  } else if (error.code === '23503') { // 外键约束违反
    throw new ValidationError('Referenced resource does not exist');
  } else {
    logger.error('Database error', { error, context });
    throw new InternalServerError('Failed to save data');
  }
}
```

#### 2. 权限检查错误

```typescript
async function checkPermission(userId: string, permission: Permission, resourceId?: string) {
  const hasPermission = await permissionService.hasPermission(userId, permission, resourceId);
  if (!hasPermission) {
    throw new ForbiddenError(`User does not have permission: ${permission}`);
  }
}
```

#### 3. 配额检查错误

```typescript
async function checkQuota(orgId: string, resource: QuotaResource) {
  const status = await subscriptionService.checkQuota(orgId, resource);
  if (status.exceeded) {
    throw new QuotaExceededError(
      `${resource} quota exceeded. Current: ${status.current}, Limit: ${status.limit}`,
      { upgradeUrl: '/subscription/upgrade' }
    );
  }
}
```

#### 4. 外部服务错误处理

```typescript
async function callExternalService(url: string, data: any) {
  try {
    const response = await axios.post(url, data, { timeout: 5000 });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new ServiceTimeoutError('External service timeout');
    } else if (error.response?.status >= 500) {
      throw new ExternalServiceError('External service unavailable');
    } else {
      throw new ExternalServiceError('External service error', error.response?.data);
    }
  }
}
```

#### 5. 事务回滚

对于涉及多个数据库操作的业务逻辑，使用事务确保原子性：

```typescript
async function createProjectWithMembers(projectData: any, memberIds: string[]) {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  
  try {
    const project = await queryRunner.manager.save(Project, projectData);
    
    for (const memberId of memberIds) {
      await queryRunner.manager.save(ProjectMember, {
        projectId: project.id,
        userId: memberId,
        accessLevel: 'EDITOR'
      });
    }
    
    await queryRunner.commitTransaction();
    return project;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### 错误日志记录

所有错误应该被记录到日志系统，包含足够的上下文信息用于调试：

```typescript
logger.error('Operation failed', {
  error: error.message,
  stack: error.stack,
  userId: context.userId,
  organizationId: context.organizationId,
  operation: 'createProject',
  requestId: context.requestId,
  timestamp: new Date().toISOString()
});
```

对于安全相关错误，还应该记录到审计日志：

```typescript
await auditService.logAction({
  organizationId: context.organizationId,
  userId: context.userId,
  action: 'PERMISSION_DENIED',
  resourceType: 'PROJECT',
  resourceId: projectId,
  result: 'FAILURE',
  details: { permission: 'PROJECT_DELETE' }
});
```


## 测试策略

### 双重测试方法

系统采用单元测试和基于属性的测试（Property-Based Testing, PBT）相结合的策略，两者互补以实现全面覆盖。

**单元测试**：
- 验证特定示例和边缘情况
- 测试错误条件和异常处理
- 测试组件间的集成点
- 快速执行，提供即时反馈

**基于属性的测试**：
- 验证跨所有输入的通用属性
- 通过随机化实现全面的输入覆盖
- 发现意外的边缘情况
- 提供更强的正确性保证

### 基于属性的测试配置

**测试库选择**：
- **JavaScript/TypeScript**：使用 `fast-check` 库
- **配置**：每个属性测试运行最少 100 次迭代
- **标记格式**：每个测试必须引用设计文档中的属性

```typescript
import fc from 'fast-check';

// Feature: enterprise-saas-upgrade, Property 1: 组织创建者自动成为管理员
describe('Organization Creation', () => {
  it('should automatically assign creator as admin', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 255 }),
          slug: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        fc.uuid(),
        async (orgData, userId) => {
          const org = await organizationService.createOrganization(orgData, userId);
          const member = await memberRepository.findOne({
            where: { organizationId: org.id, userId }
          });
          
          expect(member).toBeDefined();
          expect(member.role).toBe('ADMIN');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 测试覆盖范围

#### 1. 组织和权限管理测试

**单元测试**：
- 创建组织时的输入验证
- 部门树形结构的边界情况（空树、单节点、深层嵌套）
- 角色分配的特定场景
- 邀请令牌生成和验证

**属性测试**：
- 属性 1：组织创建者自动成为管理员
- 属性 2：部门树形结构一致性
- 属性 3：成员转移保持唯一性
- 属性 4：角色权限边界
- 属性 5：项目级权限覆盖
- 属性 6：未授权访问被拒绝
- 属性 7：权限变更被审计

#### 2. 协作和变更管理测试

**单元测试**：
- 项目共享的特定场景
- 评论创建和回复
- 变更请求的状态转换
- 通知发送的边缘情况

**属性测试**：
- 属性 11：项目共享建立访问关系
- 属性 12：评论包含完整元数据
- 属性 13：评论回复形成正确的线程结构
- 属性 14：提及触发通知
- 属性 15：审批流程强制变更请求
- 属性 16：批准变更应用修改
- 属性 17：拒绝变更保持原状

#### 3. 版本控制和审计测试

**单元测试**：
- 版本创建的特定场景
- 版本比较的边缘情况
- 审计日志格式验证

**属性测试**：
- 属性 19：版本创建保存完整快照
- 属性 20：版本比较识别差异
- 属性 21：版本回滚往返一致性（关键）
- 属性 22：变更日志记录所有修改
- 属性 23：备份包含完整组织数据（关键往返属性）
- 属性 24：审计日志不可修改
- 属性 25：安全事件被审计

#### 4. 分析和知识管理测试

**单元测试**：
- 复杂度计算的特定示例
- 技术债务检测规则
- 搜索功能的边缘情况

**属性测试**：
- 属性 26：复杂度评分单调性
- 属性 27：循环依赖被识别
- 属性 28：技术债务检测一致性
- 属性 29：依赖图完整性
- 属性 30：影响分析传递性
- 属性 31：搜索结果权限过滤

#### 5. 集成和安全测试

**单元测试**：
- API 认证的特定场景
- Webhook 配置验证
- SSO 令牌解析

**属性测试**：
- 属性 33：API 速率限制强制执行
- 属性 34：Webhook 重试机制
- 属性 35：数据导入导出往返一致性（关键）
- 属性 36：SSO 令牌验证
- 属性 37：LDAP 同步幂等性
- 属性 38：数据隔离完整性（最关键的安全属性）

#### 6. 订阅和计费测试

**单元测试**：
- 订阅升级降级的特定场景
- 发票生成
- 支付处理（使用 Stripe 测试模式）

**属性测试**：
- 属性 39：配额限制强制执行
- 属性 40：订阅降级时的配额调整

### 集成测试

除了单元测试和属性测试，还需要端到端集成测试：

1. **完整用户流程测试**：
   - 组织创建 → 成员邀请 → 项目创建 → 协作 → 版本管理
   - SSO 登录 → 权限验证 → 资源访问
   - 订阅升级 → 配额增加 → 功能解锁

2. **第三方集成测试**：
   - JIRA 同步流程
   - Confluence 发布流程
   - GitLab 关联流程
   - Webhook 触发和接收

3. **性能测试**：
   - 大规模数据加载（1000+ 项目）
   - 并发用户操作（100+ 同时在线）
   - 复杂度分析性能（大型项目）
   - API 响应时间

4. **安全测试**：
   - 数据隔离验证（尝试跨租户访问）
   - SQL 注入防护
   - XSS 防护
   - CSRF 防护
   - 权限绕过尝试

### 测试环境

1. **本地开发环境**：
   - Docker Compose 启动完整技术栈
   - 测试数据库（PostgreSQL）
   - 测试 Redis
   - 模拟的外部服务（SMTP、Stripe、SSO）

2. **CI/CD 环境**：
   - 自动运行所有单元测试和属性测试
   - 代码覆盖率要求：>80%
   - 性能基准测试
   - 安全扫描

3. **预发布环境**：
   - 完整的生产环境镜像
   - 真实的第三方服务集成
   - 负载测试
   - 用户验收测试

### 测试数据生成

使用 `fast-check` 的生成器创建测试数据：

```typescript
// 组织数据生成器
const organizationArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 255 }),
  slug: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), 
    { minLength: 3, maxLength: 50 }),
  settings: fc.object()
});

// 部门树生成器
const departmentTreeArb = fc.letrec(tie => ({
  department: fc.record({
    name: fc.string({ minLength: 1, maxLength: 255 }),
    children: fc.array(tie('department'), { maxLength: 5 })
  })
})).department;

// 项目数据生成器
const projectArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 255 }),
  description: fc.option(fc.string({ maxLength: 1000 })),
  modules: fc.array(moduleArb, { maxLength: 50 }),
  entities: fc.array(entityArb, { maxLength: 100 })
});
```

### 持续集成

测试应该在以下时机自动运行：

1. **每次提交**：运行快速单元测试（<5分钟）
2. **Pull Request**：运行完整测试套件（单元测试 + 属性测试）
3. **每日构建**：运行完整测试 + 集成测试 + 性能测试
4. **发布前**：运行所有测试 + 安全扫描 + 负载测试

