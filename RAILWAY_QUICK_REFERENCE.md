# 🚂 Railway 部署快速参考

**一页纸搞定部署** | 打印或保存此页面

---

## 🔗 重要链接

| 服务 | 地址 |
|------|------|
| Railway 控制台 | https://railway.app/dashboard |
| GitHub | https://github.com |
| Railway 文档 | https://docs.railway.app |

---

## 📋 部署步骤（5 分钟）

### 1. 推送代码到 GitHub
```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

### 2. 在 Railway 创建项目
1. 访问 https://railway.app/dashboard
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 选择你的仓库

### 3. 添加 PostgreSQL
1. 点击 **"New"** → **"Database"** → **"PostgreSQL"**
2. 等待创建完成（30 秒）

### 4. 配置后端（server 目录）
**环境变量**：
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=<生成随机字符串>
NODE_ENV=production
PORT=5000
```

**生成 JWT_SECRET**：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**生成域名**：Settings → Generate Domain

### 5. 配置前端（根目录）
**环境变量**：
```bash
VITE_API_URL=https://<后端地址>.railway.app/api
```

**生成域名**：Settings → Generate Domain

### 6. 更新后端 CORS
在后端服务添加：
```bash
CORS_ORIGIN=https://<前端地址>.railway.app
```

---

## 🧪 验证部署

### 后端健康检查
```bash
curl https://<后端地址>.railway.app/health
```
应返回：`{"status":"ok"}`

### 前端访问
访问：`https://<前端地址>.railway.app`

---

## 🔧 常用命令

### Railway CLI
```bash
# 安装
npm install -g @railway/cli

# 登录
railway login

# 连接项目
railway link

# 查看日志
railway logs

# 连接数据库
railway connect postgres

# 运行命令
railway run <command>
```

### 数据库操作
```bash
# 连接数据库
railway connect postgres

# 查看表
\dt

# 退出
\q
```

---

## 📊 环境变量速查表

### 后端必需变量
| 变量名 | 值 | 说明 |
|--------|-----|------|
| DATABASE_URL | ${{Postgres.DATABASE_URL}} | 数据库连接 |
| JWT_SECRET | 随机字符串 | JWT 密钥 |
| NODE_ENV | production | 环境 |
| PORT | 5000 | 端口 |

### 前端必需变量
| 变量名 | 值 | 说明 |
|--------|-----|------|
| VITE_API_URL | https://后端地址/api | API 地址 |

### 可选变量
| 变量名 | 说明 |
|--------|------|
| GEMINI_API_KEY | AI 功能 |
| REDIS_HOST | 缓存 |
| SMTP_HOST | 邮件 |

---

## ⚠️ 常见问题

### 问题：部署失败
**解决**：查看 Deployments 标签的日志

### 问题：前端无法连接后端
**检查**：
1. VITE_API_URL 是否正确（包含 /api）
2. 后端 CORS_ORIGIN 是否包含前端域名
3. 后端服务是否运行

### 问题：数据库连接失败
**检查**：
1. PostgreSQL 服务是否启动
2. 环境变量引用语法是否正确
3. 查看后端日志

---

## 💡 最佳实践

### 1. 环境变量引用
✅ 正确：`DATABASE_URL=${{Postgres.DATABASE_URL}}`  
❌ 错误：`DATABASE_URL=postgresql://...`

### 2. 域名配置
- 后端先生成域名
- 前端使用后端域名配置 VITE_API_URL
- 后端使用前端域名配置 CORS_ORIGIN

### 3. 日志查看
- Deployments 标签查看构建日志
- 实时日志查看运行状态
- 错误信息帮助调试

### 4. 数据库迁移
```bash
# 方法 1：Railway CLI
railway run npm run migrate

# 方法 2：自动迁移
# 在后端 Settings 中设置 Start Command:
npm run migrate && npm start
```

---

## 📱 部署信息记录

### 我的部署信息
```
前端地址：https://___________________________
后端地址：https://___________________________
JWT_SECRET：___________________________
部署日期：___________________________
```

---

## 🚀 部署后操作

- [ ] 测试注册登录
- [ ] 测试创建项目
- [ ] 配置自定义域名
- [ ] 设置监控告警
- [ ] 定期备份数据

---

## 📞 获取帮助

- 详细教程：`DEPLOY_NOW.md`
- 检查清单：`部署检查清单.md`
- Railway 文档：https://docs.railway.app
- Railway 社区：https://discord.gg/railway

---

**打印此页面，部署时随时查看！** 📄
