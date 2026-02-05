# Actions 快速参考

## 可用的 Actions

### Project Actions

#### 1. CreateProjectAction

**用途**: 创建新项目

**输入**:
```typescript
{
  name: string;           // 项目名称（必填，最多255字符）
  description?: string;   // 项目描述（可选）
  userId: string;         // 用户ID（必填）
}
```

**输出**: `ProjectObject`

**示例**:
```typescript
const action = new CreateProjectAction(ontologyService);
const result = await action.run(
  {
    name: '我的项目',
    description: '项目描述',
    userId: 'user-123'
  },
  context
);
```

#### 2. UpdateProjectAction

**用途**: 更新项目信息

**输入**:
```typescript
{
  id: string;             // 项目ID（必填）
  name?: string;          // 新的项目名称（可选）
  description?: string;   // 新的项目描述（可选）
  model?: any;            // 新的模型数据（可选）
}
```

**输出**: `ProjectObject`

**权限**: 只能更新自己的项目

**示例**:
```typescript
const action = new UpdateProjectAction(ontologyService);
const result = await action.run(
  {
    id: 'project-123',
    name: '更新后的名称',
    description: '更新后的描述'
  },
  context
);
```

#### 3. DeleteProjectAction

**用途**: 删除项目

**输入**:
```typescript
{
  id: string;  // 项目ID（必填）
}
```

**输出**:
```typescript
{
  id: string;
  deleted: boolean;
}
```

**权限**: 只能删除自己的项目

**注意**: 会级联删除相关的模块、实体、任务（待完善）

**示例**:
```typescript
const action = new DeleteProjectAction(ontologyService);
const result = await action.run(
  { id: 'project-123' },
  context
);
```

#### 4. ArchiveProjectAction

**用途**: 归档或取消归档项目

**输入**:
```typescript
{
  id: string;         // 项目ID（必填）
  archived: boolean;  // true: 归档, false: 取消归档
}
```

**输出**: `ProjectObject`

**权限**: 只能归档自己的项目

**示例**:
```typescript
const action = new ArchiveProjectAction(ontologyService);

// 归档项目
const result = await action.run(
  { id: 'project-123', archived: true },
  context
);

// 取消归档
const result = await action.run(
  { id: 'project-123', archived: false },
  context
);
```

### Module Actions

#### 5. CreateModuleAction

**用途**: 在项目中创建模块

**输入**:
```typescript
{
  projectId: string;           // 项目ID（必填）
  name: string;                // 模块名称（必填，最多255字符）
  description?: string;        // 模块描述（可选）
  functionalPoints?: any[];    // 功能点列表（可选）
  sortOrder?: number;          // 排序（可选，默认0）
}
```

**输出**: `ModuleObject`

**权限**: 只能在自己的项目中创建模块

**示例**:
```typescript
const action = new CreateModuleAction(ontologyService);
const result = await action.run(
  {
    projectId: 'project-123',
    name: '用户管理模块',
    description: '负责用户相关功能',
    functionalPoints: [
      { name: '用户注册', description: '...' },
      { name: '用户登录', description: '...' }
    ],
    sortOrder: 1
  },
  context
);
```

#### 6. UpdateModuleAction

**用途**: 更新模块信息

**输入**:
```typescript
{
  id: string;                  // 模块ID（必填）
  name?: string;               // 新的模块名称（可选）
  description?: string;        // 新的模块描述（可选）
  functionalPoints?: any[];    // 新的功能点列表（可选）
  sortOrder?: number;          // 新的排序（可选）
}
```

**输出**: `ModuleObject`

**权限**: 只能更新自己项目中的模块

**示例**:
```typescript
const action = new UpdateModuleAction(ontologyService);
const result = await action.run(
  {
    id: 'module-123',
    name: '更新后的模块名',
    description: '更新后的描述',
    sortOrder: 2
  },
  context
);
```

#### 7. DeleteModuleAction

**用途**: 删除模块

**输入**:
```typescript
{
  id: string;  // 模块ID（必填）
}
```

**输出**:
```typescript
{
  id: string;
  deleted: boolean;
}
```

**权限**: 只能删除自己项目中的模块

**注意**: 会级联删除相关的实体（待完善）

**示例**:
```typescript
const action = new DeleteModuleAction(ontologyService);
const result = await action.run(
  { id: 'module-123' },
  context
);
```

## 使用模式

### 1. 基本使用

```typescript
import { CreateProjectAction } from './ontology/actions/index.js';
import { OntologyService } from './ontology/OntologyService.js';

// 创建 OntologyService
const ontologyService = new OntologyService(
  projectRepo,
  moduleRepo,
  entityRepo,
  taskRepo
);

// 创建 Action
const action = new CreateProjectAction(ontologyService);

// 准备上下文
const context = {
  userId: 'user-123',
  userName: '张三',
  timestamp: new Date(),
  ipAddress: '192.168.1.1'
};

// 执行 Action
const result = await action.run(
  { name: '新项目', userId: 'user-123' },
  context
);

// 检查结果
if (result.success) {
  console.log('成功:', result.data);
} else {
  console.error('失败:', result.error);
}
```

