#!/bin/bash

# 蓝图 AI 公网部署脚本
# 使用方法: bash deploy.sh <domain> <db_password> <jwt_secret>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 检查参数
if [ $# -lt 3 ]; then
    echo "使用方法: bash deploy.sh <domain> <db_password> <jwt_secret>"
    echo ""
    echo "示例:"
    echo "  bash deploy.sh example.com MySecurePassword123 $(openssl rand -base64 32)"
    exit 1
fi

DOMAIN=$1
DB_PASSWORD=$2
JWT_SECRET=$3

print_header "蓝图 AI 公网部署"
echo "域名: $DOMAIN"
echo "数据库密码: ****"
echo "JWT 密钥: ****"
echo ""

# 第 1 步: 系统初始化
print_header "第 1 步: 系统初始化"

echo "更新系统..."
sudo apt update && sudo apt upgrade -y
print_success "系统已更新"

echo "安装基础工具..."
sudo apt install -y curl wget git vim htop
print_success "基础工具已安装"

echo "配置时区..."
sudo timedatectl set-timezone Asia/Shanghai
print_success "时区已配置"

# 第 2 步: 安装 Docker
print_header "第 2 步: 安装 Docker"

if command -v docker &> /dev/null; then
    print_warning "Docker 已安装"
else
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    print_success "Docker 已安装"
fi

if command -v docker-compose &> /dev/null; then
    print_warning "Docker Compose 已安装"
else
    echo "安装 Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose 已安装"
fi

# 第 3 步: 克隆代码
print_header "第 3 步: 克隆代码"

if [ -d "/opt/blueprint-ai" ]; then
    print_warning "代码目录已存在，跳过克隆"
else
    echo "克隆代码..."
    cd /opt
    sudo git clone <your-repo-url> blueprint-ai
    cd blueprint-ai
    print_success "代码已克隆"
fi

cd /opt/blueprint-ai

# 第 4 步: 配置环境变量
print_header "第 4 步: 配置环境变量"

echo "创建 .env.production..."
sudo tee .env.production > /dev/null <<EOF
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=blueprint_saas
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT 配置
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=5000
NODE_ENV=production

# 前端地址
FRONTEND_URL=https://$DOMAIN
API_URL=https://$DOMAIN/api

# Gemini API Key（可选）
GEMINI_API_KEY=your_api_key_here
EOF

print_success "环境变量已配置"

# 第 5 步: 构建 Docker 镜像
print_header "第 5 步: 构建 Docker 镜像"

echo "构建前端镜像..."
docker build -t blueprint-frontend:latest \
  --build-arg VITE_API_URL=https://$DOMAIN/api \
  .
print_success "前端镜像已构建"

echo "构建后端镜像..."
cd server
docker build -t blueprint-backend:latest .
cd ..
print_success "后端镜像已构建"

# 第 6 步: 启动容器
print_header "第 6 步: 启动容器"

echo "启动所有服务..."
docker-compose up -d
print_success "容器已启动"

echo "等待服务启动..."
sleep 10

echo "初始化数据库..."
docker-compose exec -T server npm run db:setup || true
print_success "数据库已初始化"

# 第 7 步: 配置 Nginx
print_header "第 7 步: 配置 Nginx"

if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    sudo apt install -y nginx
    print_success "Nginx 已安装"
else
    print_warning "Nginx 已安装"
fi

echo "配置 Nginx..."
sudo tee /etc/nginx/sites-available/blueprint-ai > /dev/null <<'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;
    
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
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
    
    # 日志
    access_log /var/log/nginx/blueprint-ai-access.log;
    error_log /var/log/nginx/blueprint-ai-error.log;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
EOF

# 替换域名占位符
sudo sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/blueprint-ai

# 启用站点
sudo ln -sf /etc/nginx/sites-available/blueprint-ai /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t
print_success "Nginx 已配置"

# 重启 Nginx
sudo systemctl restart nginx
print_success "Nginx 已重启"

# 第 8 步: 配置 SSL
print_header "第 8 步: 配置 SSL 证书"

if ! command -v certbot &> /dev/null; then
    echo "安装 Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
    print_success "Certbot 已安装"
else
    print_warning "Certbot 已安装"
fi

echo "获取 SSL 证书..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN || true
print_success "SSL 证书已配置"

# 第 9 步: 配置防火墙
print_header "第 9 步: 配置防火墙"

if ! command -v ufw &> /dev/null; then
    echo "安装 UFW..."
    sudo apt install -y ufw
    print_success "UFW 已安装"
fi

echo "配置防火墙规则..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
print_success "防火墙已配置"

# 第 10 步: 配置备份
print_header "第 10 步: 配置备份"

echo "创建备份脚本..."
sudo tee /usr/local/bin/backup-blueprint.sh > /dev/null <<'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/blueprint-ai"
DB_NAME="blueprint_saas"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
cd /opt/blueprint-ai
docker-compose exec -T postgres pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR/db_$DATE.sql.gz"
EOF

sudo chmod +x /usr/local/bin/backup-blueprint.sh
print_success "备份脚本已创建"

echo "配置定时备份..."
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-blueprint.sh >> /var/log/blueprint-backup.log 2>&1") | sudo crontab -
print_success "定时备份已配置"

# 验证部署
print_header "验证部署"

echo "检查容器状态..."
docker-compose ps
print_success "容器状态正常"

echo "检查 Nginx 状态..."
sudo systemctl status nginx --no-pager | head -5
print_success "Nginx 状态正常"

# 完成
print_header "部署完成！"

echo ""
echo "访问地址:"
echo "  前端: https://$DOMAIN"
echo "  API: https://$DOMAIN/api"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  查看容器: docker-compose ps"
echo "  重启服务: docker-compose restart"
echo "  停止服务: docker-compose down"
echo ""
echo "下一步:"
echo "  1. 访问 https://$DOMAIN 验证应用"
echo "  2. 创建管理员账户"
echo "  3. 邀请用户"
echo "  4. 配置备份验证"
echo ""

print_success "部署脚本执行完成！"
