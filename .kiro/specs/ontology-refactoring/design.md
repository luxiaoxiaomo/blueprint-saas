# 本体论架构重构 - 设计文档

## 1. 设计概述

本设计采用 Palantir 本体论（Ontology）模式，将系统重构为一个基于对象和操作的架构。核心理念是将所有业务实体抽象为"对象"（Objects），将所有写操作封装为"操作"（Actions），实现统一的数据访问、权限控制和审计日志。

### 1.1 核心设计原则

1. **对象抽象**：所有业务实体都是本体对象（OntologyObject）
2. **操作封装**：所有写操作通过 Actions 执行，自动处理权限和审计
3. **统一接口**：通过 OntologyService 提供统一的对象访问接口
4. **向后兼容**：渐进式重构，保持现有 API 可用
5. **可追溯性**：所有操作自动记录审计日志

## 2. 架构设计

### 2.1 四层架构

```
┌─────────────────────────────────────────┐
│         应用层 (Application)             │
│  - Express Routes                       │
│  - REST API Endpoints                   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       业务逻辑层 (Business Logic)        │
│  - Actions (CreateProject, etc.)        │
│  - 权限检查                              │
│  - 业务规则验证                          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         本体层 (Ontology)                │
│  - OntologyService                      │
│  - 统一对象访问接口                      │
│  - 链接遍历                              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         数据层 (Data)                    │
│  - Repositories                         │
│  - PostgreSQL                           │
└─────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 OntologyObject（本体对象）

所有业务实体的基类：

```typescript
interface OntologyObject {
  id: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}
```

具体对象类型：
- **ProjectObject**: 项目
- **ModuleObject**: 模块
- **EntityObject**: 实体
- **TaskObject**: 任务
- **OrganizationObject**: 组织（企业版）
- **MemberObject**: 成员（企业版）

#### 2.2.2 OntologyService（本体服务）

提供统一的对象访问接口：

```typescript
interface IOntologyService {
  // 对象查询
  getObject<T>(type: string, id: string): Promise<T | null>;
  queryObjects<T>(type: string, options?: QueryOptions): Promise<T[]>;
  
  // 对象操作
  createObject<T>(type: string, data: Partial<T>): Promise<T>;
  updateObject<T>(type: string, id: string, data: Partial<T>): Promise<T>;
  deleteObject(type: string, id: string): Promise<void>;
  
  // 链接遍历
  getLinkedObjects<T>(objectId: string, linkType: LinkType): Promise<T[]>;
  createLink(sourceId: string, targetId: string, linkType: LinkType): Promise<OntologyLink>;
  deleteLink(linkId: string): Promise<void>;
}
```

#### 2.2.3 Action（操作）

所有写操作的基类：

```typescript
abstract class Action<TInput, TOutput> {
  abstract name: string;
  abstract description: string;
  abstract permissions: Permission[];
  
  // 完整的执行流程
  async run(input: TInput, context: ActionContext): Promise<ActionResult<TOutput>> {
    await this.validate(input, context);  // 1. 验证
    const output = await this.execute(input, context);  // 2. 执行
    await this.audit(input, output, context);  // 3. 审计
    return { success: true, data: output };
  }
  
  abstract execute(input: TInput, context: ActionContext): Promise<TOutput>;
}
```

具体 Actions：
- **CreateProjectAction**: 创建项目
- **UpdateProjectAction**: 更新项目
- **DeleteProjectAction**: 删除项目
- **CreateModuleAction**: 创建模块
- **UpdateModuleAction**: 更新模块
- 等等...

#### 2.2.4 Repository（数据访问层）

封装数据库操作：

```typescript
abstract class BaseRepository<T> {
  async findById(id: string): Promise<T | null>;
  async find(options?: QueryOptions): Promise<T[]>;
  async create(data: Partial<T>): Promise<T>;
  async update(id: string, data: Partial<T>): Promise<T>;
  async delete(id: string): Promise<void>;
}
```

具体 Repositories：
- **ProjectRepository**: 项目数据访问
- **ModuleRepository**: 模块数据访问
- **EntityRepository**: 实体数据访问
- **TaskRepository**: 任务数据访问

## 3. 数据流示例

### 3.1 创建项目流程

```
用户请求
  ↓
POST /api/projects/ontology
  ↓
CreateProjectAction.run({
  name: "新项目",
  userId: "user-123"
})
  ↓
1. validate() - 验证输入和权限
  ↓
2. execute() - 执行创建
  ↓
OntologyService.createObject('Project', data)
  ↓
ProjectRepository.create(data)
  ↓
PostgreSQL INSERT
  ↓
3. audit() - 记录审计日志
  ↓
返回结果
```

### 3.2 查询项目流程

```
用户请求
  ↓
GET /api/projects/:id
  ↓
OntologyService.getObject('Project', id)
  ↓
ProjectRepository.findById(id)
  ↓
PostgreSQL SELECT
  ↓
返回 ProjectObject
```

## 4. 权限系统设计

### 4.1 权限枚举

```typescript
enum Permission {
  // 项目权限
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  
  // 模块权限
  MODULE_CREATE = 'module:create',
  MODULE_READ = 'module:read',
  MODULE_UPDATE = 'module:update',
  MODULE_DELETE = 'module:delete',
  
