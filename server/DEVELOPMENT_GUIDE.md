# 开发指南

## 概述

本指南帮助开发者快速上手蓝图 AI 系统架构梳理工具的开发工作。

## 技术栈

### 后端
- **Node.js** v18+
- **TypeScript** v5.0+
- **Express** - Web 框架
- **PostgreSQL** - 主数据库
- **Redis** (可选) - 缓存
- **JWT** - 认证

### 前端
- **React** v18+
- **TypeScript**
- **Vite** - 构建工具
- **TailwindCSS** - 样式

### 测试
- **Vitest** - 单元测试
- **Node.js 测试脚本** - 集成测试

## 开发环境设置

### 1. 克隆项目

```bash
git clone <repository-url>
cd blueprint-ai
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/blueprint_ai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blueprint_ai
DB_USER=your_user
DB_PASSWORD=your_password

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production

# 服务器配置
PORT=5000
NODE_ENV=development

# Redis 配置（可选）
REDIS_URL=redis://localhost:6379
ENABLE_REDIS=false

# Gemini API（可选）
GEMINI_API_KEY=your-gemini-api-key
```

### 4. 初始化数据库

```bash
cd server
npm run db:setup
```

### 5. 启动开发服务器

```bash
# 启动后端（终端 1）
cd server
npm run dev

# 启动前端（终端 2）
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
blueprint-ai/
├── components/              # React 组件
│   ├── App.tsx             # 主应用组件
│   ├── ProjectManager.tsx  # 项目管理
│   ├── ModuleEditor.tsx    # 模块编辑器
│   └── ...
├── services/               # 前端服务
│   ├── apiService.ts       # API 调用
│   └── geminiService.ts    # AI 服务
├── server/                 # 后端代码
│   ├── src/
│   │   ├── index.ts        # 服务器入口
│   │   ├── db.ts           # 数据库连接
│   │   ├── ontology/       # 本体论架构
│   │   │   ├── OntologyService.ts
│   │   │   ├── Action.ts
│   │   │   └── actions/    # 所有 Actions
│   │   ├── repositories/   # 数据访问层
│   │   │   ├── BaseRepository.ts
│   │   │   ├── ProjectRepository.ts
│   │   │   └── ...
│   │   ├── services/       # 业务服务
│   │   │   ├── AuditService.ts
│   │   │   ├── PermissionService.ts
│   │   │   ├── CacheService.ts
│   │   │   └── ...
│   │   ├── routes/         # API 路由
│   │   └── middleware/     # 中间件
│   └── test-*.js           # 测试文件
├── docs/                   # 文档
└── .kiro/                  # Kiro 配置
```

## 核心概念

### 本体论架构

本项目采用 Palantir 本体设计模式，核心概念：

#### 1. Objects（对象）

对象是系统中的核心实体，如 Project、Module、Entity 等。

```typescript
interface OntologyObject {
  id: string;
  type: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Actions（操作）

所有写操作必须通过 Actions 执行，确保：
- 输入验证
- 权限检查
- 审计日志
- 事务一致性

```typescript
class CreateProjectAction extends Action<Project> {
  async validate(): Promise<void> {
    // 验证输入
  }

  async execute(): Promise<Project> {
    // 执行操作
  }
}
```

#### 3. Links（链接）

对象之间的关系通过 Links 表示：

```typescript
interface Link {
  sourceId: string;
  targetId: string;
  linkType: string;
  metadata?: Record<string, any>;
}
```

### 数据访问层

使用 Repository 模式封装数据访问：

```typescript
class ProjectRepository extends BaseRepository<Project> {
  async findByUserId(userId: string): Promise<Project[]> {
    // 实现查询逻辑
  }
}
```

### 服务层

业务逻辑封装在 Service 中：

```typescript
class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    // 记录审计日志
  }
}
```

## 开发工作流

### 1. 添加新功能

#### 步骤 1: 定义对象类型

在 `server/src/ontology/types.ts` 中添加类型定义：

```typescript
export interface MyNewObject extends OntologyObject {
  type: 'MyNewObject';
  properties: {
    name: string;
    description: string;
    // 其他属性
  };
}
```

#### 步骤 2: 创建 Repository

在 `server/src/repositories/` 中创建 Repository：

```typescript
export class MyNewObjectRepository extends BaseRepository<MyNewObject> {
  constructor(pool: Pool) {
    super(pool, 'my_new_objects');
  }

