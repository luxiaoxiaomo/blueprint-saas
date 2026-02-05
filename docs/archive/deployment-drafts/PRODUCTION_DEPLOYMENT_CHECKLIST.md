# 公网部署完整清单

**项目**: 蓝图 AI 系统架构梳理工具  
**版本**: Phase 1  
**部署日期**: 2026-01-28

---

## 📋 部署前准备

### 1. 基础设施准备

- [ ] **选择云服务商**
  - [ ] 阿里云 ECS
  - [ ] 腾讯云 CVM
  - [ ] AWS EC2
  - [ ] DigitalOcean
  - [ ] Linode
  - [ ] 其他: ___________

- [ ] **购买服务器**
  - [ ] CPU: 至少 2 核（推荐 4 核）
  - [ ] 内存: 至少 4GB（推荐 8GB）
  - [ ] 磁盘: 至少 20GB SSD（推荐 50GB）
  - [ ] 带宽: 至少 5Mbps（推荐 10Mbps）
  - [ ] 操作系统: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

- [ ] **购买域名**
  - [ ] 域名已注册
  - [ ] DNS 已配置
  - [ ] 域名解析已生效

- [ ] **获取 SSL 证书**
  - [ ] 使用 Let's Encrypt（免费）
  - [ ] 或购买商业证书

### 2. 代码准备

- [ ] **代码审查**
  - [ ] 所有代码已审查
  - [ ] 没有调试代码
  - [ ] 没有硬编码密钥

- [ ] **依赖检查**
  - [ ] 运行 `npm audit` 检查安全漏洞
  - [ ] 更新所有依赖到最新版本
  - [ ] 移除未使用的依赖

- [ ] **编译测试**
  - [ ] 前端编译成功: `npm run build`
  - [ ] 后端编译成功: `cd server && npm run build`
  - [ ] 没有编译错误或警告

- [ ] **测试覆盖**
  - [ ] 运行所有测试: `npm run test`
  - [ ] 运行集成测试: `npm run test:isolation`
  - [ ] 所有测试通过

### 3. 环境配置

- [ ] **生产环境变量**
  - [ ] 创建 `.env.production` 文件
  - [ ] 修改所有敏感信息
  - [ ] JWT_SECRET 已更改（至少 32 个字符）
  - [ ] 数据库密码已更改
  - [ ] API 密钥已配置

- [ ] **数据库配置**
  - [ ] 数据库名称已确定
  - [ ] 数据库用户已创建
  - [ ] 数据库密码已设置（强密码）
  - [ ] 数据库备份策略已规划

- [ ] **Redis 配置**
  - [ ] Redis 密码已设置（如果需要）
  - [ ] Redis 持久化已配置
  - [ ] Redis 内存限制已设置

### 4. 安全检查

- [ ] **代码安全**
  - [ ] 没有 SQL 注入漏洞
  - [ ] 没有 XSS 漏洞
  - [ ] 没有 CSRF 漏洞
  - [ ] 认证和授权正确实现

- [ ] **数据安全**
  - [ ] 敏感数据已加密
  - [ ] 密码已哈希处理
  - [ ] API 密钥已保护
  - [ ] 备份已加密

- [ ] **网络安全**
  - [ ] HTTPS 已启用
  - [ ] CORS 已配置
  - [ ] 速率限制已启用
  - [ ] 防火墙已配置

---

## 🚀 部署步骤

### 第 1 步: 服务器初始化

```bash
# 1. 连接到服务器
ssh root@your-server-ip

# 2. 更新系统
sudo apt update && sudo apt upgrade -y

# 3. 安装基础工具
sudo apt install -y curl wget git vim htop

# 4. 配置时区
sudo timedatectl set-timezone Asia/Shanghai

# 5. 配置 Swap（可选，但推荐）
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

- [ ] 服务器已初始化

### 第 2 步: 安装 Docker 和 Docker Compose

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. 添加当前用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 3. 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. 验证安装
docker --version
docker-compose --version
```

- [ ] Docker 已安装
- [ ] Docker Compose 已安装

### 第 3 步: 克隆代码并配置

