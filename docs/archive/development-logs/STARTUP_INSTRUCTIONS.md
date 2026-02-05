# 项目启动指南

## 当前状态

✅ **前端已启动**
- 地址: http://localhost:3000
- 状态: 运行中

⚠️ **后端需要启动**
- 需要 Docker 和 PostgreSQL/Redis

---

## 快速启动步骤

### 1. 启动 Docker 和数据库

首先确保 Docker Desktop 正在运行，然后执行：

```bash
# 启动 PostgreSQL
docker-compose up -d postgres

# 启动 Redis
docker run -d --name blueprint_redis -p 6379:6379 redis:7-alpine
```

### 2. 初始化数据库

```bash
# 复制环境配置
cp .env server/.env

# 初始化数据库表
docker exec -e PGPASSWORD='o1L7F%HlA+n*kb4f5j' blueprint_postgres psql -U postgres -d blueprint_saas -f /tmp/00-init-schema.sql
```

### 3. 启动后端

```bash
cd server
npm install
npm run build
npm run start
```

后端将在 http://localhost:5000 启动

### 4. 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:5000/api
- **健康检查**: http://localhost:5000/health

---

## 环境配置

### 前端 (.env.local)
```
VITE_API_URL=http://localhost:5000/api
GEMINI_API_KEY=your_api_key
```

### 后端 (server/.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blueprint_saas
DB_USER=postgres
DB_PASSWORD=o1L7F%HlA+n*kb4f5j

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=UXRMCY4B2NumI9LWtwdlfjDHi03Ks68opnEJxSbc
PORT=5000
NODE_ENV=development
```

---

## 常见问题

### Docker 守护进程未运行
**解决方案**: 启动 Docker Desktop

### 端口已被占用
```bash
# 查找占用端口的进程
netstat -ano | findstr :5000

# 杀死进程
taskkill /PID <PID> /F
```

### 数据库连接失败
```bash
# 检查 PostgreSQL 容器
docker ps | grep postgres

# 查看日志
docker logs blueprint_postgres
```

### Redis 连接失败
```bash
# 检查 Redis 容器
docker ps | grep redis

# 启动 Redis
docker run -d --name blueprint_redis -p 6379:6379 redis:7-alpine
```

---

## 开发命令

### 前端
```bash
npm run dev      # 开发模式
npm run build    # 编译生产版本
npm run preview  # 预览生产版本
```

### 后端
```bash
npm run dev      # 开发模式（自动重启）
npm run build    # 编译
npm run start    # 启动
npm run test     # 运行测试
```

---

## 项目结构

```
blueprint-saas/
├── components/          # React 组件
├── services/           # 前端服务
├── server/             # 后端代码
│   ├── src/
│   │   ├── routes/     # API 路由
│   │   ├── services/   # 业务逻辑
│   │   ├── repositories/ # 数据访问
│   │   └── ontology/   # 本体论
│   ├── migrations/     # 数据库迁移
│   └── tests/          # 测试
├── docs/               # 文档
└── package.json
```

---

## 下一步

1. ✅ 启动前端 (已完成)
2. ⏳ 启动后端 (需要 Docker)
3. 📝 创建测试账户
4. 🧪 运行测试
5. 🚀 开始开发

---

## 获取帮助

- 查看 `QUICK_START_GUIDE.md` 了解更多信息
- 查看 `server/DEVELOPMENT_GUIDE.md` 了解后端开发
- 查看 `server/API_DOCUMENTATION.md` 了解 API 文档

---

**最后更新**: 2026-01-28
