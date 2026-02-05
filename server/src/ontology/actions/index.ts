/**
 * Actions 索引文件
 * 导出所有 Actions
 */

// Project Actions
export { CreateProjectAction, CreateProjectInput } from './CreateProjectAction.js';
export { UpdateProjectAction, UpdateProjectInput } from './UpdateProjectAction.js';
export { DeleteProjectAction, DeleteProjectInput, DeleteProjectOutput } from './DeleteProjectAction.js';
export { ArchiveProjectAction, ArchiveProjectInput } from './ArchiveProjectAction.js';

// Module Actions
export { CreateModuleAction, CreateModuleInput } from './CreateModuleAction.js';
export { UpdateModuleAction, UpdateModuleInput } from './UpdateModuleAction.js';
export { DeleteModuleAction, DeleteModuleInput, DeleteModuleOutput } from './DeleteModuleAction.js';

// Organization Actions
export { CreateOrganizationAction, CreateOrganizationInput } from './CreateOrganizationAction.js';
export { UpdateOrganizationAction, UpdateOrganizationInput } from './UpdateOrganizationAction.js';

// Member Actions
export { InviteMemberAction, InviteMemberInput } from './InviteMemberAction.js';
export { UpdateMemberAction, UpdateMemberInput } from './UpdateMemberAction.js';
export { RemoveMemberAction, RemoveMemberInput, RemoveMemberOutput } from './RemoveMemberAction.js';

// Member Management Actions (Enterprise SaaS Upgrade)
export { AssignMemberToDepartmentAction, AssignMemberToDepartmentInput } from './AssignMemberToDepartmentAction.js';
export { TransferMemberAction, TransferMemberInput } from './TransferMemberAction.js';
export { UpdateMemberRoleAction, UpdateMemberRoleInput } from './UpdateMemberRoleAction.js';
export { RemoveMemberFromOrganizationAction, RemoveMemberFromOrganizationInput } from './RemoveMemberFromOrganizationAction.js';
