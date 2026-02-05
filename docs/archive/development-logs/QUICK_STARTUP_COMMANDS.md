# 快速启动命令

## 一键启动所有服务

```bash
# 启动所有 Docker 容器
docker-compose up -d

# 等待服务启动完成（约 30 秒）
# 然后访问: http://localhost:3000
```

## 单个服务管理

### 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d postgres
docker-compose up -d backend
docker-compose up -d frontend
```

### 停止服务
```bash
# 停止所有服务
docker-compose down

# 停止特定服务
docker-compose stop postgres
docker-compose stop backend
docker-compose stop frontend
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# 查看最后 50 行日志
docker logs blueprint_backend --tail 50
docker logs blueprint_frontend --tail 50
docker logs blueprint_postgres --tail 50
```

## 数据库操作

### 连接数据库
```bash
# 使用 psql 连接
docker exec -it blueprint_postgres psql -U postgres -d blueprint_saas

# 常用命令
\dt                    # 列出所有表
\d table_name          # 查看表结构
SELECT * FROM users;   # 查询数据
\q                     # 退出
```

### 备份数据库
```bash
# 备份到文件
docker exec blueprint_postgres pg_dump -U postgres blueprint_saas > backup.sql

# 恢复数据库
docker exec -i blueprint_postgres psql -U postgres blueprint_saas < backup.sql
```

### 清空数据库
```bash
# 删除所有表（谨慎使用！）
docker exec blueprint_postgres psql -U postgres -d blueprint_saas -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
"

# 重新初始化数据库
docker restart blueprint_backend
```

## API 测试

### 健康检查
```bash
curl http://localhost:5000/health
```

### 获取项目列表（需要认证）
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/projects
```

### 获取审计日志
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/audit-logs
```

## 开发工作流

### 修改后端代码
```bash
# 1. 编辑代码
# 2. 重建后端镜像
docker-compose build backend

# 3. 重启后端服务
docker-compose up -d backend

# 4. 查看日志
docker logs -f blueprint_backend
```

### 修改前端代码
```bash
# 1. 编辑代码
# 2. 重建前端镜像
docker-compose build frontend

# 3. 重启前端服务
docker-compose up -d frontend

# 4. 查看日志
docker logs -f blueprint_frontend
```

### 修改数据库架构
```bash
# 1. 编辑 server/migrations/00-init-schema.sql
# 2. 清空数据库
docker exec blueprint_postgres psql -U postgres -d blueprint_saas -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
"

# 3. 重启后端（会自动重新初始化）
docker restart blueprint_backend

# 4. 验证
docker exec blueprint_postgres psql -U postgres -d blueprint_saas -c "\dt"
```

## 故障排查

### 检查容器状态
```bash
# 查看所有容器
docker ps -a

# 查看容器详细信息
docker inspect blueprint_backend
docker inspect blueprint_postgres
docker inspect blueprint_frontend
```

### 检查网络连接
```bash
# 测试后端连接
docker exec blueprint_frontend curl http://blueprint_backend:5000/health

# 测试数据库连接
docker exec blueprint_backend node -e "
const pg = require('pg');
const pool = new pg.Pool({
  host: 'postgres',
  port: 5432,
  database: 'blueprint_saas',
  user: 'postgres',
  password: 'o1L7F%HlA+n*kb4f5j'
});
pool.query('SELECT 1', (err, res) => {
  console.log(err ? 'Error: ' + err.message : 'Connected!');
  process.exit(0);
});
"
```

### 清理 Docker 资源
```bash
# 删除所有停止的容器
docker container prune

# 删除未使用的镜像
docker image prune

# 删除未使用的卷
docker volume prune

# 完全清理（谨慎使用！）
docker system prune -a
```

## 环境变量

### 后端环境变量 (server/.env)
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
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000/api
```

### 前端环境变量 (.env.local)
```
VITE_API_URL=http://localhost:5000/api
GEMINI_API_KEY=PLACEHOLDER_API_KEY
```

### Docker Compose 环境变量 (.env)
```
DB_PASSWORD=o1L7F%HlA+n*kb4f5j
JWT_SECRET=UXRMCY4B2NumI9LWtwdlfjDHi03Ks68opnEJxSbc
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000/api
GEMINI_API_KEY=PLACEHOLDER_API_KEY
```

## 常见问题

### Q: 如何修改数据库密码？
A: 编辑 `.env` 文件中的 `DB_PASSWORD`，然后重启容器：
```bash
docker-compose down
docker-compose up -d
```

### Q: 如何访问前端应用？
A: 打开浏览器访问 http://localhost:3000

### Q: 如何查看后端日志？
A: 运行 `docker logs -f blueprint_backend`

### Q: 如何重置数据库？
A: 运行上面"清空数据库"部分的命令

### Q: 如何备份数据？
A: 运行上面"备份数据库"部分的命令

---

**提示**: 所有命令都应该在项目根目录运行