### 2. 在 Express 路由中使用

```typescript
import express from 'express';
import { CreateProjectAction } from './ontology/actions/index.js';

const router = express.Router();

router.post('/projects', async (req, res) => {
  try {
    // 创建 Action
    const action = new CreateProjectAction(ontologyService);
    
    // 准备上下文
    const context = {
      userId: req.user.id,
      userName: req.user.name,
      timestamp: new Date(),
      ipAddress: req.ip
    };
    
    // 执行 Action
    const result = await action.run(req.body, context);
    
    // 返回结果
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 3. 错误处理

```typescript
const result = await action.run(input, context);

if (!result.success) {
  // 处理错误
  switch (result.error) {
    case '项目名称不能为空':
      // 处理验证错误
      break;
    case '项目不存在':
      // 处理不存在错误
      break;
    case '无权修改此项目':
      // 处理权限错误
      break;
    default:
      // 处理其他错误
      break;
  }
}
```

## ActionContext 说明

所有 Actions 都需要一个 `ActionContext` 对象：

```typescript
interface ActionContext {
  userId: string;        // 当前用户ID（必填）
  userName?: string;     // 当前用户名（可选）
  ipAddress?: string;    // 客户端IP地址（可选）
  timestamp: Date;       // 操作时间戳（必填）
}
```

## ActionResult 说明

所有 Actions 返回一个 `ActionResult` 对象：

```typescript
interface ActionResult<T> {
  success: boolean;  // 操作是否成功
  data?: T;          // 成功时的数据
  error?: string;    // 失败时的错误消息
}
```

## 权限说明

每个 Action 都定义了所需的权限：

```typescript
enum Permission {
  PROJECT_CREATE = 'project:create',
  PROJECT_VIEW = 'project:view',
  PROJECT_EDIT = 'project:edit',
  PROJECT_DELETE = 'project:delete',
  MODULE_EDIT = 'module:edit',
  ENTITY_EDIT = 'entity:edit',
}
```

当前权限检查逻辑：
- 项目操作：验证用户是否拥有该项目
- 模块操作：验证用户是否拥有模块所属的项目

## 审计日志

所有 Actions 自动记录审计日志：

```typescript
{
  action: 'CreateProject',
  userId: 'user-123',
  timestamp: '2026-01-17T15:04:36.000Z',
  input: { name: '新项目', userId: 'user-123' },
  output: { id: 'project-1', name: '新项目', ... },
  ipAddress: '192.168.1.1'
}
```

## 常见错误

### 验证错误

- `项目名称不能为空`
- `项目名称不能超过255个字符`
- `用户ID不能为空`
- `模块名称不能为空`

### 权限错误

- `无权修改此项目`
- `无权删除此项目`
- `无权在此项目中创建模块`
- `无权修改此模块`

### 资源错误

- `项目不存在: {id}`
- `模块不存在: {id}`

## 最佳实践

1. **始终检查结果**
   ```typescript
   const result = await action.run(input, context);
   if (!result.success) {
     // 处理错误
   }
   ```

2. **提供完整的上下文**
   ```typescript
   const context = {
     userId: req.user.id,
     userName: req.user.name,
     timestamp: new Date(),
     ipAddress: req.ip
   };
   ```

3. **验证输入数据**
   ```typescript
   // Actions 会自动验证，但在调用前也可以预先验证
   if (!input.name || input.name.trim().length === 0) {
     return res.status(400).json({ error: '项目名称不能为空' });
   }
   ```

4. **处理所有可能的错误**
   ```typescript
   try {
     const result = await action.run(input, context);
     // ...
   } catch (error) {
     console.error('Unexpected error:', error);
     res.status(500).json({ error: 'Internal server error' });
   }
   ```

## 测试示例

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateProjectAction } from '../actions/index.js';

describe('CreateProjectAction', () => {
  let action: CreateProjectAction;
  let context: ActionContext;
  
  beforeEach(() => {
    action = new CreateProjectAction(ontologyService);
    context = {
      userId: 'test-user',
      timestamp: new Date()
    };
  });
  
  it('应该成功创建项目', async () => {
    const result = await action.run(
      { name: '测试项目', userId: 'test-user' },
      context
    );
    
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('测试项目');
  });
  
  it('应该拒绝空项目名', async () => {
    const result = await action.run(
      { name: '', userId: 'test-user' },
      context
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('不能为空');
  });
});
```

## 更多信息

- 完整文档: `server/src/ontology/README.md`
- 设计文档: `.kiro/specs/ontology-refactoring/design.md`
- 测试报告: `server/TEST_REPORT.md`
- 阶段 2 总结: `server/STAGE2_SUMMARY.md`
