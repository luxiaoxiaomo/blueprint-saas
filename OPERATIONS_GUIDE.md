# 公网部署后运维指南

**项目**: 蓝图 AI 系统架构梳理工具  
**版本**: Phase 1  
**最后更新**: 2026-01-28

---

## 📊 日常运维

### 每日检查清单

**早上检查** (每天 9:00)

```bash
# 1. 检查应用状态
docker-compose ps

# 2. 检查错误日志
docker-compose logs backend | grep -i error | tail -20

# 3. 检查系统资源
docker stats --no-stream

# 4. 检查磁盘空间
df -h

# 5. 检查数据库连接
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

**晚上检查** (每天 18:00)

```bash
# 1. 检查备份完成情况
ls -lh /var/backups/blueprint-ai/ | tail -5

# 2. 检查错误率
docker-compose logs backend | grep -i "error\|exception" | wc -l

# 3. 检查性能指标
docker-compose exec backend curl -s http://localhost:5000/api/health

# 4. 检查数据库大小
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "SELECT pg_size_pretty(pg_database_size('blueprint_saas'));"
```

### 常用命令

```bash
# 查看所有容器
docker-compose ps

# 查看容器日志
docker-compose logs -f backend          # 后端日志
docker-compose logs -f frontend         # 前端日志
docker-compose logs -f postgres         # 数据库日志

# 进入容器
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres

# 重启服务
docker-compose restart backend
docker-compose restart frontend
docker-compose restart postgres

# 停止和启动
docker-compose stop
docker-compose start
docker-compose down
docker-compose up -d

# 查看资源使用
docker stats

# 清理未使用的资源
docker system prune -a
```

---

## 🔍 监控和告警

### 关键指标

| 指标 | 正常范围 | 告警阈值 |
|------|---------|---------|
| CPU 使用率 | < 50% | > 80% |
| 内存使用率 | < 60% | > 85% |
| 磁盘使用率 | < 70% | > 90% |
| API 响应时间 | < 200ms | > 1000ms |
| 错误率 | < 0.1% | > 1% |
| 数据库连接数 | < 50 | > 100 |

### 监控脚本

创建 `/usr/local/bin/monitor-blueprint.sh`:

```bash
#!/bin/bash

# 蓝图 AI 监控脚本

ALERT_EMAIL="admin@your-domain.com"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=85
ALERT_THRESHOLD_DISK=90

# 检查 CPU 使用率
CPU_USAGE=$(docker stats --no-stream --format "{{.CPUPerc}}" | grep -oP '\d+' | head -1)
if [ "$CPU_USAGE" -gt "$ALERT_THRESHOLD_CPU" ]; then
    echo "警告: CPU 使用率过高 ($CPU_USAGE%)" | mail -s "蓝图 AI 告警" $ALERT_EMAIL
fi

# 检查内存使用率
MEM_USAGE=$(docker stats --no-stream --format "{{.MemPerc}}" | grep -oP '\d+' | head -1)
if [ "$MEM_USAGE" -gt "$ALERT_THRESHOLD_MEM" ]; then
    echo "警告: 内存使用率过高 ($MEM_USAGE%)" | mail -s "蓝图 AI 告警" $ALERT_EMAIL
fi

# 检查磁盘使用率
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | grep -oP '\d+')
if [ "$DISK_USAGE" -gt "$ALERT_THRESHOLD_DISK" ]; then
    echo "警告: 磁盘使用率过高 ($DISK_USAGE%)" | mail -s "蓝图 AI 告警" $ALERT_EMAIL
fi

