# 部署指南

## 概述

本指南介绍如何将蓝图 AI 系统架构梳理工具部署到生产环境。

## 部署架构

```
┌─────────────┐
│   用户      │
└──────┬──────┘
       │
┌──────▼──────┐
│   Nginx     │ (反向代理 + 静态文件)
└──────┬──────┘
       │
┌──────▼──────┐
│  Node.js    │ (Express 服务器)
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │ (主数据库)
└─────────────┘
       │
┌──────▼──────┐
│   Redis     │ (缓存，可选)
└─────────────┘
```

## 环境要求

### 硬件要求

**最小配置**:
- CPU: 2 核
- 内存: 4GB
- 磁盘: 20GB SSD

**推荐配置**:
- CPU: 4 核
- 内存: 8GB
- 磁盘: 50GB SSD

### 软件要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: v18.0.0+
- **PostgreSQL**: v14.0+
- **Redis**: v6.0+ (可选)
- **Nginx**: v1.18+
- **PM2**: v5.0+ (进程管理)

## 部署方式

### 方式 1: Docker 部署（推荐）

#### 1. 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. 配置环境变量

创建 `.env.production` 文件：

```env
# 数据库配置
DATABASE_URL=postgresql://blueprint:your_secure_password@postgres:5432/blueprint_ai
DB_HOST=postgres
DB_PORT=5432
DB_NAME=blueprint_ai
DB_USER=blueprint
DB_PASSWORD=your_secure_password

# JWT 配置
JWT_SECRET=your-very-secure-secret-key-change-this

# 服务器配置
PORT=5000
NODE_ENV=production

# Redis 配置
REDIS_URL=redis://redis:6379
ENABLE_REDIS=true

# Gemini API（可选）
GEMINI_API_KEY=your-gemini-api-key
```

#### 3. 构建和启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 4. 初始化数据库

```bash
# 进入容器
docker-compose exec server sh

# 运行数据库初始化
npm run db:setup

# 退出容器
exit
```

#### 5. 验证部署

```bash
# 检查服务状态
docker-compose ps

# 测试 API
curl http://localhost:5000/api/health
```

### 方式 2: 传统部署

#### 1. 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安装 Redis（可选）
sudo apt install -y redis-server

# 安装 Nginx
sudo apt install -y nginx

# 安装 PM2
sudo npm install -g pm2
```

#### 2. 配置 PostgreSQL

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE blueprint_ai;
CREATE USER blueprint WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE blueprint_ai TO blueprint;
\q
```

#### 3. 配置应用

```bash
# 克隆代码
git clone <repository-url> /var/www/blueprint-ai
cd /var/www/blueprint-ai

# 安装依赖
npm install
cd server
npm install
cd ..

# 配置环境变量
cp .env.example .env.production
nano .env.production
```

编辑 `.env.production`：

```env
DATABASE_URL=postgresql://blueprint:your_secure_password@localhost:5432/blueprint_ai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blueprint_ai
DB_USER=blueprint
DB_PASSWORD=your_secure_password

JWT_SECRET=your-very-secure-secret-key-change-this
PORT=5000
NODE_ENV=production

REDIS_URL=redis://localhost:6379
ENABLE_REDIS=true
```

#### 4. 构建应用

```bash
# 构建前端
npm run build

# 构建后端
cd server
npm run build
cd ..
```

#### 5. 初始化数据库

```bash
cd server
npm run db:setup
cd ..
```

#### 6. 配置 PM2

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'blueprint-ai',
    script: './server/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
};
```

启动应用：

```bash
# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs blueprint-ai
```

#### 7. 配置 Nginx

创建 `/etc/nginx/sites-available/blueprint-ai`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/blueprint-ai/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 日志
    access_log /var/log/nginx/blueprint-ai-access.log;
    error_log /var/log/nginx/blueprint-ai-error.log;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

启用站点：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/blueprint-ai /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 8. 配置 SSL（推荐）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

Nginx 配置会自动更新为 HTTPS。

## 环境配置

### 生产环境变量

```env
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=blueprint_ai
DB_USER=blueprint
DB_PASSWORD=strong-password-here

# JWT（必须修改）
JWT_SECRET=use-a-very-long-random-string-here

# 服务器
PORT=5000
NODE_ENV=production

# Redis
REDIS_URL=redis://your-redis-host:6379
ENABLE_REDIS=true

# 日志
LOG_LEVEL=info
LOG_FILE=/var/log/blueprint-ai/app.log

# 性能
CACHE_TTL=300
MAX_CACHE_SIZE=10000
BATCH_DELAY=10
MAX_BATCH_SIZE=100

# 安全
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# 可选功能
GEMINI_API_KEY=your-api-key
ENABLE_ANALYTICS=true
```

### 数据库优化

编辑 PostgreSQL 配置 `/etc/postgresql/14/main/postgresql.conf`：

```conf
# 内存设置（根据服务器内存调整）
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB

# 连接设置
max_connections = 100

# 性能设置
random_page_cost = 1.1
effective_io_concurrency = 200

# 日志设置
logging_collector = on
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_min_duration_statement = 1000
```

重启 PostgreSQL：

```bash
sudo systemctl restart postgresql
```

### Redis 优化

编辑 Redis 配置 `/etc/redis/redis.conf`：

```conf
# 内存限制
maxmemory 512mb
maxmemory-policy allkeys-lru

