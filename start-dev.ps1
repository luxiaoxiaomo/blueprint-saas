# Blueprint SaaS 本地开发环境启动脚本
# 使用本地开发服务器而不是 Docker 容器

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Blueprint SaaS 本地开发环境启动" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否已安装
Write-Host "检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装 Node.js" -ForegroundColor Red
    Write-Host "请从 https://nodejs.org/ 下载并安装 Node.js" -ForegroundColor Red
    exit 1
}

# 检查 npm 是否已安装
Write-Host "检查 npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm 版本: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装 npm" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "启动后端服务" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否运行
Write-Host "检查 Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker 正在运行" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker 未运行" -ForegroundColor Red
    Write-Host "正在启动 Docker Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden
    Write-Host "等待 Docker 启动..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}

# 启动后端和数据库容器
Write-Host "启动后端和数据库容器..." -ForegroundColor Yellow
docker-compose up -d postgres backend

Write-Host "等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查后端健康状态
Write-Host "检查后端健康状态..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ 后端 API 正常运行" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  后端 API 可能还在启动中" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "启动前端开发服务器" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已安装依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "安装前端依赖..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ 前端依赖已安装" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "启动完成！" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "服务地址:" -ForegroundColor Cyan
Write-Host "  前端: http://localhost:5173 (Vite 开发服务器)" -ForegroundColor White
Write-Host "  后端: http://localhost:5000" -ForegroundColor White
Write-Host "  数据库: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "正在启动前端开发服务器..." -ForegroundColor Yellow
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 启动前端开发服务器
npm run dev
