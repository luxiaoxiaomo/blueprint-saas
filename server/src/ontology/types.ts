/**
 * 本体论核心类型定义
 * 基于 Palantir 本体模式
 */

// ============================================
// 核心接口
// ============================================

/**
 * 对象类型接口 - 所有本体对象的基类
 */
export interface OntologyObject {
  id: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 链接类型接口 - 定义对象之间的关系
 */
export interface OntologyLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkType: string;
  metadata?: any;
  createdAt: Date;
}

/**
 * 查询过滤器
 */
export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'like';
  value: any;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

// ============================================
// 核心对象类型定义
// ============================================

/**
 * Project 对象类型
 */
export interface ProjectObject extends OntologyObject {
  type: 'Project';
  userId: string;
  organizationId?: string; // 项目所属组织
  name: string;
  description?: string;
  model: any; // SystemModel JSON
  isArchived: boolean;
}

/**
 * Module 对象类型
 */
export interface ModuleObject extends OntologyObject {
  type: 'Module';
  projectId: string;
  name: string;
  description?: string;
  functionalPoints: any[];
  children?: ModuleObject[];
  sortOrder?: number;
}

/**
 * Entity 对象类型
 */
export interface EntityObject extends OntologyObject {
  type: 'Entity';
  projectId: string;
  moduleId?: string;
  name: string;
  description?: string;
  attributes: any[];
}

/**
 * Task 对象类型
 */
export interface TaskObject extends OntologyObject {
  type: 'Task';
  projectId: string;
  userId: string;
  name: string;
  status: string;
  taskType?: string;
  messages: any[];
  files: any[];
  result?: any;
}

/**
 * Organization 对象类型（企业版）
 */
export interface OrganizationObject extends OntologyObject {
  type: 'Organization';
  name: string;
  identifier: string;
  description?: string;
  plan: 'free' | 'professional' | 'enterprise';
  settings: {
    ssoEnabled?: boolean;
    maxMembers?: number;
    maxProjects?: number;
  };
  ownerId: string;
}

/**
 * Member 对象类型（企业版）
 */
export interface MemberObject extends OntologyObject {
  type: 'Member';
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'architect' | 'developer' | 'viewer';
  departmentId?: string;
  status: 'active' | 'invited' | 'suspended';
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
}

/**
 * Department 对象类型（企业版 - 树形结构）
 */
export interface DepartmentObject extends OntologyObject {
  type: 'Department';
  organizationId: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string; // 路径，例如: "/1/2/3"
  level: number; // 层级，根部门为 0
  sortOrder: number;
}

/**
 * ProjectMember 对象类型（企业版 - 项目成员）
 */
export interface ProjectMemberObject extends OntologyObject {
  type: 'ProjectMember';
  projectId: string;
  organizationId: string;
  memberId: string; // 成员 ID（来自 members 表）
  role: 'owner' | 'editor' | 'viewer';
  addedAt: Date;
  addedBy: string; // 添加者的 memberId
  lastAccessedAt?: Date;
  isActive: boolean;
}

/**
 * AuditLog 对象类型
 */
export interface AuditLogObject extends OntologyObject {
  type: 'AuditLog';
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
  ipAddress?: string;
}

// ============================================
// 链接类型定义
// ============================================

export type LinkType =
  | 'Project→Module'
  | 'Project→Entity'
  | 'Project→Task'
  | 'Project→ProjectMember'
  | 'ProjectMember→Member'
  | 'Module→Entity'
  | 'Module→Module'
  | 'Organization→Project'
  | 'Organization→Member'
  | 'Organization→Department'
  | 'Department→Department'
  | 'Department→Member';

// ============================================
// Action 相关类型
// ============================================

/**
 * Action 上下文 - 包含执行 Action 所需的上下文信息
 */
export interface ActionContext {
  userId: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Action 结果
 */
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 权限枚举
 */
export enum Permission {
  // 项目权限
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_EDIT = 'project:edit',
  PROJECT_DELETE = 'project:delete',
  PROJECT_ARCHIVE = 'project:archive',
  PROJECT_SHARE = 'project:share',
  PROJECT_MANAGE_MEMBERS = 'project:manage_members',
  PROJECT_CONFIGURE_APPROVAL = 'project:configure_approval',
  
  // 模块权限
  MODULE_CREATE = 'module:create',
  MODULE_READ = 'module:read',
  MODULE_UPDATE = 'module:update',
  MODULE_EDIT = 'module:edit',
  MODULE_DELETE = 'module:delete',
  
  // 实体权限
  ENTITY_CREATE = 'entity:create',
  ENTITY_READ = 'entity:read',
  ENTITY_UPDATE = 'entity:update',
  ENTITY_EDIT = 'entity:edit',
  ENTITY_DELETE = 'entity:delete',
  
  // 任务权限
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_EDIT = 'task:edit',
  TASK_DELETE = 'task:delete',
  
  // 组织权限
  ORGANIZATION_CREATE = 'organization:create',
  ORGANIZATION_READ = 'organization:read',
  ORGANIZATION_UPDATE = 'organization:update',
  ORGANIZATION_DELETE = 'organization:delete',
  
  // 成员权限
  MEMBER_CREATE = 'member:create',
  MEMBER_READ = 'member:read',
  MEMBER_UPDATE = 'member:update',
  MEMBER_DELETE = 'member:delete',
  MEMBER_INVITE = 'member:invite',
  
  // 部门权限
  DEPARTMENT_CREATE = 'department:create',
  DEPARTMENT_READ = 'department:read',
  DEPARTMENT_UPDATE = 'department:update',
  DEPARTMENT_DELETE = 'department:delete',
  
  // 审计日志权限
  AUDIT_READ = 'audit:read',
  
  // 系统管理权限
  SYSTEM_ADMIN = 'system:admin',
}

/**
 * 角色枚举
 */
export enum Role {
  OWNER = 'owner',           // 所有者（完全权限）
  ADMIN = 'admin',           // 管理员（大部分权限）
  MEMBER = 'member',         // 成员（基本权限）
  VIEWER = 'viewer',         // 查看者（只读权限）
  GUEST = 'guest',           // 访客（受限权限）
}

/**
 * 用户权限对象
 */
export interface UserPermissions {
  userId: string;
  role: Role;
  permissions: Permission[];
  grantedAt: Date;
  grantedBy?: string;
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: Permission[];
}

// ============================================
// 类型守卫
// ============================================

export function isProjectObject(obj: OntologyObject): obj is ProjectObject {
  return obj.type === 'Project';
}

export function isModuleObject(obj: OntologyObject): obj is ModuleObject {
  return obj.type === 'Module';
}

export function isEntityObject(obj: OntologyObject): obj is EntityObject {
  return obj.type === 'Entity';
}

export function isTaskObject(obj: OntologyObject): obj is TaskObject {
  return obj.type === 'Task';
}

export function isProjectMemberObject(obj: OntologyObject): obj is ProjectMemberObject {
  return obj.type === 'ProjectMember';
}

export function isDepartmentObject(obj: OntologyObject): obj is DepartmentObject {
  return obj.type === 'Department';
}

export function isOrganizationObject(obj: OntologyObject): obj is OrganizationObject {
  return obj.type === 'Organization';
}

export function isMemberObject(obj: OntologyObject): obj is MemberObject {
  return obj.type === 'Member';
}

export function isAuditLogObject(obj: OntologyObject): obj is AuditLogObject {
  return obj.type === 'AuditLog';
}
