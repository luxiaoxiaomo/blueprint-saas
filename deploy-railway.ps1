# Railway 部署脚本 (PowerShell)
# 用于快速部署到 Railway.app

Write-Host "🚀 Blueprint SaaS - Railway 部署脚本" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Git 状态
Write-Host "📋 检查 Git 状态..." -ForegroundColor Yellow

if (Test-Path ".git") {
    Write-Host "✓ Git 仓库已初始化" -ForegroundColor Green
} else {
    Write-Host "✗ 未找到 Git 仓库" -ForegroundColor Red
    Write-Host "正在初始化 Git..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git 仓库初始化完成" -ForegroundColor Green
}

# 检查是否有未提交的更改
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "! 发现未提交的更改" -ForegroundColor Yellow
    Write-Host "正在提交更改..." -ForegroundColor Yellow
    git add .
    $commitMessage = "Prepare for Railway deployment - $(Get-Date -Format 'yyyy-MM-dd')"
    git commit -m $commitMessage
    Write-Host "✓ 更改已提交" -ForegroundColor Green
} else {
    Write-Host "✓ 没有未提交的更改" -ForegroundColor Green
}

# 检查远程仓库
Write-Host ""
Write-Host "📋 检查远程仓库..." -ForegroundColor Yellow

$remotes = git remote
if ($remotes -contains "origin") {
    $remoteUrl = git remote get-url origin
    Write-Host "✓ 远程仓库已配置: $remoteUrl" -ForegroundColor Green
    
    # 推送到 GitHub
    Write-Host "正在推送到 GitHub..." -ForegroundColor Yellow
    
    try {
        git push origin main 2>$null
        if ($LASTEXITCODE -ne 0) {
            git push origin master 2>$null
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ 代码已推送到 GitHub" -ForegroundColor Green
        } else {
            Write-Host "✗ 推送失败，请检查网络连接和权限" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "✗ 推送失败: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "! 未配置远程仓库" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请按照以下步骤配置：" -ForegroundColor Cyan
    Write-Host "1. 访问 https://github.com/new 创建新仓库"
    Write-Host "2. 运行以下命令："
    Write-Host "   git remote add origin https://github.com/你的用户名/blueprint-saas.git"
    Write-Host "   git branch -M main"
    Write-Host "   git push -u origin main"
    Write-Host ""
    exit 1
}

# 检查 Railway CLI
Write-Host ""
Write-Host "📋 检查 Railway CLI..." -ForegroundColor Yellow

$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue
if ($railwayInstalled) {
    Write-Host "✓ Railway CLI 已安装" -ForegroundColor Green
} else {
    Write-Host "! Railway CLI 未安装" -ForegroundColor Yellow
    Write-Host "正在安装 Railway CLI..." -ForegroundColor Yellow
    
    try {
        npm install -g @railway/cli
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Railway CLI 安装完成" -ForegroundColor Green
        } else {
            Write-Host "✗ Railway CLI 安装失败" -ForegroundColor Red
            Write-Host "请手动安装: npm install -g @railway/cli"
            exit 1
        }
    } catch {
        Write-Host "✗ Railway CLI 安装失败: $_" -ForegroundColor Red
        exit 1
    }
}

# 登录 Railway
Write-Host ""
Write-Host "📋 登录 Railway..." -ForegroundColor Yellow

try {
    railway whoami 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 已登录 Railway" -ForegroundColor Green
    } else {
        Write-Host "请登录 Railway..." -ForegroundColor Yellow
        railway login
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Railway 登录成功" -ForegroundColor Green
        } else {
            Write-Host "✗ Railway 登录失败" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "请登录 Railway..." -ForegroundColor Yellow
    railway login
}

# 生成 JWT Secret
Write-Host ""
Write-Host "📋 生成 JWT Secret..." -ForegroundColor Yellow

$jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
Write-Host "✓ JWT Secret 已生成" -ForegroundColor Green
Write-Host "请保存此密钥: $jwtSecret" -ForegroundColor Cyan

# 显示部署说明
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ 准备工作已完成！" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "接下来请按照以下步骤在 Railway 上部署：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  访问 Railway 控制台" -ForegroundColor Cyan
Write-Host "   https://railway.app/dashboard"
Write-Host ""
Write-Host "2️⃣  创建新项目" -ForegroundColor Cyan
Write-Host "   - 点击 'New Project'"
Write-Host "   - 选择 'Deploy from GitHub repo'"
Write-Host "   - 选择你的仓库"
Write-Host ""
Write-Host "3️⃣  添加 PostgreSQL 数据库" -ForegroundColor Cyan
Write-Host "   - 点击 'New' → 'Database' → 'PostgreSQL'"
Write-Host ""
Write-Host "4️⃣  配置后端服务 (server 目录)" -ForegroundColor Cyan
Write-Host "   环境变量："
Write-Host "   DATABASE_URL=`${{Postgres.DATABASE_URL}}"
Write-Host "   DB_HOST=`${{Postgres.PGHOST}}"
Write-Host "   DB_PORT=`${{Postgres.PGPORT}}"
Write-Host "   DB_NAME=`${{Postgres.PGDATABASE}}"
Write-Host "   DB_USER=`${{Postgres.PGUSER}}"
Write-Host "   DB_PASSWORD=`${{Postgres.PGPASSWORD}}"
Write-Host "   JWT_SECRET=$jwtSecret" -ForegroundColor Yellow
Write-Host "   NODE_ENV=production"
Write-Host "   PORT=5000"
Write-Host ""
Write-Host "5️⃣  配置前端服务 (根目录)" -ForegroundColor Cyan
Write-Host "   环境变量："
Write-Host "   VITE_API_URL=https://你的后端地址.railway.app/api"
Write-Host ""
Write-Host "6️⃣  生成域名并访问" -ForegroundColor Cyan
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 详细教程请查看：" -ForegroundColor Yellow
Write-Host "   - DEPLOY_NOW.md"
Write-Host "   - 部署教程-Railway.md"
Write-Host "   - 部署检查清单.md"
Write-Host ""
Write-Host "🎉 祝你部署顺利！" -ForegroundColor Green
