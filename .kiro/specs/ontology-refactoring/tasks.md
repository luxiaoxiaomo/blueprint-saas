# 本体论架构重构 - 任务列表

## 阶段 1: 核心架构实现 ✅

- [x] 1.1 创建核心类型定义（types.ts）
- [x] 1.2 实现 OntologyService 服务层
- [x] 1.3 实现 Action 基类
- [x] 1.4 实现 BaseRepository 基类
- [x] 1.5 创建 CreateProjectAction 示例
- [x] 1.6 创建 ProjectRepository
- [x] 1.7 编写单元测试
- [x] 1.8 运行测试验证

## 阶段 2: 扩展 Actions ✅

- [x] 2.1 实现 UpdateProjectAction
  - 输入验证
  - 权限检查
  - 更新逻辑
  - 单元测试

- [x] 2.2 实现 DeleteProjectAction
  - 权限检查
  - 级联删除逻辑
  - 单元测试

- [x] 2.3 实现 ArchiveProjectAction
  - 归档/取消归档逻辑
  - 单元测试

- [x] 2.4 实现 CreateModuleAction
  - 输入验证
  - 关联项目检查
  - 单元测试

- [x] 2.5 实现 UpdateModuleAction
  - 输入验证
  - 权限检查
  - 单元测试

- [x] 2.6 实现 DeleteModuleAction
  - 权限检查
  - 级联删除逻辑
  - 单元测试

## 阶段 3: 扩展 Repositories ✅

- [x] 3.1 实现 ModuleRepository
  - 基础 CRUD 操作
  - findByProjectId 方法
  - findByProjectIdAndName 方法
  - updateSortOrder 方法
  - batchUpdateSortOrder 方法
  - 单元测试

- [x] 3.2 实现 EntityRepository
  - 基础 CRUD 操作
  - findByProjectId 方法
  - findByModuleId 方法
  - findUnassigned 方法
  - assignToModule 方法
  - unassignFromModule 方法
  - deleteByModuleId 方法
  - 单元测试

- [x] 3.3 实现 TaskRepository
  - 基础 CRUD 操作
  - findByProjectId 方法
  - findByUserId 方法
  - findByStatus 方法
  - findByTaskType 方法
  - updateStatus 方法
  - addMessage 方法
  - updateResult 方法
  - getStats 方法
  - 单元测试

## 阶段 4: 审计日志系统 ✅

- [x] 4.1 创建 AuditLog 类型定义
- [x] 4.2 创建 audit_logs 数据库表
- [x] 4.3 实现 AuditService
  - log 方法
  - query 方法
  - 单元测试

- [x] 4.4 集成 AuditService 到 Actions
  - 更新 Action 基类
  - 测试审计日志记录

- [x] 4.5 创建审计日志 API 路由
- [x] 4.6 创建前端审计日志查看器

## 阶段 5: 权限系统 ✅

- [x] 5.1 创建 Permission 枚举
  - 项目权限（CREATE, READ, UPDATE, DELETE, ARCHIVE）
  - 模块权限（CREATE, READ, UPDATE, DELETE）
  - 实体权限（CREATE, READ, UPDATE, DELETE）
  - 任务权限（CREATE, READ, UPDATE, DELETE）
  - 审计日志权限（READ）
  - 系统管理权限（ADMIN）

- [x] 5.2 创建 Role 枚举
  - OWNER（所有者，完全权限）
  - ADMIN（管理员，大部分权限）
  - MEMBER（成员，基本权限）
  - VIEWER（查看者，只读权限）
  - GUEST（访客，受限权限）

- [x] 5.3 创建 user_permissions 数据库表
  - 用户ID、资源ID、角色、权限列表
  - 授予者、授予时间
  - 唯一约束和索引

- [x] 5.4 实现 PermissionService
  - check 方法（检查权限）
  - checkAny 方法（检查任一权限）
  - getUserPermissions 方法（获取用户权限）
  - grant 方法（授予权限）
  - revoke 方法（撤销权限）
  - setRole 方法（设置角色）
  - getRole 方法（获取角色）
  - revokeAll 方法（撤销所有权限）
  - getRolePermissions 方法（获取角色权限）
  - 单元测试

- [x] 5.5 集成 PermissionService 到 Actions
  - 更新 Action 基类
  - 自动权限检查
  - 测试权限检查

## 阶段 6: 路由集成 ✅

- [x] 6.1 创建新的本体论路由
  - 更新 projects.ts 使用本体论架构
  - 创建 modules.ts 路由
  - 集成 Actions 和 OntologyService