# 检查应用健康状态
HEALTH=$(curl -s http://localhost:5000/api/health | grep -o '"status":"[^"]*"')
if [ "$HEALTH" != '"status":"ok"' ]; then
    echo "警告: 应用健康检查失败" | mail -s "蓝图 AI 告警" $ALERT_EMAIL
fi

# 检查数据库连接
DB_CONN=$(docker-compose exec -T postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;" | grep -oP '\d+' | tail -1)
if [ "$DB_CONN" -gt 100 ]; then
    echo "警告: 数据库连接数过多 ($DB_CONN)" | mail -s "蓝图 AI 告警" $ALERT_EMAIL
fi
```

设置定时监控:

```bash
# 每 5 分钟运行一次
*/5 * * * * /usr/local/bin/monitor-blueprint.sh
```

---

## 🔧 故障排查

### 问题 1: 应用无法访问

**症状**: 访问 https://your-domain.com 返回 502 Bad Gateway

**排查步骤**:

```bash
# 1. 检查 Nginx 状态
sudo systemctl status nginx

# 2. 检查 Nginx 日志
sudo tail -f /var/log/nginx/blueprint-ai-error.log

# 3. 检查后端容器
docker-compose ps backend

# 4. 检查后端日志
docker-compose logs backend

# 5. 检查后端是否监听 5000 端口
docker-compose exec backend netstat -tlnp | grep 5000

# 6. 重启 Nginx
sudo systemctl restart nginx

# 7. 重启后端
docker-compose restart backend
```

### 问题 2: 数据库连接失败

**症状**: 后端日志显示 "Cannot connect to database"

**排查步骤**:

```bash
# 1. 检查数据库容器
docker-compose ps postgres

# 2. 检查数据库日志
docker-compose logs postgres

# 3. 测试数据库连接
docker-compose exec postgres psql -U postgres -c "SELECT 1;"

# 4. 检查环境变量
docker-compose config | grep DB_

# 5. 检查数据库密码
# 确保 .env.production 中的密码正确

# 6. 重启数据库
docker-compose restart postgres

# 7. 重新初始化数据库
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS blueprint_saas; CREATE DATABASE blueprint_saas;"
```

### 问题 3: SSL 证书错误

**症状**: 浏览器显示 "Your connection is not private"

**排查步骤**:

```bash
# 1. 检查证书
sudo certbot certificates

# 2. 检查证书有效期
sudo openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -noout -dates

# 3. 检查 Nginx 配置
sudo nginx -t

# 4. 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 5. 手动续期证书
sudo certbot renew --force-renewal

# 6. 重启 Nginx
sudo systemctl restart nginx
```

### 问题 4: 性能缓慢

**症状**: 应用响应缓慢，API 请求超时

**排查步骤**:

```bash
# 1. 检查系统资源
docker stats

# 2. 检查数据库性能
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "
SELECT query, calls, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# 3. 检查慢查询日志
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "
SELECT * FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;"

# 4. 检查 Redis 缓存
docker-compose exec redis redis-cli INFO stats

# 5. 增加资源
# 编辑 docker-compose.yml，增加内存和 CPU 限制

# 6. 优化数据库
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "VACUUM ANALYZE;"
```

### 问题 5: 磁盘空间不足

**症状**: 磁盘使用率 > 90%

**排查步骤**:

```bash
# 1. 查看磁盘使用
df -h

# 2. 查看大文件
du -sh /* | sort -rh | head -10

# 3. 查看 Docker 使用的空间
docker system df

# 4. 清理 Docker 日志
docker-compose exec backend sh -c 'truncate -s 0 /var/log/app.log'

# 5. 清理旧备份
find /var/backups/blueprint-ai -name "*.sql.gz" -mtime +30 -delete

# 6. 清理 Docker 镜像
docker image prune -a

# 7. 清理 Docker 容器
docker container prune

# 8. 清理 Docker 卷
docker volume prune
```

---

## 📦 备份和恢复

### 备份策略

**备份频率**:
- 数据库: 每天 2:00 AM
- 配置文件: 每周一次
- 应用代码: 每次部署时

**备份位置**:
- 本地: `/var/backups/blueprint-ai/`
- 远程: 云存储（推荐）

### 手动备份

```bash
# 备份数据库
docker-compose exec -T postgres pg_dump -U postgres blueprint_saas | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 备份配置文件
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/blueprint-ai/.env.production

# 备份整个应用
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/blueprint-ai/
```

### 恢复备份

```bash
# 恢复数据库
gunzip < backup_20260128_020000.sql.gz | docker-compose exec -T postgres psql -U postgres blueprint_saas

# 恢复配置文件
tar -xzf config_backup_20260128_000000.tar.gz -C /

# 恢复整个应用
tar -xzf app_backup_20260128_000000.tar.gz -C /
```

### 远程备份（推荐）

```bash
# 上传到 AWS S3
aws s3 cp backup_20260128_020000.sql.gz s3://your-bucket/backups/

# 上传到阿里云 OSS
ossutil cp backup_20260128_020000.sql.gz oss://your-bucket/backups/

# 上传到腾讯云 COS
coscmd upload backup_20260128_020000.sql.gz /backups/
```

---

## 🔐 安全维护

### 定期安全检查

**每周**:
- [ ] 检查系统安全更新
- [ ] 检查依赖安全漏洞
- [ ] 检查访问日志异常

**每月**:
- [ ] 更新依赖包
- [ ] 检查 SSL 证书有效期
- [ ] 审计用户权限

**每季度**:
- [ ] 安全审计
- [ ] 渗透测试
- [ ] 灾难恢复演练

### 安全命令

```bash
# 检查系统更新
sudo apt list --upgradable

# 检查依赖漏洞
npm audit

# 检查 Docker 镜像漏洞
docker scan blueprint-backend:latest

# 查看访问日志
sudo tail -f /var/log/nginx/blueprint-ai-access.log

# 查看登录日志
sudo tail -f /var/log/auth.log

# 检查开放端口
sudo netstat -tlnp

# 检查防火墙规则
sudo ufw status
```

---

## 📈 性能优化

### 数据库优化

```bash
# 分析表
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "ANALYZE;"

# 清理表
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "VACUUM;"

# 重建索引
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "REINDEX DATABASE blueprint_saas;"

# 查看表大小
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Redis 优化

```bash
# 查看 Redis 统计
docker-compose exec redis redis-cli INFO stats

# 查看内存使用
docker-compose exec redis redis-cli INFO memory

# 清理过期键
docker-compose exec redis redis-cli FLUSHDB

# 查看键数量
docker-compose exec redis redis-cli DBSIZE
```

### 应用优化

```bash
# 启用 Gzip 压缩
# 已在 Nginx 配置中启用

# 启用浏览器缓存
# 已在 Nginx 配置中启用

# 启用 Redis 缓存
# 在 .env.production 中设置 ENABLE_REDIS=true

# 启用查询缓存
# 在应用中配置缓存策略
```

---

## 📝 日志管理

### 日志位置

```
/var/log/nginx/blueprint-ai-access.log    # Nginx 访问日志
/var/log/nginx/blueprint-ai-error.log     # Nginx 错误日志
/var/log/blueprint-backup.log             # 备份日志
/var/log/blueprint-ai/app.log             # 应用日志
```

### 日志查看

```bash
# 查看最新 100 行
tail -100 /var/log/nginx/blueprint-ai-access.log

# 实时查看
tail -f /var/log/nginx/blueprint-ai-access.log

# 搜索特定内容
grep "error" /var/log/nginx/blueprint-ai-error.log

# 统计请求数
wc -l /var/log/nginx/blueprint-ai-access.log

# 统计错误数
grep "error" /var/log/nginx/blueprint-ai-error.log | wc -l
```

### 日志轮转

日志轮转已在 `/etc/logrotate.d/blueprint-ai` 中配置，每天自动轮转。

---

## 🚀 更新和升级

### 更新应用

```bash
# 1. 拉取最新代码
cd /opt/blueprint-ai
git pull origin main

# 2. 构建新镜像
docker-compose build

# 3. 启动新容器
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 验证应用
curl https://your-domain.com/api/health
```

### 更新依赖

```bash
# 1. 检查更新
npm outdated

# 2. 更新依赖
npm update

# 3. 检查安全漏洞
npm audit

# 4. 修复漏洞
npm audit fix

# 5. 重新构建
docker-compose build

# 6. 重启应用
docker-compose restart
```

### 数据库迁移

```bash
# 1. 备份数据库
docker-compose exec -T postgres pg_dump -U postgres blueprint_saas | gzip > backup_before_migration.sql.gz

# 2. 运行迁移
docker-compose exec server npm run db:migrate

# 3. 验证迁移
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "SELECT * FROM information_schema.tables WHERE table_schema = 'public';"

# 4. 如果失败，恢复备份
gunzip < backup_before_migration.sql.gz | docker-compose exec -T postgres psql -U postgres blueprint_saas
```

---

## 📞 获取帮助

### 常见问题

- 查看 `PRODUCTION_DEPLOYMENT_CHECKLIST.md` 了解部署问题
- 查看 `server/DEPLOYMENT_GUIDE.md` 了解详细部署信息
- 查看 `server/API_DOCUMENTATION.md` 了解 API 文档

### 联系支持

- 技术支持: support@your-domain.com
- GitHub Issues: https://github.com/your-repo/issues
- 紧急联系: +86-xxx-xxxx-xxxx

---

## ✅ 运维检查清单

**每日**:
- [ ] 检查应用状态
- [ ] 检查错误日志
- [ ] 检查系统资源

**每周**:
- [ ] 检查备份完整性
- [ ] 检查安全更新
- [ ] 检查性能指标

**每月**:
- [ ] 更新依赖包
- [ ] 检查 SSL 证书
- [ ] 审计用户权限

**每季度**:
- [ ] 安全审计
- [ ] 灾难恢复演练
- [ ] 性能优化

---

**最后更新**: 2026-01-28  
**维护人员**: ___________  
**联系方式**: ___________

