#!/bin/bash

# Railway 部署脚本
# 用于快速部署到 Railway.app

echo "🚀 Blueprint SaaS - Railway 部署脚本"
echo "===================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Git 状态
echo "📋 检查 Git 状态..."
if [ -d ".git" ]; then
    echo -e "${GREEN}✓${NC} Git 仓库已初始化"
else
    echo -e "${RED}✗${NC} 未找到 Git 仓库"
    echo "正在初始化 Git..."
    git init
    echo -e "${GREEN}✓${NC} Git 仓库初始化完成"
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}!${NC} 发现未提交的更改"
    echo "正在提交更改..."
    git add .
    git commit -m "Prepare for Railway deployment - $(date +%Y-%m-%d)"
    echo -e "${GREEN}✓${NC} 更改已提交"
else
    echo -e "${GREEN}✓${NC} 没有未提交的更改"
fi

# 检查远程仓库
echo ""
echo "📋 检查远程仓库..."
if git remote | grep -q "origin"; then
    REMOTE_URL=$(git remote get-url origin)
    echo -e "${GREEN}✓${NC} 远程仓库已配置: $REMOTE_URL"
    
    # 推送到 GitHub
    echo "正在推送到 GitHub..."
    git push origin main 2>/dev/null || git push origin master 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} 代码已推送到 GitHub"
    else
        echo -e "${RED}✗${NC} 推送失败，请检查网络连接和权限"
        exit 1
    fi
else
    echo -e "${YELLOW}!${NC} 未配置远程仓库"
    echo ""
    echo "请按照以下步骤配置："
    echo "1. 访问 https://github.com/new 创建新仓库"
    echo "2. 运行以下命令："
    echo "   git remote add origin https://github.com/你的用户名/blueprint-saas.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    exit 1
fi

# 检查 Railway CLI
echo ""
echo "📋 检查 Railway CLI..."
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✓${NC} Railway CLI 已安装"
else
    echo -e "${YELLOW}!${NC} Railway CLI 未安装"
    echo "正在安装 Railway CLI..."
    npm install -g @railway/cli
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Railway CLI 安装完成"
    else
        echo -e "${RED}✗${NC} Railway CLI 安装失败"
        echo "请手动安装: npm install -g @railway/cli"
        exit 1
    fi
fi

# 登录 Railway
echo ""
echo "📋 登录 Railway..."
railway whoami &> /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} 已登录 Railway"
else
    echo "请登录 Railway..."
    railway login
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Railway 登录成功"
    else
        echo -e "${RED}✗${NC} Railway 登录失败"
        exit 1
    fi
fi

# 生成 JWT Secret
echo ""
echo "📋 生成 JWT Secret..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo -e "${GREEN}✓${NC} JWT Secret 已生成"
echo "请保存此密钥: $JWT_SECRET"

# 显示部署说明
echo ""
echo "===================================="
echo "✅ 准备工作已完成！"
echo "===================================="
echo ""
echo "接下来请按照以下步骤在 Railway 上部署："
echo ""
echo "1️⃣  访问 Railway 控制台"
echo "   https://railway.app/dashboard"
echo ""
echo "2️⃣  创建新项目"
echo "   - 点击 'New Project'"
echo "   - 选择 'Deploy from GitHub repo'"
echo "   - 选择你的仓库"
echo ""
echo "3️⃣  添加 PostgreSQL 数据库"
echo "   - 点击 'New' → 'Database' → 'PostgreSQL'"
echo ""
echo "4️⃣  配置后端服务 (server 目录)"
echo "   环境变量："
echo "   DATABASE_URL=\${{Postgres.DATABASE_URL}}"
echo "   DB_HOST=\${{Postgres.PGHOST}}"
echo "   DB_PORT=\${{Postgres.PGPORT}}"
echo "   DB_NAME=\${{Postgres.PGDATABASE}}"
echo "   DB_USER=\${{Postgres.PGUSER}}"
echo "   DB_PASSWORD=\${{Postgres.PGPASSWORD}}"
echo "   JWT_SECRET=$JWT_SECRET"
echo "   NODE_ENV=production"
echo "   PORT=5000"
echo ""
echo "5️⃣  配置前端服务 (根目录)"
echo "   环境变量："
echo "   VITE_API_URL=https://你的后端地址.railway.app/api"
echo ""
echo "6️⃣  生成域名并访问"
echo ""
echo "===================================="
echo ""
echo "📚 详细教程请查看："
echo "   - DEPLOY_NOW.md"
echo "   - 部署教程-Railway.md"
echo "   - 部署检查清单.md"
echo ""
echo "🎉 祝你部署顺利！"
