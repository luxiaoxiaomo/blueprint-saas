# 本体论架构 (Ontology Architecture)

## 概述

本目录包含基于 Palantir 本体论模式的核心架构实现。这是一个渐进式重构，将现有的直接数据库操作模式升级为对象驱动的本体模式。

## 核心概念

### 1. 对象类型 (Object Types)

对象类型是业务实体的抽象表示，例如：
- `Project` - 项目
- `Module` - 模块
- `Entity` - 实体
- `Task` - 任务

每个对象类型都有明确的属性定义和类型约束。

### 2. 链接类型 (Link Types)

链接类型定义对象之间的关系：
- `Project→Module` - 项目包含模块
- `Module→Entity` - 模块包含实体
- `Project→Task` - 项目包含任务

### 3. 本体服务 (OntologyService)

本体服务提供统一的对象访问接口：

```typescript
// 获取对象
const project = await ontologyService.getObject('Project', projectId);

// 查询对象
const projects = await ontologyService.queryObjects('Project', {
  filters: [{ field: 'user_id', operator: 'eq', value: userId }]
});

// 遍历链接
const modules = await ontologyService.getLinkedObjects(projectId, 'Project→Module');
```

### 4. Actions

Actions 封装所有写操作，提供：
- 权限检查
- 输入验证
- 审计日志
- 事务管理

```typescript
// 创建项目
const action = new CreateProjectAction(ontologyService);
const result = await action.run(
  { name: '新项目', userId: 'user-123' },
  context
);
```

## 目录结构

```
ontology/
├── types.ts                    # 核心类型定义
├── OntologyService.ts          # 本体服务实现
├── Action.ts                   # Action 基类
├── actions/                    # 具体的 Actions
│   ├── CreateProjectAction.ts
│   ├── UpdateProjectAction.ts
│   └── ...
└── README.md                   # 本文档

repositories/
├── BaseRepository.ts           # Repository 基类
├── ProjectRepository.ts        # 项目 Repository
└── ...
```

## 使用示例

### 在路由中使用

```typescript
import { OntologyService } from '../ontology/OntologyService.js';
import { CreateProjectAction } from '../ontology/actions/CreateProjectAction.js';

// 初始化服务
const ontologyService = new OntologyService(
  projectRepo,
  moduleRepo,
  entityRepo,
  taskRepo
);

// 在路由中使用 Action
router.post('/projects', async (req, res) => {
  const context = {
    userId: req.user.id,
    timestamp: new Date(),
  };
  
  const action = new CreateProjectAction(ontologyService);
  const result = await action.run(req.body, context);
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(400).json({ error: result.error });
  };
});
```

### 创建新的 Action

```typescript
export class UpdateProjectAction extends Action<UpdateProjectInput, ProjectObject> {
  name = 'UpdateProject';
  description = '更新项目';
  permissions = [Permission.PROJECT_EDIT];
  
  async validate(input, context) {
    // 验证逻辑
    if (!input.name) {
      throw new Error('项目名称不能为空');
    }
  }
  
  async execute(input, context) {
    // 执行逻辑
    return await this.ontology.updateObject('Project', input.id, {
      name: input.name,
      description: input.description,
    });
  }
}
```

## 迁移策略

### 阶段 1：建立基础（当前阶段）
- ✅ 创建本体服务层
- ✅ 定义核心对象类型
- ✅ 实现 Repository 层
- ✅ 创建 Action 基类
- ✅ 实现第一个 Action (CreateProject)

### 阶段 2：逐步迁移
- 🔄 将现有路由迁移到使用 Actions
- 🔄 保持 API 接口不变
- 🔄 添加审计日志

### 阶段 3：添加企业功能
- ⏳ 添加 Organization 对象
- ⏳ 添加权限系统
- ⏳ 添加 DecisionReceipt

## 向后兼容性

重构过程中保持向后兼容：

1. **API 接口不变** - 现有的 REST API 端点保持不变
2. **数据库结构不变** - 不修改现有表结构
3. **前端无需改动** - 前端代码继续使用现有 API

## 最佳实践

### 1. 所有写操作通过 Actions

❌ 不要这样：
```typescript
await pool.query('INSERT INTO projects ...');
```

✅ 应该这样：
```typescript
const action = new CreateProjectAction(ontologyService);
await action.run(input, context);
```

### 2. 使用本体服务查询

❌ 不要这样：
```typescript
const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
```

✅ 应该这样：
```typescript
const project = await ontologyService.getObject('Project', id);
```

### 3. 使用链接遍历

❌ 不要这样：
```typescript
const result = await pool.query('SELECT * FROM modules WHERE project_id = $1', [projectId]);
```

✅ 应该这样：
```typescript
const modules = await ontologyService.getLinkedObjects(projectId, 'Project→Module');
```

## 下一步

1. 实现更多 Actions（UpdateProject, DeleteProject, UpdateModule 等）
2. 添加审计日志服务
3. 实现权限检查系统
4. 迁移现有路由到新架构
5. 添加单元测试和集成测试

## 参考资料

- [Palantir Ontology 设计模式](https://blog.palantir.com/ontology-driven-development-3c5e8f4e0e5e)
- [企业级 SaaS 升级设计文档](../../.kiro/specs/enterprise-saas-upgrade/design.md)