- [x] 6.2 更新现有路由使用新架构
  - 保持 API 接口不变
  - 内部使用 Actions 和 OntologyService
  - 集成权限检查和审计日志

- [x] 6.3 集成测试
  - 创建路由集成测试
  - 测试所有 API 端点
  - 测试权限检查
  - 所有测试通过（4 个测试，100% 成功率）

## 阶段 7: 链接系统 ✅

- [x] 7.1 实现 getLinkedObjects 方法
  - Project→Module（已实现）
  - Project→Entity（已实现）
  - Project→Task（已实现）
  - Module→Entity（已实现）
  - Module→Module（依赖关系，新增）
  - 单元测试

- [x] 7.2 实现 createLink 方法
  - 创建链接
  - 验证对象存在性
  - 支持 metadata
  - 单元测试

- [x] 7.3 实现 deleteLink 方法
  - 删除链接
  - 批量删除
  - 单元测试

- [x] 7.4 创建 LinkRepository
  - findById, findBySourceId, findByTargetId
  - create, delete, deleteBySourceId, deleteByTargetId
  - batchCreate, getStats
  - 单元测试

- [x] 7.5 创建 ontology_links 数据库表
  - 源对象ID、目标对象ID、链接类型
  - metadata 字段
  - 唯一约束和索引

## 阶段 8: 企业版功能（可选） ✅

- [x] 8.1 创建 Organization 对象类型
  - 组织名称、标识符、套餐
  - 设置（SSO、成员限制、项目限制）
  - 所有者ID

- [x] 8.2 创建 Member 对象类型
  - 组织ID、用户ID、角色
  - 状态（active, invited, suspended）
  - 邀请信息

- [x] 8.3 实现 OrganizationRepository
  - findByOwnerId, findByIdentifier, findByPlan
  - updatePlan, updateSettings
  - getStats
  - 单元测试

- [x] 8.4 实现 MemberRepository
  - findByOrganizationId, findByUserId
  - findByRole, findByStatus
  - updateRole, updateStatus, acceptInvitation
  - getStats
  - 单元测试

- [x] 8.5 实现 CreateOrganizationAction
  - 创建组织
  - 自动添加所有者为成员
  - 单元测试

- [x] 8.6 实现 InviteMemberAction
  - 邀请成员
  - 创建链接
  - 单元测试

- [x] 8.7 创建数据库表
  - organizations 表
  - members 表
  - 索引优化

- [x] 8.8 更新 OntologyService
  - 支持 Organization 和 Member 类型
  - 支持 Organization→Project 和 Organization→Member 链接

## 阶段 9: 性能优化

- [ ] 9.1 实现对象缓存（Redis）
  - 缓存配置
  - 缓存失效策略
  - 测试

- [ ] 9.2 实现批量查询优化
  - batchQuery 方法
  - 测试

- [ ] 9.3 数据库索引优化
  - 分析慢查询
  - 添加索引
  - 测试性能提升

## 阶段 10: 文档和部署

- [ ] 10.1 编写 API 文档
  - 所有 Actions 的文档
  - 所有 API 端点的文档
  - 示例代码

- [ ] 10.2 编写开发指南
  - 如何创建新 Action
  - 如何创建新 Repository
  - 最佳实践

- [ ] 10.3 更新部署文档
  - 数据库迁移脚本
  - 环境变量配置
  - 部署步骤

- [ ] 10.4 生产环境部署
  - 运行数据库迁移
  - 部署新代码
  - 监控和验证

## 进度总结

- **已完成**: 44 个任务（阶段 1-8）
- **进行中**: 0 个任务
- **待完成**: 16 个任务
- **总进度**: 73.3%

## 下一步

建议按顺序执行：
1. ~~阶段 2: 扩展 Actions（实现更多业务操作）~~ ✅ 已完成
2. ~~阶段 3: 扩展 Repositories（完善数据访问层）~~ ✅ 已完成
3. ~~阶段 4: 审计日志系统（实现操作追踪）~~ ✅ 已完成
4. ~~阶段 5: 权限系统（实现访问控制）~~ ✅ 已完成
5. ~~阶段 6: 路由集成（集成到现有系统）~~ ✅ 已完成
6. ~~阶段 7: 链接系统（实现对象关联）~~ ✅ 已完成
7. ~~阶段 8: 企业版功能（可选）~~ ✅ 已完成
8. 阶段 9: 性能优化
9. 阶段 10: 文档和部署