```bash
# 1. 克隆代码
cd /opt
sudo git clone <your-repo-url> blueprint-ai
cd blueprint-ai

# 2. 创建生产环境文件
sudo cp .env.example .env.production
sudo nano .env.production

# 3. 修改关键配置
# - DB_PASSWORD: 修改为强密码
# - JWT_SECRET: 生成新的密钥
# - FRONTEND_URL: 设置为你的域名
# - API_URL: 设置为你的 API 地址
```

- [ ] 代码已克隆
- [ ] 环境变量已配置

### 第 4 步: 构建 Docker 镜像

```bash
# 1. 构建前端镜像
docker build -t blueprint-frontend:latest \
  --build-arg VITE_API_URL=https://api.your-domain.com/api \
  .

# 2. 构建后端镜像
cd server
docker build -t blueprint-backend:latest .
cd ..

# 3. 验证镜像
docker images | grep blueprint
```

- [ ] 前端镜像已构建
- [ ] 后端镜像已构建

### 第 5 步: 启动容器

```bash
# 1. 启动所有服务
docker-compose -f docker-compose.yml up -d

# 2. 查看容器状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f

# 4. 初始化数据库
docker-compose exec server npm run db:setup
```

- [ ] PostgreSQL 容器已启动
- [ ] Redis 容器已启动
- [ ] 后端容器已启动
- [ ] 前端容器已启动
- [ ] 数据库已初始化

### 第 6 步: 配置 Nginx 反向代理

```bash
# 1. 创建 Nginx 配置
sudo nano /etc/nginx/sites-available/blueprint-ai

# 2. 添加以下配置
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书（稍后配置）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}

# 3. 启用站点
sudo ln -s /etc/nginx/sites-available/blueprint-ai /etc/nginx/sites-enabled/

# 4. 测试配置
sudo nginx -t

# 5. 重启 Nginx
sudo systemctl restart nginx
```

- [ ] Nginx 已配置
- [ ] 反向代理已启用

### 第 7 步: 配置 SSL 证书

```bash
# 1. 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 2. 获取证书
sudo certbot --nginx -d your-domain.com

# 3. 验证证书
sudo certbot certificates

# 4. 测试自动续期
sudo certbot renew --dry-run
```

- [ ] SSL 证书已获取
- [ ] HTTPS 已启用
- [ ] 自动续期已配置

### 第 8 步: 配置防火墙

```bash
# 1. 安装 UFW
sudo apt install -y ufw

# 2. 配置规则
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS

# 3. 启用防火墙
sudo ufw enable

# 4. 查看状态
sudo ufw status
```

- [ ] 防火墙已配置
- [ ] 必要端口已开放

### 第 9 步: 配置监控和日志

```bash
# 1. 创建日志目录
sudo mkdir -p /var/log/blueprint-ai
sudo chown -R $USER:$USER /var/log/blueprint-ai

# 2. 配置日志轮转
sudo nano /etc/logrotate.d/blueprint-ai

# 添加以下内容
/var/log/blueprint-ai/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}

# 3. 设置监控告警（可选）
# 使用 Prometheus + Grafana 或其他监控工具
```

- [ ] 日志已配置
- [ ] 日志轮转已设置

### 第 10 步: 配置备份

```bash
# 1. 创建备份脚本
sudo nano /usr/local/bin/backup-blueprint.sh

#!/bin/bash
BACKUP_DIR="/var/backups/blueprint-ai"
DB_NAME="blueprint_saas"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/db_$DATE.sql.gz"

# 2. 添加执行权限
sudo chmod +x /usr/local/bin/backup-blueprint.sh

# 3. 设置定时任务
sudo crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * /usr/local/bin/backup-blueprint.sh >> /var/log/blueprint-backup.log 2>&1
```

- [ ] 备份脚本已创建
- [ ] 定时备份已配置

---

## ✅ 部署验证

### 功能测试

- [ ] **前端访问**
  ```bash
  curl -I https://your-domain.com
  # 应该返回 200 OK
  ```

- [ ] **API 健康检查**
  ```bash
  curl https://your-domain.com/api/health
  # 应该返回 200 OK
  ```

- [ ] **登录功能**
  - [ ] 可以访问登录页面
  - [ ] 可以创建账户
  - [ ] 可以登录

- [ ] **核心功能**
  - [ ] 可以创建项目
  - [ ] 可以创建模块
  - [ ] 可以创建实体
  - [ ] 可以配置关系

### 性能测试

