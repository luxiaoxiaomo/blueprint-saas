# 工具使用指南

本目录包含各种开发和管理工具的使用指南。

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| [vscode-database.md](./vscode-database.md) | VS Code 数据库插件使用指南 |

## 🛠️ 工具分类

### 数据库工具

#### VS Code 插件

查看 [vscode-database.md](./vscode-database.md) 了解如何在 VS Code 中连接和管理数据库。

**推荐插件**:
- **SQLTools** ⭐ - 功能强大，支持多种数据库
- **PostgreSQL** - 专门针对 PostgreSQL
- **Database Client** - 功能最全，支持可视化编辑

**主要功能**:
- 连接数据库
- 查看表结构
- 执行 SQL 查询
- 可视化编辑数据
- 导出查询结果

#### 桌面工具

**DBeaver** (推荐)
- 免费开源
- 支持多种数据库
- 功能强大
- 跨平台

**pgAdmin**
- PostgreSQL 官方工具
- 功能完整
- 免费

**DataGrip**
- JetBrains 出品
- 功能最强大
- 付费软件

### 开发工具

#### VS Code 扩展

**必装扩展**:
- ESLint - 代码检查
- Prettier - 代码格式化
- TypeScript - TypeScript 支持
- Docker - Docker 管理
- GitLens - Git 增强

**推荐扩展**:
- Thunder Client - API 测试
- REST Client - HTTP 请求
- Error Lens - 错误提示增强
- Auto Rename Tag - 标签自动重命名
- Path Intellisense - 路径智能提示

### Docker 工具

#### Docker Desktop

**功能**:
- 容器管理
- 镜像管理
- 卷管理
- 网络管理
- 可视化界面

**常用命令**:
```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down
```

#### VS Code Docker 扩展

**功能**:
- 查看容器
- 管理镜像
- 查看日志
- 进入容器终端
- 一键操作

### API 测试工具

#### Thunder Client (VS Code)

**优点**:
- 集成在 VS Code 中
- 轻量级
- 易于使用

#### Postman

**优点**:
- 功能强大
- 团队协作
- 自动化测试

#### REST Client (VS Code)

**优点**:
- 使用 `.http` 文件
- 版本控制友好
- 简单直观

### Git 工具

#### VS Code 内置 Git

**功能**:
- 提交代码
- 查看差异
- 分支管理
- 合并冲突

#### GitLens 扩展

**功能**:
- 代码作者信息
- 提交历史
- 文件历史
- 分支对比

#### GitHub Desktop

**优点**:
- 可视化界面
- 简单易用
- 适合新手

## 📝 使用建议

### 数据库管理

1. **日常开发**: 使用 VS Code SQLTools 插件
2. **复杂查询**: 使用 DBeaver
3. **数据库管理**: 使用 pgAdmin

### API 测试

1. **快速测试**: 使用 Thunder Client
2. **团队协作**: 使用 Postman
3. **版本控制**: 使用 REST Client

### 代码编辑

1. **主力编辑器**: VS Code
2. **必装扩展**: ESLint, Prettier, TypeScript
3. **推荐扩展**: GitLens, Error Lens

## 🔗 相关资源

### 官方文档

- [VS Code 文档](https://code.visualstudio.com/docs)
- [Docker 文档](https://docs.docker.com/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Git 文档](https://git-scm.com/doc)

### 教程

- [VS Code 教程](https://code.visualstudio.com/docs/getstarted/introvideos)
- [Docker 教程](https://docs.docker.com/get-started/)
- [SQL 教程](https://www.w3schools.com/sql/)

### 社区

- [VS Code 社区](https://github.com/microsoft/vscode)
- [Docker 社区](https://forums.docker.com/)
- [PostgreSQL 社区](https://www.postgresql.org/community/)

## 💡 使用技巧

### VS Code 快捷键

**常用快捷键**:
- `Ctrl+P` - 快速打开文件
- `Ctrl+Shift+P` - 命令面板
- `Ctrl+` - 打开终端
- `Ctrl+B` - 切换侧边栏
- `Ctrl+Shift+F` - 全局搜索

**数据库相关**:
- `Ctrl+E Ctrl+E` - 执行 SQL（SQLTools）
- `F5` - 运行查询（PostgreSQL）

### Docker 技巧

**查看资源使用**:
```bash
docker stats
```

**清理未使用的资源**:
```bash
docker system prune -a
```

**进入容器**:
```bash
docker exec -it container_name bash
```

### Git 技巧

**查看文件历史**:
```bash
git log --follow filename
```

**撤销最后一次提交**:
```bash
git reset --soft HEAD~1
```

**查看差异**:
```bash
git diff
```

## 📚 更多文档

- [数据库文档](../database/README.md)
- [用户文档](../README.md)
- [开发指南](../../server/DEVELOPMENT_GUIDE.md)
- [部署指南](../../server/DEPLOYMENT_GUIDE.md)

---

**最后更新**: 2026-01-18
