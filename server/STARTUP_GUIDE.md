# 服务器启动指南

## 问题诊断

当前服务器启动失败，原因是 **PostgreSQL 数据库未运行**。

错误信息：
```
ECONNREFUSED ::1:5432
ECONNREFUSED 127.0.0.1:5432
```

这表示服务器无法连接到 PostgreSQL 数据库（端口 5432）。

## 解决方案

### 方案 1：启动 PostgreSQL 服务（推荐）

#### Windows 系统：

1. **使用服务管理器启动**：
   ```powershell
   # 以管理员身份运行 PowerShell
   Start-Service postgresql-x64-14  # 或者你的 PostgreSQL 服务名称
   ```

2. **或者使用 pgAdmin**：
   - 打开 pgAdmin
   - 右键点击服务器 → 启动

3. **或者使用 Windows 服务**：
   - 按 Win + R，输入 `services.msc`
   - 找到 PostgreSQL 服务
   - 右键 → 启动

#### 验证 PostgreSQL 是否运行：
```powershell
# 检查端口 5432 是否被监听
Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
```

### 方案 2：使用 Docker 运行 PostgreSQL（推荐用于开发）

如果你没有安装 PostgreSQL，可以使用 Docker：

```bash
# 启动 PostgreSQL 容器
docker run -d \
  --name blueprint-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=blueprint_saas \
  -p 5432:5432 \
  postgres:14

# 启动 Redis 容器
docker run -d \
  --name blueprint-redis \
  -p 6379:6379 \
  redis:7-alpine
```

或者使用 docker-compose（项目根目录已有 docker-compose.yml）：

```bash
# 在项目根目录运行
docker-compose up -d
```

### 方案 3：配置环境变量

1. 复制环境变量模板：
   ```bash
   cd server
   copy .env.example .env
   ```

2. 编辑 `.env` 文件，设置正确的数据库连接信息：
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=blueprint_saas
   DB_USER=postgres
   DB_PASSWORD=your_actual_password
   
   JWT_SECRET=your_secure_random_string
   ```

## 启动步骤

完成上述配置后，按以下步骤启动服务器：

1. **确保 PostgreSQL 和 Redis 正在运行**

2. **安装依赖**（如果还没有）：
   ```bash
   cd server
   npm install
   ```

3. **编译 TypeScript 代码**：
   ```bash
   npm run build
   ```

4. **启动服务器**：
   ```bash
   npm run dev
   ```

## 验证服务器是否正常运行

服务器启动成功后，你应该看到：

```
✅ 数据库表初始化成功
✅ Redis 连接成功
🚀 服务器运行在 http://localhost:5000
📊 环境: development
✅ 本体论架构已集成
✅ 企业级 SaaS 升级 - 第一阶段启动
```

访问健康检查端点：
```bash
curl http://localhost:5000/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T..."
}
```

## 常见问题

### Q: PostgreSQL 服务名称是什么？
A: 常见的服务名称：
- `postgresql-x64-14`
- `postgresql-x64-15`
- `PostgreSQL`

使用以下命令查看：
```powershell
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

### Q: 忘记了 PostgreSQL 密码怎么办？
A: 
1. 找到 PostgreSQL 的 `pg_hba.conf` 文件
2. 临时修改认证方式为 `trust`
3. 重启 PostgreSQL 服务
4. 使用 `psql` 修改密码
5. 恢复 `pg_hba.conf` 的原始设置

### Q: Redis 连接失败怎么办？
A: 
- 确保 Redis 服务正在运行
- 或者在 `.env` 中设置 `REDIS_ENABLED=false` 临时禁用 Redis

### Q: 端口 5000 被占用怎么办？
A: 在 `.env` 文件中修改 `PORT=5001`（或其他可用端口）

## 下一步

服务器启动成功后：

1. 访问前端应用：http://localhost:5173
2. 注册一个新账户
3. 开始使用成员管理和部门管理功能

## 技术支持

如果遇到其他问题，请查看：
- `server/DEVELOPMENT_GUIDE.md` - 开发指南
- `server/DEPLOYMENT_GUIDE.md` - 部署指南
- `server/API_DOCUMENTATION.md` - API 文档
