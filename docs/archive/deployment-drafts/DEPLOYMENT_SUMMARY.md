# 公网部署完整指南总结

**项目**: 蓝图 AI 系统架构梳理工具  
**版本**: Phase 1  
**部署日期**: 2026-01-28

---

## 🎯 部署概览

### 部署架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户浏览器                          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│                   Nginx 反向代理                         │
│              (SSL/TLS + 负载均衡)                       │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼──────────┐
│  前端应用      │      │   后端 API       │
│  (React)       │      │  (Node.js)       │
│  Port: 3000    │      │  Port: 5000      │
└────────────────┘      └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──┐  ┌──────▼──┐  ┌────▼────┐
            │PostgreSQL│  │  Redis  │  │  Logs   │
            │ Port:5432│  │ Port:6379  │         │
            └──────────┘  └─────────┘  └─────────┘
```

### 部署方式

**推荐**: Docker Compose（一键部署）

**优点**:
- ✅ 快速部署（< 10 分钟）
- ✅ 环境一致性
- ✅ 易于扩展
- ✅ 易于备份恢复

---

## 📋 部署前检查清单

### 基础设施

- [ ] 购买云服务器（2 核 4GB 内存）
- [ ] 购买域名
- [ ] 配置 DNS 解析
- [ ] 获取 SSL 证书（Let's Encrypt 免费）

### 代码准备

- [ ] 代码审查完成
- [ ] 安全漏洞检查: `npm audit`
- [ ] 编译测试: `npm run build`
- [ ] 测试通过: `npm run test`

### 环境配置

- [ ] 生成强密码（数据库）
- [ ] 生成 JWT 密钥: `openssl rand -base64 32`
- [ ] 准备 `.env.production` 文件

---

## 🚀 快速部署（5 分钟）

### 方式 1: 使用自动化脚本（推荐）

```bash
# 1. 连接到服务器
ssh root@your-server-ip

# 2. 下载部署脚本
wget https://your-repo/deploy.sh

# 3. 执行部署
bash deploy.sh your-domain.com your-db-password your-jwt-secret

# 4. 等待部署完成（约 5-10 分钟）

# 5. 访问应用
# 前端: https://your-domain.com
# API: https://your-domain.com/api
```

### 方式 2: 手动部署

```bash
# 1. 系统初始化
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git

# 2. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. 克隆代码
cd /opt
sudo git clone <your-repo-url> blueprint-ai
cd blueprint-ai

# 4. 配置环境
sudo cp .env.example .env.production
sudo nano .env.production
# 修改: DB_PASSWORD, JWT_SECRET, FRONTEND_URL

# 5. 构建镜像
docker build -t blueprint-frontend:latest --build-arg VITE_API_URL=https://your-domain.com/api .
cd server && docker build -t blueprint-backend:latest . && cd ..

# 6. 启动容器
docker-compose up -d

# 7. 配置 Nginx 和 SSL
# 参考 PRODUCTION_DEPLOYMENT_CHECKLIST.md
```

---

## 📊 部署后验证

### 功能测试

```bash
# 1. 前端访问
curl -I https://your-domain.com
# 应该返回 200 OK

# 2. API 健康检查
curl https://your-domain.com/api/health
# 应该返回 {"status":"ok"}

# 3. 登录测试
# 访问 https://your-domain.com
# 创建账户并登录

# 4. 核心功能测试
# - 创建项目
# - 创建模块
# - 创建实体
# - 配置关系
```

### 性能测试

```bash
# 1. 响应时间
time curl https://your-domain.com/api/projects
# 应该在 200ms 以内

# 2. 并发测试
ab -n 1000 -c 10 https://your-domain.com/
# 应该能处理并发请求

# 3. 数据库性能
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "SELECT count(*) FROM projects;"
# 应该快速返回
```

---

## 🔧 部署后配置

### 1. 配置备份

```bash
# 自动备份已配置，每天 2:00 AM 执行
# 备份位置: /var/backups/blueprint-ai/

# 查看备份
ls -lh /var/backups/blueprint-ai/

# 手动备份
docker-compose exec -T postgres pg_dump -U postgres blueprint_saas | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 2. 配置监控

```bash
# 创建监控脚本
sudo nano /usr/local/bin/monitor-blueprint.sh

# 设置定时监控（每 5 分钟）
*/5 * * * * /usr/local/bin/monitor-blueprint.sh
```

### 3. 配置日志

```bash
# 查看应用日志
docker-compose logs -f backend

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/blueprint-ai-access.log

# 查看系统日志
sudo journalctl -f
```

### 4. 配置告警

```bash
# 配置邮件告警
# 编辑 /usr/local/bin/monitor-blueprint.sh
# 设置 ALERT_EMAIL 和告警阈值
```

---

## 📈 常见部署问题