  // 组织权限（企业版）
  ORG_ADMIN = 'org:admin',
  ORG_MEMBER_MANAGE = 'org:member:manage',
}
```

### 4.2 权限检查流程

每个 Action 在执行前自动检查权限：

```typescript
async validate(input: TInput, context: ActionContext): Promise<void> {
  // 1. 检查用户是否有所需权限
  await this.checkPermissions(context);
  
  // 2. 验证输入数据
  // ...
}
```

## 5. 审计日志设计

### 5.1 审计日志结构

```typescript
interface AuditLog {
  id: string;
  action: string;           // Action 名称
  userId: string;           // 操作用户
  timestamp: Date;          // 操作时间
  input: any;               // 输入数据
  output?: any;             // 输出数据
  error?: string;           // 错误信息（如果失败）
  ipAddress?: string;       // IP 地址
  userAgent?: string;       // 用户代理
}
```

### 5.2 自动审计

所有 Actions 自动记录审计日志：

```typescript
async audit(input: TInput, output: TOutput, context: ActionContext): Promise<void> {
  await this.auditService.log({
    action: this.name,
    userId: context.userId,
    timestamp: context.timestamp,
    input,
    output,
    ipAddress: context.ipAddress,
  });
}
```

## 6. 链接系统设计

### 6.1 链接类型

```typescript
type LinkType =
  | 'Project→Module'
  | 'Project→Entity'
  | 'Project→Task'
  | 'Module→Entity'
  | 'Organization→Project'
  | 'Organization→Member';
```

### 6.2 链接遍历

通过 OntologyService 遍历对象关系：

```typescript
// 获取项目的所有模块
const modules = await ontologyService.getLinkedObjects<ModuleObject>(
  projectId,
  'Project→Module'
);

// 获取模块的所有实体
const entities = await ontologyService.getLinkedObjects<EntityObject>(
  moduleId,
  'Module→Entity'
);
```

## 7. 企业版扩展

### 7.1 组织对象

```typescript
interface OrganizationObject extends OntologyObject {
  type: 'Organization';
  name: string;
  plan: 'free' | 'team' | 'enterprise';
  settings: {
    ssoEnabled: boolean;
    ldapEnabled: boolean;
    maxMembers: number;
  };
}
```

### 7.2 成员对象

```typescript
interface MemberObject extends OntologyObject {
  type: 'Member';
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Permission[];
}
```

### 7.3 企业版 Actions

- **CreateOrganizationAction**: 创建组织
- **InviteMemberAction**: 邀请成员
- **UpdateMemberRoleAction**: 更新成员角色
- **CreateChangeRequestAction**: 创建变更请求
- **ApproveChangeRequestAction**: 审批变更请求

## 8. 迁移策略

### 8.1 渐进式迁移

1. **阶段 1**：创建新架构（已完成）
   - 实现 OntologyService
   - 实现 Action 基类
   - 实现 Repository 基类
   - 创建示例 CreateProjectAction

2. **阶段 2**：并行运行
   - 新路由使用新架构（/api/projects/ontology）
   - 旧路由保持不变（/api/projects）
   - 逐步迁移功能

3. **阶段 3**：完全迁移
   - 所有路由使用新架构
   - 移除旧代码
   - 更新前端调用

### 8.2 向后兼容

保持现有 API 接口不变：

```typescript
// 旧路由（保持兼容）
router.post('/projects', async (req, res) => {
  // 内部使用新架构
  const action = new CreateProjectAction(ontologyService);
  const result = await action.run(req.body, context);
  res.json(result);
});
```

## 9. 测试策略

### 9.1 单元测试

- 测试每个 Action 的验证逻辑
- 测试 OntologyService 的对象操作
- 测试 Repository 的数据访问

### 9.2 集成测试

- 测试完整的 Action 执行流程
- 测试权限检查
- 测试审计日志记录

### 9.3 端到端测试

- 测试 API 端点
- 测试前端集成
- 测试企业版功能

## 10. 性能优化

### 10.1 批量操作

```typescript
// 批量查询
const results = await ontologyService.batchQuery([
  { type: 'Project', options: { filters: [...] } },
  { type: 'Module', options: { filters: [...] } },
]);
```

### 10.2 缓存策略

- 对象缓存（Redis）
- 权限缓存
- 查询结果缓存

### 10.3 数据库优化

- 索引优化
- 查询优化
- 连接池管理

## 11. 安全考虑

### 11.1 输入验证

所有 Actions 必须验证输入：

```typescript
async validate(input: CreateProjectInput, context: ActionContext): Promise<void> {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('项目名称不能为空');
  }
  
  if (input.name.length > 255) {
    throw new Error('项目名称不能超过255个字符');
  }
}
```

### 11.2 权限检查

所有写操作必须检查权限：

```typescript
protected async checkPermissions(context: ActionContext): Promise<void> {
  const hasPermission = await this.permissionService.check(
    context.userId,
    this.permissions
  );
  
  if (!hasPermission) {
    throw new Error('权限不足');
  }
}
```

### 11.3 SQL 注入防护

使用参数化查询：

```typescript
const query = `
  SELECT * FROM projects
  WHERE user_id = $1 AND name = $2
`;
const result = await this.pool.query(query, [userId, name]);
```

## 12. 监控和日志

### 12.1 操作监控

- 记录每个 Action 的执行时间
- 记录失败率
- 记录并发量

### 12.2 性能监控

- 数据库查询时间
- API 响应时间
- 缓存命中率

### 12.3 错误日志

- 记录所有错误
- 记录堆栈跟踪
- 记录上下文信息

## 13. 文档和培训

### 13.1 开发文档

- API 文档
- 架构文档
- 最佳实践

### 13.2 示例代码

- 创建新 Action 的示例
- 创建新 Repository 的示例
- 集成测试示例

## 14. 总结

本体论架构提供了一个统一、可扩展、安全的系统架构。通过将所有业务实体抽象为对象，将所有写操作封装为 Actions，我们实现了：

1. **统一的数据访问接口**
2. **自动的权限检查**
3. **完整的审计日志**
4. **向后兼容的迁移路径**
5. **企业级功能的扩展能力**

这个架构为系统的长期发展奠定了坚实的基础。
