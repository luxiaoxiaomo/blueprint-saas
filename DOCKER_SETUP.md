# 🐳 Docker 快速设置指南

## 当前问题

错误信息：`open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`

这说明 **Docker Desktop 没有运行**。

## ✅ 解决步骤

### 1. 启动 Docker Desktop

1. 在 Windows 开始菜单中找到 "Docker Desktop"
2. 点击启动
3. 等待 Docker 图标变成绿色（表示正在运行）
4. 这可能需要 30-60 秒

### 2. 验证 Docker 是否运行

打开 PowerShell 或命令提示符，运行：

```bash
docker --version
docker ps
```

如果看到版本信息和容器列表（可能为空），说明 Docker 正在运行。

### 3. 启动 PostgreSQL 数据库

在项目根目录运行：

```bash
docker-compose up -d postgres
```

你应该看到：
```
Creating network "blue_blueprint_network" with driver "bridge"
Creating volume "blue_postgres_data" with local driver
Creating blueprint_postgres ... done
```

### 4. 验证数据库是否运行

```bash
docker ps
```

应该看到一个名为 `blueprint_postgres` 的容器正在运行。

### 5. 配置后端环境变量

```bash
cd server
copy .env.example .env
```

编辑 `.env` 文件：
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blueprint_saas
DB_USER=postgres
DB_PASSWORD=changeme
JWT_SECRET=your-secret-key-change-this
```

### 6. 重启后端服务器

停止当前的后端进程（如果在运行），然后：

```bash
cd server
npm run dev
```

你应该看到：
```
✅ 数据库表初始化成功
✅ Redis 连接成功（或降级运行）
🚀 服务器运行在 http://localhost:5000
```

### 7. 测试

访问：http://localhost:5000/health

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T..."
}
```

## 🔧 如果 Docker Desktop 未安装

### 下载并安装 Docker Desktop

1. 访问：https://www.docker.com/products/docker-desktop/
2. 下载 Windows 版本
3. 运行安装程序
4. 重启电脑（如果需要）
5. 启动 Docker Desktop

### 系统要求

- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
- 或 Windows 11
- 启用 WSL 2（Windows Subsystem for Linux）
- 至少 4GB RAM

## 🎯 快速命令参考

```bash
# 启动数据库
docker-compose up -d postgres

# 查看运行的容器
docker ps

# 查看数据库日志
docker-compose logs -f postgres

# 停止数据库
docker-compose stop postgres

# 完全删除数据库（包括数据）
docker-compose down -v

# 重启数据库
docker-compose restart postgres
```

## 🆘 常见问题

### Q: Docker Desktop 启动很慢
A: 第一次启动可能需要几分钟，请耐心等待。

### Q: 提示 "WSL 2 installation is incomplete"
A: 
1. 打开 PowerShell（管理员）
2. 运行：`wsl --install`
3. 重启电脑

### Q: 端口 5432 已被占用
A: 可能本地已经安装了 PostgreSQL
- 停止本地 PostgreSQL 服务
- 或修改 docker-compose.yml 中的端口映射：`"5433:5432"`

### Q: 数据库连接失败
A: 
1. 确认容器正在运行：`docker ps`
2. 检查日志：`docker-compose logs postgres`
3. 确认 `.env` 中的密码与 docker-compose.yml 一致

## 📝 不使用 Docker 的替代方案

如果你不想使用 Docker，可以：

1. **安装本地 PostgreSQL**：
   - 下载：https://www.postgresql.org/download/windows/
   - 安装后启动服务
   - 创建数据库：`CREATE DATABASE blueprint_saas;`

2. **使用在线数据库**：
   - ElephantSQL（免费）：https://www.elephantsql.com/
   - Supabase（免费）：https://supabase.com/
   - 获取连接字符串并更新 `.env`

## ✨ 成功标志

当一切正常时：

1. ✅ Docker Desktop 图标是绿色的
2. ✅ `docker ps` 显示 `blueprint_postgres` 容器
3. ✅ 后端日志显示"数据库表初始化成功"
4. ✅ http://localhost:5000/health 返回 OK
5. ✅ 前端可以注册和登录

## 🚀 下一步

数据库启动成功后：
1. 访问前端：http://localhost:5173
2. 注册新账户
3. 登录
4. 开始使用成员管理和部门管理功能！

祝你好运！🎉