### 问题 1: 部署失败

**症状**: 脚本执行失败

**解决方案**:
```bash
# 1. 检查错误信息
bash deploy.sh ... 2>&1 | tee deploy.log

# 2. 查看详细日志
cat deploy.log

# 3. 手动执行失败的步骤
# 参考 PRODUCTION_DEPLOYMENT_CHECKLIST.md
```

### 问题 2: 应用无法访问

**症状**: 访问 https://your-domain.com 返回 502

**解决方案**:
```bash
# 1. 检查容器状态
docker-compose ps

# 2. 检查后端日志
docker-compose logs backend

# 3. 重启服务
docker-compose restart

# 4. 检查 Nginx 配置
sudo nginx -t
sudo systemctl restart nginx
```

### 问题 3: 数据库连接失败

**症状**: 后端日志显示数据库连接错误

**解决方案**:
```bash
# 1. 检查数据库容器
docker-compose ps postgres

# 2. 测试连接
docker-compose exec postgres psql -U postgres -c "SELECT 1;"

# 3. 检查环境变量
docker-compose config | grep DB_

# 4. 重启数据库
docker-compose restart postgres
```

---

## 🔐 安全建议

### 必做项

- [ ] 修改所有默认密码
- [ ] 启用 HTTPS（Let's Encrypt）
- [ ] 配置防火墙
- [ ] 启用备份
- [ ] 配置监控告警

### 推荐项

- [ ] 启用 2FA（双因素认证）
- [ ] 配置 VPN 访问
- [ ] 启用审计日志
- [ ] 定期安全更新
- [ ] 定期渗透测试

### 定期检查

- [ ] 每周: 检查安全更新
- [ ] 每月: 检查依赖漏洞
- [ ] 每季度: 安全审计

---

## 📞 获取帮助

### 文档

| 文档 | 用途 |
|------|------|
| `PRODUCTION_DEPLOYMENT_CHECKLIST.md` | 部署前检查清单 |
| `OPERATIONS_GUIDE.md` | 部署后运维指南 |
| `server/DEPLOYMENT_GUIDE.md` | 详细部署指南 |
| `server/API_DOCUMENTATION.md` | API 文档 |

### 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 启动服务
docker-compose up -d

# 进入容器
docker-compose exec backend sh

# 查看资源使用
docker stats
```

### 联系支持

- 技术支持: support@your-domain.com
- GitHub Issues: https://github.com/your-repo/issues
- 紧急联系: +86-xxx-xxxx-xxxx

---

## ✅ 部署完成检查清单

部署完成后，请确认以下项目：

- [ ] 前端可以访问: https://your-domain.com
- [ ] API 可以访问: https://your-domain.com/api
- [ ] 可以创建账户
- [ ] 可以登录
- [ ] 可以创建项目
- [ ] 可以创建模块
- [ ] 可以创建实体
- [ ] 可以配置关系
- [ ] 备份已配置
- [ ] 监控已配置
- [ ] 日志已配置
- [ ] SSL 证书有效
- [ ] 防火墙已配置

---

## 🎓 下一步

### 立即

1. ✅ 部署应用
2. ✅ 验证功能
3. ✅ 配置备份

### 短期（1-2 周）

1. 邀请用户
2. 收集反馈
3. 修复 bug
4. 优化性能

### 中期（1-3 个月）

1. 计划 Phase 2 功能
2. 实现用户反馈
3. 性能优化
4. 安全加固

### 长期（3-6 个月）

1. 实现 Phase 2 功能
2. 扩展到多个地区
3. 实现高可用性
4. 实现灾难恢复

---

## 📊 成本估算

### 小型部署（< 100 用户）

- 服务器: $10-20/月
- 域名: $10-15/年
- SSL: 免费
- **总计**: ~$15/月

### 中型部署（100-1000 用户）

- 服务器: $40-60/月
- 数据库: $20-40/月
- Redis: $10-20/月
- CDN: $5-10/月
- **总计**: ~$80/月

### 大型部署（> 1000 用户）

- 应用服务器: $100-200/月
- 数据库集群: $100-300/月
- Redis 集群: $50-100/月
- CDN: $20-50/月
- 负载均衡: $20-40/月
- **总计**: ~$350/月

---

## 🎉 恭喜！

你已经成功部署了蓝图 AI 系统！

**现在你可以**:
- ✅ 邀请用户使用
- ✅ 收集用户反馈
- ✅ 计划下一阶段功能
- ✅ 持续优化和改进

**记住**:
- 定期检查系统状态
- 定期备份数据
- 定期更新依赖
- 定期安全审计

---

**部署日期**: ___________  
**部署人员**: ___________  
**域名**: ___________  
**备注**: ___________

---

**最后更新**: 2026-01-28  
**版本**: 1.0.0

