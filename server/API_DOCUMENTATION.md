# API 文档

## 概述

本文档描述了蓝图 AI 系统架构梳理工具的 RESTful API。

**基础 URL**: `http://localhost:5000/api`

**认证方式**: JWT Bearer Token

## 认证

### 注册

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### 登录

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**: 同注册

## 项目管理

### 获取所有项目

```http
GET /api/projects
Authorization: Bearer {token}
```

**响应**:
```json
[
  {
    "id": "uuid",
    "name": "项目名称",
    "description": "项目描述",
    "model": {},
    "isArchived": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 创建项目

```http
POST /api/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "新项目",
  "description": "项目描述",
  "model": {}
}
```

### 更新项目

```http
PUT /api/projects/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "更新的项目名",
  "description": "更新的描述",
  "model": {}
}
```

### 删除项目

```http
DELETE /api/projects/:id
Authorization: Bearer {token}
```

### 归档/取消归档项目

```http
POST /api/projects/:id/archive
Authorization: Bearer {token}
Content-Type: application/json

{
  "isArchived": true
}
```

## 模块管理

### 获取项目的所有模块

```http
GET /api/modules?projectId={projectId}
Authorization: Bearer {token}
```

### 创建模块

```http
POST /api/modules
Authorization: Bearer {token}
Content-Type: application/json

{
  "projectId": "uuid",
  "name": "模块名称",
  "description": "模块描述",
  "functionalPoints": []
}
```

### 更新模块

```http
PUT /api/modules/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "更新的模块名",
  "description": "更新的描述"
}
```

### 删除模块

```http
DELETE /api/modules/:id
Authorization: Bearer {token}
```

## 审计日志

### 获取审计日志

```http
GET /api/audit-logs?userId={userId}&action={action}&limit=50
Authorization: Bearer {token}
```

**查询参数**:
- `userId` (可选): 用户 ID
- `action` (可选): 操作类型
- `resourceType` (可选): 资源类型
- `limit` (可选): 返回数量限制，默认 50

**响应**:
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "action": "CreateProject",
    "resourceType": "Project",
    "resourceId": "uuid",
    "details": {},
    "ipAddress": "127.0.0.1",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## 数据导入

### 导入数据

```http
POST /api/import
Authorization: Bearer {token}
Content-Type: application/json

{
  "projectId": "uuid",
  "data": {
    "modules": [],
    "entities": []
  }
}
```

## 错误响应

所有 API 错误都遵循以下格式：

```json
{
  "error": "错误消息"
}
```

**HTTP 状态码**:
- `200` - 成功
- `201` - 创建成功
- `400` - 请求错误
- `401` - 未认证
- `403` - 无权限
- `404` - 资源不存在
- `500` - 服务器错误

## 速率限制

目前没有速率限制。生产环境建议配置：
- 每个 IP 每分钟最多 60 个请求
- 每个用户每分钟最多 100 个请求

## 分页

对于返回列表的 API，支持分页参数：

```http
GET /api/projects?page=1&limit=20
```

**参数**:
- `page`: 页码，从 1 开始
- `limit`: 每页数量，默认 20，最大 100

**响应**:
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## WebSocket (未来支持)

计划支持 WebSocket 用于实时更新：

```javascript
const ws = new WebSocket('ws://localhost:5000');
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'project:uuid'
}));
```

## 版本控制

API 版本通过 URL 路径指定：

- 当前版本: `/api` (v1)
- 未来版本: `/api/v2`

## 安全建议

1. **HTTPS**: 生产环境必须使用 HTTPS
2. **Token 过期**: JWT Token 默认 24 小时过期
3. **密码策略**: 最少 8 个字符
4. **CORS**: 配置允许的域名
5. **SQL 注入**: 所有查询使用参数化
6. **XSS**: 所有输出进行转义

## 性能优化

1. **缓存**: 使用 Redis 缓存频繁查询的数据
2. **批量查询**: 使用批量 API 减少请求次数
3. **压缩**: 启用 gzip 压缩
4. **CDN**: 静态资源使用 CDN

## 示例代码

### JavaScript/TypeScript

```typescript
// 登录
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const { token } = await response.json();

// 获取项目列表
const projects = await fetch('http://localhost:5000/api/projects', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const projectList = await projects.json();
```

### Python

```python
import requests

# 登录
response = requests.post('http://localhost:5000/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'password123'
})

token = response.json()['token']

# 获取项目列表
projects = requests.get('http://localhost:5000/api/projects', headers={
    'Authorization': f'Bearer {token}'
})

project_list = projects.json()
```

## 更新日志

### v1.0.0 (2024-01-18)
- 初始版本发布
- 支持项目、模块管理
- 支持审计日志
- 支持数据导入

## 支持

如有问题，请联系：
- Email: support@example.com
- GitHub: https://github.com/your-repo/issues
