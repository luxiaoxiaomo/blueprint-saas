# 🚀 立即部署指南

**更新时间**: 2026-02-01  
**预计时间**: 15 分钟  
**推荐平台**: Railway.app

---

## ✅ 部署前检查清单

- [ ] 代码已推送到 GitHub
- [ ] 已注册 Railway 账号
- [ ] 已准备好 Gemini API Key（可选）
- [ ] 已阅读本指南

---

## 🎯 方案选择

### 推荐：Railway.app（最简单）

**为什么选择 Railway？**
- ✅ 完全免费（每月 $5 额度）
- ✅ 一键部署，零配置
- ✅ 自动提供 PostgreSQL 数据库
- ✅ 自动 HTTPS 和域名
- ✅ 支持 Docker
- ✅ 自动部署（推送代码即部署）

---

## 📝 详细步骤

### 第一步：准备 GitHub 仓库

#### 1.1 如果还没有推送代码到 GitHub

```bash
# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Ready for deployment"

# 创建 GitHub 仓库（访问 https://github.com/new）
# 然后添加远程仓库
git remote add origin https://github.com/你的用户名/blueprint-saas.git

# 推送代码
git branch -M main
git push -u origin main
```

#### 1.2 如果已有 GitHub 仓库

```bash
# 确保代码是最新的
git add .
git commit -m "Ready for deployment"
git push
```

---

### 第二步：注册 Railway 账号

1. 访问：https://railway.app/
2. 点击右上角 **"Login"**
3. 选择 **"Login with GitHub"**
4. 授权 Railway 访问你的 GitHub

---

### 第三步：创建 Railway 项目

#### 3.1 创建新项目
1. 登录后点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 选择你的 `blueprint-saas` 仓库

#### 3.2 添加 PostgreSQL 数据库
1. 在项目页面点击 **"New"**
2. 选择 **"Database"**
3. 选择 **"Add PostgreSQL"**
4. 等待数据库创建完成（约 30 秒）

---

### 第四步：配置后端服务

#### 4.1 Railway 会自动检测到 server 目录

如果没有自动创建后端服务：
1. 点击 **"New"**
2. 选择 **"GitHub Repo"**
3. 选择 `blueprint-saas` 仓库
4. 在 **"Root Directory"** 中输入 `server`

#### 4.2 配置环境变量

点击后端服务 → **"Variables"** → 添加以下变量：

```bash
# 数据库配置（使用 Railway 的引用）
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}

# JWT 密钥（生成一个随机字符串）
JWT_SECRET=请替换为随机字符串

# Node 环境
NODE_ENV=production

# 端口
PORT=5000

# Redis（可选，暂时不配置）
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
REDIS_DB=0
```

**生成 JWT_SECRET**：
```bash
# 在本地终端运行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4.3 生成后端域名
1. 在后端服务中，切换到 **"Settings"**
2. 找到 **"Networking"** → **"Public Networking"**
3. 点击 **"Generate Domain"**
4. 会生成类似：`blueprint-backend-production.up.railway.app`
5. **复制这个地址**，前端需要用到

---

### 第五步：配置前端服务

#### 5.1 添加前端服务
1. 点击 **"New"**
2. 选择 **"GitHub Repo"**
3. 选择 `blueprint-saas` 仓库
4. **Root Directory** 留空（使用根目录）

#### 5.2 配置环境变量

点击前端服务 → **"Variables"** → 添加：

```bash
# API 地址（使用上一步的后端地址）
VITE_API_URL=https://你的后端地址.railway.app/api

# Gemini API Key（可选）
GEMINI_API_KEY=你的Gemini密钥
```

#### 5.3 配置构建设置

在前端服务的 **"Settings"** 中：

**Build Command**:
```bash
npm install && npm run build
```

**Start Command**:
```bash
npx serve -s dist -p $PORT
```

或者如果使用 Docker（Railway 会自动检测 Dockerfile）：
- 不需要配置，Railway 会自动使用 Dockerfile

#### 5.4 生成前端域名
1. 在前端服务的 **"Settings"** 中
2. 找到 **"Networking"** → **"Public Networking"**
3. 点击 **"Generate Domain"**
4. 会生成类似：`blueprint-frontend-production.up.railway.app`

#### 5.5 更新后端 CORS 配置
1. 回到后端服务的 **"Variables"**
2. 添加新变量：
```bash
CORS_ORIGIN=https://你的前端地址.railway.app
```

---

### 第六步：初始化数据库

#### 6.1 方法一：使用 Railway CLI（推荐）

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 连接到项目
railway link

# 运行数据库迁移
railway run npm run migrate
```