# 持久化（可选）
save 900 1
save 300 10
save 60 10000

# 日志
loglevel notice
logfile /var/log/redis/redis-server.log
```

重启 Redis：

```bash
sudo systemctl restart redis
```

## 监控和维护

### 1. 应用监控

使用 PM2 监控：

```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 show blueprint-ai

# 查看日志
pm2 logs blueprint-ai --lines 100
```

### 2. 数据库监控

```bash
# 连接到数据库
sudo -u postgres psql blueprint_ai

# 查看活动连接
SELECT * FROM pg_stat_activity;

# 查看数据库大小
SELECT pg_size_pretty(pg_database_size('blueprint_ai'));

# 查看表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. 性能监控

在应用中查看性能指标：

```bash
# 通过 API 获取性能报告
curl http://localhost:5000/api/performance/report

# 查看缓存统计
curl http://localhost:5000/api/cache/stats
```

### 4. 日志管理

```bash
# 查看应用日志
pm2 logs blueprint-ai

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/blueprint-ai-access.log
sudo tail -f /var/log/nginx/blueprint-ai-error.log

# 查看系统日志
sudo journalctl -u blueprint-ai -f
```

### 5. 备份策略

#### 数据库备份

创建备份脚本 `/usr/local/bin/backup-blueprint.sh`：

```bash
#!/bin/bash

# 配置
BACKUP_DIR="/var/backups/blueprint-ai"
DB_NAME="blueprint_ai"
DB_USER="blueprint"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/blueprint_ai_$DATE.sql.gz"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
PGPASSWORD="your_password" pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_FILE"
```

设置定时任务：

```bash
# 添加执行权限
sudo chmod +x /usr/local/bin/backup-blueprint.sh

# 编辑 crontab
sudo crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * /usr/local/bin/backup-blueprint.sh >> /var/log/blueprint-backup.log 2>&1
```

#### 恢复备份

```bash
# 解压备份
gunzip blueprint_ai_20240118_020000.sql.gz

# 恢复数据库
PGPASSWORD="your_password" psql -U blueprint -h localhost blueprint_ai < blueprint_ai_20240118_020000.sql
```

### 6. 更新部署

```bash
# 拉取最新代码
cd /var/www/blueprint-ai
git pull origin main

# 安装依赖
npm install
cd server
npm install
cd ..

# 构建
npm run build
cd server
npm run build
cd ..

# 重启应用
pm2 restart blueprint-ai

# 查看状态
pm2 status
```

## 安全加固

### 1. 防火墙配置

```bash
# 安装 UFW
sudo apt install -y ufw

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2. 数据库安全

```bash
# 编辑 PostgreSQL 配置
sudo nano /etc/postgresql/14/main/pg_hba.conf

# 只允许本地连接
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 3. 应用安全

- 使用强 JWT 密钥（至少 32 个字符）
- 启用 HTTPS
- 配置 CORS 白名单
- 启用速率限制
- 定期更新依赖

### 4. 系统安全

```bash
# 自动安全更新
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 配置 fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 故障排查

### 应用无法启动

```bash
# 查看 PM2 日志
pm2 logs blueprint-ai --err

# 检查端口占用
sudo netstat -tlnp | grep 5000

# 检查环境变量
pm2 env 0
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -U blueprint -h localhost -d blueprint_ai

# 查看 PostgreSQL 日志
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 性能问题

```bash
# 查看系统资源
htop

# 查看数据库性能
sudo -u postgres psql blueprint_ai
SELECT * FROM pg_stat_activity WHERE state = 'active';

# 查看慢查询
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Nginx 错误

```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重启 Nginx
sudo systemctl restart nginx
```

## 扩展部署

### 负载均衡

使用 Nginx 配置多个后端实例：

```nginx
upstream backend {
    least_conn;
    server localhost:5000;
    server localhost:5001;
    server localhost:5002;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

启动多个实例：

```bash
# 使用 PM2 集群模式
pm2 start ecosystem.config.js --env production -i max
```

### 数据库主从复制

配置 PostgreSQL 主从复制以提高读性能和可用性。

### CDN 集成

将静态资源部署到 CDN：

```bash
# 上传到 CDN
aws s3 sync ./dist s3://your-bucket/blueprint-ai/

# 配置 CloudFront
# ...
```

## 成本估算

### 小型部署（< 100 用户）

- VPS: $10-20/月（2 核 4GB）
- 数据库: 包含在 VPS 中
- 域名: $10-15/年
- SSL: 免费（Let's Encrypt）
- **总计**: ~$15/月

### 中型部署（100-1000 用户）

- VPS: $40-60/月（4 核 8GB）
- 托管数据库: $20-40/月
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

## 检查清单

部署前检查：

- [ ] 环境变量已配置
- [ ] JWT 密钥已修改
- [ ] 数据库已创建和初始化
- [ ] SSL 证书已配置
- [ ] 防火墙已配置
- [ ] 备份策略已设置
- [ ] 监控已配置
- [ ] 日志已配置
- [ ] 性能测试已完成
- [ ] 安全审计已完成

## 支持

如有问题，请联系：
- Email: support@example.com
- GitHub: https://github.com/your-repo/issues
- 文档: https://docs.your-domain.com

---

**最后更新**: 2026-01-18
