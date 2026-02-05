# 🚀 快速启动数据库

## 问题诊断

你遇到的 "Failed to fetch" 错误是因为：
1. 后端服务器无法启动
2. 后端无法连接到 PostgreSQL 数据库（端口 5432）

## ✅ 最快解决方案（3 步）

### 步骤 1：启动数据库（使用 Docker）

在项目根目录运行：

```bash
# 只启动 PostgreSQL 数据库
docker-compose up -d postgres
```

或者如果你没有 Docker，手动启动 PostgreSQL：

```powershell
# Windows - 以管理员身份运行
Start-Service postgresql-x64-14

# 或者查找你的 PostgreSQL 服务名称
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

### 步骤 2：配置环境变量

```bash
cd server
copy .env.example .env
```

编辑 `.env` 文件，至少设置这两个：
```env
DB_PASSWORD=changeme
JWT_SECRET=your-secret-key-here-change-this
```

### 步骤 3：重启后端服务器

后端服务器会自动重启（如果使用 nodemon）。

或者手动重启：
```bash
# 停止当前进程（Ctrl+C）
# 然后重新运行
cd server
npm run dev
```

## 🔍 验证

### 1. 检查数据库是否运行

```bash
# 使用 Docker
docker ps | findstr postgres

# 或检查端口
netstat -ano | findstr :5432
```

### 2. 检查后端服务器

访问：http://localhost:5000/health

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T..."
}
```

### 3. 测试登录

1. 访问前端：http://localhost:5173
2. 点击"注册"
3. 填写信息并提交
4. 如果成功，说明一切正常！

## 🐛 如果还是不行

### 检查后端日志

查看后端服务器的输出，应该看到：
```
✅ 数据库表初始化成功
✅ Redis 连接成功（或降级运行）
🚀 服务器运行在 http://localhost:5000
```

### 常见错误

1. **ECONNREFUSED ::1:5432**
   - PostgreSQL 未运行
   - 解决：启动 PostgreSQL 服务

2. **password authentication failed**
   - 密码不正确
   - 解决：检查 `.env` 中的 `DB_PASSWORD`

3. **database "blueprint_saas" does not exist**
   - 数据库未创建
   - 解决：
     ```sql
     -- 使用 psql 或 pgAdmin
     CREATE DATABASE blueprint_saas;
     ```

4. **Port 5000 already in use**
   - 端口被占用
   - 解决：在 `.env` 中设置 `PORT=5001`

## 📝 临时测试方案（不推荐）

如果你只想快速测试前端界面，可以在浏览器控制台运行：

```javascript
// 设置模拟认证
localStorage.setItem('auth_token', 'mock-token');
localStorage.setItem('user', JSON.stringify({
  id: 'test-id',
  email: 'test@example.com',
  name: '测试用户'
}));
location.reload();
```

这样可以绕过登录，但无法使用需要后端的功能。

## 🎯 推荐方案

**使用 Docker 是最简单的方式**：

```bash
# 启动所有服务（数据库 + 后端 + 前端）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down
```

但如果你想在本地开发，只需要启动数据库：

```bash
# 只启动数据库
docker-compose up -d postgres

# 然后在本地运行后端
cd server
npm run dev
```

## ✨ 成功标志

当一切正常时，你会看到：

1. **后端日志**：
   ```
   ✅ 数据库表初始化成功
   🚀 服务器运行在 http://localhost:5000
   ✅ 企业级 SaaS 升级 - 第一阶段启动
   ```

2. **前端界面**：
   - 可以注册新用户
   - 可以登录
   - 可以访问成员管理和部门管理页面

3. **健康检查**：
   - http://localhost:5000/health 返回 OK

祝你好运！🎉
