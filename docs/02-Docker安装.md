# 🐳 Docker Desktop 安装指南

## 系统要求

✅ 你的系统：Windows 10/11
✅ 满足 Docker 运行要求

## 方式一：自动安装（推荐）

我会帮你自动下载并安装 Docker Desktop。

## 方式二：手动安装

### 1. 下载 Docker Desktop

**官方下载地址：**
https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

或访问：https://www.docker.com/products/docker-desktop/

### 2. 安装步骤

1. 双击下载的 `Docker Desktop Installer.exe`
2. 勾选 "Use WSL 2 instead of Hyper-V"（推荐）
3. 点击 "Ok" 开始安装
4. 等待安装完成（约5-10分钟）
5. 点击 "Close and restart" 重启电脑

### 3. 首次启动

1. 重启后，Docker Desktop 会自动启动
2. 接受服务条款
3. 可以跳过登录（或注册 Docker Hub 账号）
4. 等待 Docker Engine 启动（右下角图标变绿）

### 4. 验证安装

打开 PowerShell，运行：
```powershell
docker --version
docker-compose --version
docker run hello-world
```

看到版本号和 "Hello from Docker!" 就说明安装成功！

## 常见问题

### 问题1：需要启用 WSL 2

**解决方法：**
```powershell
# 以管理员身份运行 PowerShell
wsl --install
# 重启电脑
```

### 问题2：需要启用虚拟化

**解决方法：**
1. 重启电脑进入 BIOS
2. 找到 "Virtualization Technology" 或 "Intel VT-x" 或 "AMD-V"
3. 设置为 "Enabled"
4. 保存并重启

### 问题3：Docker Desktop 无法启动

**解决方法：**
1. 确保 Windows 更新到最新版本
2. 检查是否启用了 Hyper-V 或 WSL 2
3. 重启 Docker Desktop
4. 查看 Docker Desktop 日志

## 配置建议

### 1. 资源分配

Docker Desktop → Settings → Resources：
- **CPUs**: 2-4 核
- **Memory**: 4-8 GB
- **Disk**: 20 GB+

### 2. 镜像加速（可选）

Docker Desktop → Settings → Docker Engine：
```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

## 下一步

安装完成后，运行：
```powershell
.\scripts\deploy.ps1
```

开始部署你的 SaaS 应用！
