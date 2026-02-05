# 快速启动指南（无需 PostgreSQL）

## 问题

当前后端服务器无法启动，因为 PostgreSQL 数据库未运行。

## 临时解决方案

有两个选择：

### 选项 1：启动 PostgreSQL（推荐用于生产）

1. **检查 PostgreSQL 服务状态**：
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*postgres*"}
   ```

2. **启动 PostgreSQL 服务**：
   ```powershell
   # 以管理员身份运行
   Start-Service postgresql-x64-14  # 替换为你的服务名称
   ```

3. **创建数据库**：
   ```sql
   -- 使用 psql 或 pgAdmin
   CREATE DATABASE blueprint_saas;
   ```

4. **配置环境变量**：
   ```bash
   cd server
   copy .env.example .env
   # 编辑 .env，设置正确的数据库密码
   ```

5. **启动服务器**：
   ```bash
   npm run dev
   ```

### 选项 2：使用 Docker（最简单）

如果你安装了 Docker：

```bash
# 在项目根目录
docker-compose up -d

# 等待几秒钟让数据库启动
# 然后启动后端
cd server
npm run dev
```

### 选项 3：临时禁用数据库（仅用于前端开发）

如果你只想测试前端界面，可以使用模拟数据：

1. 在浏览器控制台运行：
   ```javascript
   // 设置模拟的认证令牌
   localStorage.setItem('auth_token', 'mock-token-for-testing');
   localStorage.setItem('user', JSON.stringify({
     id: 'test-user-id',
     email: 'test@example.com',
     name: '测试用户'
   }));
   
   // 刷新页面
   location.reload();
   ```

2. 这样可以绕过登录，直接访问前端界面

## 验证服务器是否运行

打开浏览器访问：
- http://localhost:5000/health

如果看到 `{"status":"ok","timestamp":"..."}` 说明服务器正常运行。

## 当前状态

根据错误信息，后端服务器正在尝试连接：
- PostgreSQL: localhost:5432 ❌ 未运行
- Redis: localhost:6379 ⚠️ 可选（如果未运行会降级）

## 推荐步骤

1. **最快的方式**：使用 Docker
   ```bash
   docker-compose up -d
   cd server
   npm run dev
   ```

2. **如果没有 Docker**：启动本地 PostgreSQL 服务

3. **临时测试前端**：使用上面的模拟数据方法

## 需要帮助？

如果 PostgreSQL 安装有问题，可以：
1. 下载 PostgreSQL: https://www.postgresql.org/download/
2. 或使用 Docker Desktop: https://www.docker.com/products/docker-desktop/
3. 或使用在线 PostgreSQL 服务（如 ElephantSQL）

## 下一步

服务器启动成功后：
1. 访问 http://localhost:5173（前端）
2. 注册新账户
3. 开始使用应用
