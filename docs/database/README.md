# 数据库文档

本目录包含数据库相关的文档和脚本。

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| [connection-info.md](./connection-info.md) | 数据库连接信息和使用指南 |
| [queries.sql](./queries.sql) | 常用 SQL 查询脚本 |

## 🔗 快速链接

### 数据库连接

查看 [connection-info.md](./connection-info.md) 了解：
- PostgreSQL 连接参数
- 使用不同工具连接（DBeaver, pgAdmin, VS Code等）
- 数据库表结构
- 常用查询示例
- 数据库管理命令

### SQL 查询

查看 [queries.sql](./queries.sql) 获取：
- 用户相关查询
- 项目相关查询
- 项目统计查询
- JSON 数据查询
- 任务相关查询
- 数据维护查询
- 性能分析查询

## 📊 数据库信息

### 连接参数

```
主机: localhost
端口: 5432
数据库: blueprint_saas
用户名: postgres
```

### 主要表

- `users` - 用户表
- `projects` - 项目表
- `tasks` - 任务表
- `modules` - 模块表
- `entities` - 实体表
- `audit_logs` - 审计日志表
- `user_permissions` - 用户权限表
- `ontology_links` - 本体链接表
- `organizations` - 组织表
- `members` - 成员表

## 🛠️ 工具推荐

### VS Code 插件

查看 [../tools/vscode-database.md](../tools/vscode-database.md) 了解如何使用 VS Code 连接数据库。

推荐插件：
- SQLTools（推荐）
- PostgreSQL
- Database Client

### 桌面工具

- **DBeaver** - 免费、功能强大
- **pgAdmin** - PostgreSQL 官方工具
- **DataGrip** - JetBrains 出品（付费）

## 📝 使用示例

### 查看所有用户

```sql
SELECT id, email, name, created_at 
FROM users 
ORDER BY created_at DESC;
```

### 查看项目统计

```sql
SELECT 
    u.name as user_name,
    COUNT(p.id) as total_projects,
    COUNT(CASE WHEN p.is_archived = false THEN 1 END) as active_projects
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
GROUP BY u.id, u.name;
```

### 查看数据库大小

```sql
SELECT 
    pg_size_pretty(pg_database_size('blueprint_saas')) as database_size;
```

## 🔒 安全提示

1. **不要提交密码** - 连接信息文件已在 `.gitignore` 中
2. **定期备份** - 使用 `pg_dump` 备份数据库
3. **限制访问** - 生产环境不要暴露数据库端口
4. **使用强密码** - 生产环境使用复杂密码

## 📚 相关文档

- [用户文档](../README.md)
- [工具文档](../tools/README.md)
- [部署指南](../../server/DEPLOYMENT_GUIDE.md)
- [故障排查](../06-故障排查.md)

---

**最后更新**: 2026-01-18