  // 添加专用查询方法
  async findByName(name: string): Promise<MyNewObject[]> {
    const result = await this.pool.query(
      'SELECT * FROM my_new_objects WHERE name = $1',
      [name]
    );
    return result.rows;
  }
}
```

#### 步骤 3: 创建 Actions

在 `server/src/ontology/actions/` 中创建 Actions：

```typescript
export class CreateMyNewObjectAction extends Action<MyNewObject> {
  constructor(
    ontology: OntologyService,
    private name: string,
    private description: string,
    userId: string
  ) {
    super(ontology, 'CreateMyNewObject', userId, [Permission.OBJECT_CREATE]);
  }

  async validate(): Promise<void> {
    if (!this.name) {
      throw new Error('名称不能为空');
    }
  }

  async execute(): Promise<MyNewObject> {
    return await this.ontology.createObject('MyNewObject', {
      name: this.name,
      description: this.description,
    }, this.userId);
  }
}
```

#### 步骤 4: 添加 API 路由

在 `server/src/routes/` 中添加路由：

```typescript
router.post('/my-new-objects', authenticateToken, async (req, res) => {
  try {
    const action = new CreateMyNewObjectAction(
      ontologyService,
      req.body.name,
      req.body.description,
      req.user.id
    );
    const result = await action.run();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

#### 步骤 5: 编写测试

创建测试文件 `server/test-my-new-object.js`：

```javascript
async function testCreateMyNewObject() {
  const action = new CreateMyNewObjectAction(
    ontologyService,
    'Test Object',
    'Test Description',
    'user-123'
  );
  const result = await action.run();
  console.assert(result.properties.name === 'Test Object');
}
```

#### 步骤 6: 添加前端组件

在 `components/` 中创建 React 组件：

```typescript
export function MyNewObjectManager() {
  const [objects, setObjects] = useState([]);

  useEffect(() => {
    loadObjects();
  }, []);

  async function loadObjects() {
    const data = await apiService.get('/my-new-objects');
    setObjects(data);
  }

  return (
    <div>
      {/* UI 实现 */}
    </div>
  );
}
```

### 2. 修改现有功能

1. 找到相关的 Action 或 Repository
2. 修改代码
3. 更新测试
4. 运行测试确保没有破坏现有功能

### 3. 代码审查清单

- [ ] 代码符合 TypeScript 规范
- [ ] 所有写操作通过 Actions 执行
- [ ] 添加了适当的输入验证
- [ ] 添加了权限检查
- [ ] 添加了审计日志
- [ ] 编写了单元测试
- [ ] 测试通过
- [ ] 更新了文档

## 测试

### 运行所有测试

```bash
cd server

# 运行 Vitest 测试
npm test

# 运行集成测试
node run-all-tests.js

# 运行特定测试
node test-ontology.js
node test-repositories.js
node test-audit.js
```

### 编写测试

#### 单元测试（Vitest）

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyNewObjectRepository', () => {
  let repo: MyNewObjectRepository;

  beforeEach(() => {
    repo = new MyNewObjectRepository(mockPool);
  });

  it('应该创建新对象', async () => {
    const obj = await repo.create({
      name: 'Test',
      description: 'Test Description',
    });
    expect(obj.properties.name).toBe('Test');
  });
});
```

#### 集成测试（Node.js）

```javascript
async function testMyNewObject() {
  console.log('🧪 测试 MyNewObject...');
  
  try {
    // 创建对象
    const obj = await createMyNewObject();
    console.assert(obj.id, '对象应该有 ID');
    
    // 查询对象
    const found = await findMyNewObject(obj.id);
    console.assert(found.id === obj.id, '应该找到对象');
    
    console.log('✅ 测试通过');
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
}
```

## 调试

### 后端调试

#### 使用 VS Code

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/server/src/index.ts",
      "preLaunchTask": "tsc: build - server/tsconfig.json",
      "outFiles": ["${workspaceFolder}/server/dist/**/*.js"]
    }
  ]
}
```

#### 使用日志

```typescript
import { logger } from './utils/logger';

logger.debug('调试信息', { data });
logger.info('普通信息');
logger.warn('警告信息');
logger.error('错误信息', error);
```

### 前端调试

使用 React DevTools 和浏览器开发者工具。

### 数据库调试

```bash
# 连接到数据库
psql -U your_user -d blueprint_ai

# 查看表结构
\d projects

# 查看数据
SELECT * FROM projects LIMIT 10;

# 查看审计日志
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

## 性能优化

### 1. 使用缓存

```typescript
import { cacheService } from './services/CacheService';

// 缓存查询结果
const cacheKey = CacheService.queryKey('Project', { userId });
let projects = await cacheService.get(cacheKey);

if (!projects) {
  projects = await projectRepo.findByUserId(userId);
  await cacheService.set(cacheKey, projects, 300); // 5 分钟
}
```

### 2. 使用批量查询

```typescript
import { batchOptimizer } from './services/BatchQueryOptimizer';

// 批量查询会自动合并
const promises = ids.map(id => 
  batchOptimizer.query('SELECT * FROM projects WHERE id = $1', [id])
);
const results = await Promise.all(promises);
```

### 3. 添加数据库索引

```sql
-- 为常用查询添加索引
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_modules_project_id ON modules(project_id);
```

### 4. 使用性能监控

```typescript
import { performanceMonitor } from './services/PerformanceMonitor';

const id = performanceMonitor.start('operation-name');
try {
  await doSomething();
  performanceMonitor.end(id, false);
} catch (error) {
  performanceMonitor.end(id, true);
  throw error;
}

// 查看性能报告
performanceMonitor.printReport();
```

## 常见问题

### Q: 如何添加新的权限？

在 `server/src/ontology/types.ts` 中添加：

```typescript
export enum Permission {
  // 现有权限...
  MY_NEW_PERMISSION = 'my:new:permission',
}
```

### Q: 如何修改缓存策略？

在 `server/src/services/CachedOntologyService.ts` 中修改 TTL：

```typescript
await this.cache.set(cacheKey, result, 600); // 10 分钟
```

### Q: 如何处理数据库迁移？

1. 创建迁移脚本 `server/migrations/001_add_new_table.sql`
2. 运行迁移：`npm run migrate`

### Q: 如何添加新的链接类型？

在 `server/src/ontology/types.ts` 中添加：

```typescript
export enum LinkType {
  // 现有类型...
  MY_NEW_LINK = 'MyObject→OtherObject',
}
```

## 代码规范

### TypeScript

- 使用 `interface` 定义数据结构
- 使用 `type` 定义联合类型
- 避免使用 `any`，使用 `unknown` 代替
- 使用 `async/await` 而不是 Promise 链

### 命名规范

- 类名：PascalCase（`ProjectRepository`）
- 函数名：camelCase（`findByUserId`）
- 常量：UPPER_SNAKE_CASE（`MAX_SIZE`）
- 文件名：kebab-case（`project-repository.ts`）

### 注释

```typescript
/**
 * 创建新项目
 * @param name 项目名称
 * @param userId 用户 ID
 * @returns 创建的项目对象
 */
async function createProject(name: string, userId: string): Promise<Project> {
  // 实现
}
```

## Git 工作流

### 分支策略

- `main` - 生产分支
- `develop` - 开发分支
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支

### 提交消息

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
test: 添加测试
refactor: 重构代码
perf: 性能优化
chore: 构建/工具变更
```

### 工作流程

```bash
# 1. 创建功能分支
git checkout -b feature/my-new-feature

# 2. 开发和提交
git add .
git commit -m "feat: 添加新功能"

# 3. 推送到远程
git push origin feature/my-new-feature

# 4. 创建 Pull Request

# 5. 代码审查通过后合并
```

## 资源

### 文档
- [API 文档](./API_DOCUMENTATION.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [本体论架构](./src/ontology/README.md)
- [Actions 参考](./ACTIONS_REFERENCE.md)

### 工具
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Express 文档](https://expressjs.com/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [React 文档](https://react.dev/)
- [Vitest 文档](https://vitest.dev/)

### 社区
- GitHub Issues
- 开发者论坛
- Slack 频道

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 编写测试
5. 创建 Pull Request
6. 等待代码审查

## 许可证

MIT License

---

**最后更新**: 2026-01-18