- [ ] **响应时间**
  ```bash
  # 测试 API 响应时间
  time curl https://your-domain.com/api/projects
  # 应该在 200ms 以内
  ```

- [ ] **并发测试**
  ```bash
  # 使用 Apache Bench 测试
  ab -n 1000 -c 10 https://your-domain.com/
  ```

- [ ] **数据库性能**
  - [ ] 查询响应时间正常
  - [ ] 没有慢查询
  - [ ] 连接池正常

### 安全测试

- [ ] **SSL/TLS**
  ```bash
  # 检查 SSL 配置
  openssl s_client -connect your-domain.com:443
  ```

- [ ] **安全头**
  ```bash
  curl -I https://your-domain.com
  # 检查 Security-related headers
  ```

- [ ] **CORS 配置**
  - [ ] 只允许必要的来源
  - [ ] 没有通配符 (*)

---

## 📊 部署后监控

### 日常检查

- [ ] **每天**
  - [ ] 检查应用日志
  - [ ] 检查错误率
  - [ ] 检查服务器资源使用

- [ ] **每周**
  - [ ] 检查备份完整性
  - [ ] 检查数据库大小
  - [ ] 检查磁盘空间

- [ ] **每月**
  - [ ] 检查安全更新
  - [ ] 检查性能指标
  - [ ] 检查成本

### 监控命令

```bash
# 查看容器状态
docker-compose ps

# 查看容器日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 查看系统资源
docker stats

# 查看数据库大小
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "SELECT pg_size_pretty(pg_database_size('blueprint_saas'));"

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

---

## 🔧 常见问题

### 问题 1: 容器无法启动

**症状**: `docker-compose up` 失败

**解决方案**:
```bash
# 查看详细错误
docker-compose logs backend

# 检查环境变量
docker-compose config

# 重建镜像
docker-compose build --no-cache
```

### 问题 2: 数据库连接失败

**症状**: 后端无法连接数据库

**解决方案**:
```bash
# 检查数据库容器
docker-compose ps postgres

# 检查数据库日志
docker-compose logs postgres

# 测试连接
docker-compose exec postgres psql -U postgres -c "SELECT 1;"
```

### 问题 3: SSL 证书错误

**症状**: HTTPS 连接失败

**解决方案**:
```bash
# 检查证书
sudo certbot certificates

# 续期证书
sudo certbot renew

# 检查 Nginx 配置
sudo nginx -t
```

### 问题 4: 性能缓慢

**症状**: 应用响应缓慢

**解决方案**:
```bash
# 检查资源使用
docker stats

# 查看慢查询
docker-compose exec postgres psql -U postgres -d blueprint_saas -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 增加资源
# 编辑 docker-compose.yml 中的资源限制
```

---

## 📈 扩展和优化

### 性能优化

- [ ] **启用 Redis 缓存**
  - [ ] 配置 Redis 连接
  - [ ] 启用查询缓存
  - [ ] 启用会话缓存

- [ ] **数据库优化**
  - [ ] 添加索引
  - [ ] 优化查询
  - [ ] 启用连接池

- [ ] **前端优化**
  - [ ] 启用 Gzip 压缩
  - [ ] 启用浏览器缓存
  - [ ] 使用 CDN

### 高可用性

- [ ] **数据库主从复制**
  - [ ] 配置主从复制
  - [ ] 配置自动故障转移

- [ ] **应用负载均衡**
  - [ ] 启动多个后端实例
  - [ ] 配置负载均衡器

- [ ] **CDN 集成**
  - [ ] 上传静态资源到 CDN
  - [ ] 配置 CDN 缓存

---

## 📞 支持和帮助

### 获取帮助

- 查看 `server/DEPLOYMENT_GUIDE.md` 了解详细部署信息
- 查看 `server/DEVELOPMENT_GUIDE.md` 了解开发信息
- 查看 `server/API_DOCUMENTATION.md` 了解 API 文档

### 紧急联系

- 技术支持: support@your-domain.com
- GitHub Issues: https://github.com/your-repo/issues

---

## ✨ 部署完成

恭喜！你已经成功部署了蓝图 AI 系统。

**下一步**:
1. 邀请用户
2. 收集反馈
3. 计划 Phase 2 功能
4. 持续监控和优化

---

**部署日期**: ___________  
**部署人员**: ___________  
**备注**: ___________