#### 6.2 方法二：在后端服务中配置

1. 在后端服务的 **"Settings"** 中
2. 找到 **"Deploy"** 部分
3. 在 **"Custom Start Command"** 中设置：
```bash
npm run migrate && npm start
```

这样每次部署都会自动运行迁移。

---

### 第七步：验证部署

#### 7.1 检查后端
```bash
# 访问后端健康检查
curl https://你的后端地址.railway.app/health
```

应该返回：
```json
{"status":"ok","timestamp":"2026-02-01T..."}
```

#### 7.2 检查前端
1. 访问前端地址：`https://你的前端地址.railway.app`
2. 应该能看到登录页面
3. 尝试注册新用户
4. 尝试登录

#### 7.3 查看日志
在 Railway 中：
1. 点击服务
2. 切换到 **"Deployments"** 标签
3. 点击最新的部署
4. 查看实时日志

---

## 🎉 完成！

恭喜！你的应用已经成功部署到 Railway。

**访问地址**：
- 前端：https://你的前端地址.railway.app
- 后端：https://你的后端地址.railway.app

---

## 🔧 常见问题

### Q1: 部署失败怎么办？

**检查步骤**：
1. 查看部署日志（Deployments 标签）
2. 确认环境变量是否正确
3. 检查数据库是否已创建
4. 确认 package.json 中的脚本是否正确

### Q2: 前端无法连接后端？

**解决方案**：
1. 确认 `VITE_API_URL` 是否正确（包含 `/api`）
2. 检查后端 `CORS_ORIGIN` 是否包含前端域名
3. 确认后端服务正在运行
4. 查看浏览器控制台的错误信息

### Q3: 数据库连接失败？

**解决方案**：
1. 确认 PostgreSQL 服务已启动（绿色 ✓）
2. 检查环境变量引用语法：`${{Postgres.PGHOST}}`
3. 查看后端日志中的具体错误

### Q4: 如何查看数据库内容？

**方法一：使用 Railway CLI**
```bash
railway connect postgres
```

**方法二：使用数据库工具**
1. 在 PostgreSQL 服务中复制 `DATABASE_URL`
2. 使用 pgAdmin、DBeaver 等工具连接

### Q5: 如何更新代码？

```bash
# 修改代码后
git add .
git commit -m "Update code"
git push

# Railway 会自动检测并重新部署
```

---

## 📊 监控和维护

### 查看资源使用
1. 在 Railway 项目页面点击 **"Usage"**
2. 可以看到：
   - CPU 使用率
   - 内存使用率
   - 网络流量
   - 免费额度剩余

### 重启服务
1. 点击服务
2. 点击右上角的 **"⋯"** 菜单
3. 选择 **"Restart"**

### 查看日志
1. 点击服务
2. 切换到 **"Deployments"**
3. 点击部署查看实时日志

---

## 🚀 下一步

部署完成后，你可以：

1. **配置自定义域名**
   - 在服务的 Settings 中添加自定义域名
   - 配置 DNS CNAME 记录

2. **设置环境变量**
   - 添加 Gemini API Key 启用 AI 功能
   - 配置 SMTP 启用邮件通知

3. **备份数据**
   ```bash
   railway run pg_dump > backup.sql
   ```

4. **监控应用**
   - 定期查看 Usage 页面
   - 设置告警通知

5. **优化性能**
   - 启用 Redis 缓存
   - 优化数据库查询
   - 配置 CDN

---

## 📚 相关资源

- Railway 官方文档：https://docs.railway.app/
- 项目文档：查看 `docs/` 目录
- 部署教程：`部署教程-Railway.md`
- 免费方案对比：`免费部署方案.md`

---

## 💡 提示

1. **免费额度**：Railway 每月提供 $5 免费额度，足够小型应用使用
2. **自动部署**：每次推送代码到 GitHub 都会自动部署
3. **环境变量**：使用 `${{Postgres.XXX}}` 引用数据库变量
4. **日志查看**：在 Deployments 标签中查看实时日志
5. **域名配置**：可以免费使用 `.railway.app` 域名

---

**祝你部署顺利！** 🎉

如有问题，请查看常见问题部分或查阅详细文档。
