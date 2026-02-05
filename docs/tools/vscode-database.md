# 🔌 VS Code 数据库插件使用指南

## 📦 推荐插件

### 1. SQLTools（推荐）⭐

**安装：**
1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展面板
3. 搜索 `SQLTools`
4. 安装 `SQLTools` by Matheus Teixeira
5. 安装 `SQLTools PostgreSQL/Cockroach Driver`

**配置连接：**

方法 A：通过界面配置
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 `SQLTools: Add New Connection`
3. 选择 `PostgreSQL`
4. 填写信息：
   ```
   Connection name: 蓝图AI数据库
   Server Address: localhost
   Port: 5432
   Database: blueprint_saas
   Username: postgres
   Password: o1L7F%HlA$Q+n*kb4f5j
   ```
5. 点击 `Test Connection`
6. 点击 `Save Connection`

方法 B：手动配置（推荐）
1. 打开 `.vscode/settings.json`
2. 添加以下配置：
```json
{
  "sqltools.connections": [
    {
      "previewLimit": 50,
      "server": "localhost",
      "port": 5432,
      "driver": "PostgreSQL",
      "name": "蓝图AI数据库",
      "database": "blueprint_saas",
      "username": "postgres",
      "password": "o1L7F%HlA$Q+n*kb4f5j"
    }
  ]
}
```

**使用方法：**

1. **连接数据库**
   - 点击左侧 SQLTools 图标（数据库图标）
   - 点击 "蓝图AI数据库" 旁边的插头图标连接

2. **查看表结构**
   - 展开连接 → 展开 `blueprint_saas` → 展开 `Tables`
   - 可以看到 `users`、`projects`、`tasks` 表

3. **执行查询**
   - 右键表名 → `Show Table Records` 查看数据
   - 或创建新的 SQL 文件（`.sql`）
   - 写入 SQL 查询
   - 按 `Ctrl+E Ctrl+E` 执行查询

4. **常用快捷键**
   - `Ctrl+E Ctrl+E` - 执行当前查询
   - `Ctrl+E Ctrl+S` - 显示表记录
   - `Ctrl+E Ctrl+D` - 描述表结构

---

### 2. PostgreSQL（备选）

**安装：**
1. 搜索 `PostgreSQL` by Chris Kolkman
2. 点击安装

**配置连接：**
1. 点击左侧 PostgreSQL 图标
2. 点击 `+` 添加连接
3. 输入连接字符串：
   ```
   postgresql://postgres:o1L7F%HlA$Q+n*kb4f5j@localhost:5432/blueprint_saas
   ```
4. 按回车保存

**使用方法：**
1. 点击连接展开数据库
2. 右键表 → `Select Top 1000` 查看数据
3. 右键表 → `New Query` 创建查询

---

### 3. Database Client（功能最全）

**安装：**
1. 搜索 `Database Client` by Weijan Chen
2. 点击安装

**配置连接：**
1. 点击左侧 Database 图标
2. 点击 `+` → `Create Connection`
3. 选择 `PostgreSQL`
4. 填写：
   ```
   Host: localhost
   Port: 5432
   Username: postgres
   Password: o1L7F%HlA$Q+n*kb4f5j
   Database: blueprint_saas
   ```
5. 点击 `Connect`

**使用方法：**
1. 展开连接查看表
2. 右键表 → `Open Table` 查看数据
3. 右键表 → `New Query` 创建查询
4. 支持可视化编辑表数据

---

## 📝 创建 SQL 查询文件

### 1. 创建查询文件

在项目根目录创建 `queries.sql` 文件：

```sql
-- 查看所有用户
SELECT id, email, name, created_at 
FROM users 
ORDER BY created_at DESC;

-- 查看所有项目
SELECT 
    p.id,
    p.name as project_name,
    u.name as user_name,
    p.is_archived,
    p.created_at
FROM projects p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- 查看项目统计
SELECT 
    u.name as user_name,
    COUNT(p.id) as total_projects,
    COUNT(CASE WHEN p.is_archived = false THEN 1 END) as active_projects,
    COUNT(CASE WHEN p.is_archived = true THEN 1 END) as archived_projects
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
GROUP BY u.id, u.name
ORDER BY total_projects DESC;

-- 查看项目详情（包含模块和实体数量）
SELECT 
    p.name as project_name,
    p.model->>'name' as model_name,
    jsonb_array_length(p.model->'modules') as module_count,
    jsonb_array_length(p.model->'entities') as entity_count,
    p.created_at
FROM projects p
ORDER BY p.created_at DESC;

-- 查看最近的任务
SELECT 
    t.id,
    t.name as task_name,
    t.status,
    t.task_type,
    p.name as project_name,
    u.name as user_name,
    t.created_at
FROM tasks t
JOIN projects p ON t.project_id = p.id
JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 20;
```

### 2. 执行查询

**使用 SQLTools：**
1. 打开 `queries.sql` 文件
2. 选中要执行的 SQL 语句
3. 按 `Ctrl+E Ctrl+E` 执行
4. 结果会在下方显示

**使用 PostgreSQL 插件：**
1. 打开 `queries.sql` 文件
2. 右键 → `Run Query`
3. 或按 `F5` 执行

---

## 🎯 常用操作示例

### 查看用户数据

```sql
-- 查看所有用户
SELECT * FROM users;

-- 查看特定用户
SELECT * FROM users WHERE email = 'test@example.com';

-- 统计用户数量
SELECT COUNT(*) as user_count FROM users;
```

### 查看项目数据

```sql
-- 查看所有项目
SELECT * FROM projects;

-- 查看某个用户的项目
SELECT p.* 
FROM projects p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'test@example.com';

-- 查看项目的模块数据（JSON）
SELECT 
    name,
    model->'modules' as modules
FROM projects
WHERE id = 'your-project-id';
```

### 修改数据

```sql
-- 更新项目名称
UPDATE projects 
SET name = '新项目名称'
WHERE id = 'your-project-id';

-- 归档项目
UPDATE projects 
SET is_archived = true
WHERE id = 'your-project-id';

-- 删除项目（谨慎！）
DELETE FROM projects 
WHERE id = 'your-project-id';
```

### 备份和恢复

```sql
-- 导出用户数据
COPY (SELECT * FROM users) TO '/tmp/users.csv' CSV HEADER;

-- 导出项目数据
COPY (SELECT * FROM projects) TO '/tmp/projects.csv' CSV HEADER;
```

---

## 🔍 高级查询

### JSON 数据查询

```sql
-- 查询包含特定模块的项目
SELECT name, model
FROM projects
WHERE model->'modules' @> '[{"name": "用户管理"}]';

-- 提取模块名称列表
SELECT 
    name as project_name,
    jsonb_array_elements(model->'modules')->>'name' as module_name
FROM projects;

-- 统计每个项目的实体数量
SELECT 
    name,
    jsonb_array_length(model->'entities') as entity_count
FROM projects
ORDER BY entity_count DESC;
```

### 关联查询

```sql
-- 查看用户及其项目数量
SELECT 
    u.name,
    u.email,
    COUNT(p.id) as project_count,
    MAX(p.created_at) as last_project_date
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
GROUP BY u.id, u.name, u.email;

-- 查看项目及其任务数量
SELECT 
    p.name as project_name,
    COUNT(t.id) as task_count,
    COUNT(CASE WHEN t.status = 'Completed' THEN 1 END) as completed_tasks
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name;
```

---

## 💡 使用技巧

### 1. 代码片段

在 VS Code 中创建 SQL 代码片段：

1. 按 `Ctrl+Shift+P`
2. 输入 `Preferences: Configure User Snippets`
3. 选择 `sql.json`
4. 添加：

```json
{
  "Select All Users": {
    "prefix": "sel-users",
    "body": [
      "SELECT id, email, name, created_at",
      "FROM users",
      "ORDER BY created_at DESC;"
    ]
  },
  "Select All Projects": {
    "prefix": "sel-projects",
    "body": [
      "SELECT p.*, u.name as user_name",
      "FROM projects p",
      "JOIN users u ON p.user_id = u.id",
      "ORDER BY p.created_at DESC;"
    ]
  }
}
```

### 2. 格式化 SQL

安装 `SQL Formatter` 插件：
- 选中 SQL 代码
- 按 `Shift+Alt+F` 格式化

### 3. 自动补全

SQLTools 会自动提供：
- 表名补全
- 列名补全
- SQL 关键字补全

输入时按 `Ctrl+Space` 触发补全

---

## ⚠️ 注意事项

1. **生产环境**：不要在生产数据库上执行 `DELETE` 或 `UPDATE` 操作
2. **备份**：修改数据前先备份
3. **事务**：使用事务保护重要操作：
   ```sql
   BEGIN;
   -- 你的操作
   COMMIT; -- 或 ROLLBACK;
   ```
4. **密码安全**：不要将包含密码的配置文件提交到 Git

---

## 🆘 常见问题

### Q: 连接失败怎么办？

A: 检查：
1. Docker 容器是否运行：`docker-compose ps`
2. 端口是否正确：`5432`
3. 密码是否正确
4. 防火墙是否阻止

### Q: 看不到表怎么办？

A: 
1. 确认已连接到正确的数据库 `blueprint_saas`
2. 刷新连接
3. 检查 schema 是否为 `public`

### Q: 如何查看查询执行时间？

A: SQLTools 会在结果面板显示执行时间

### Q: 如何导出查询结果？

A: 
1. 执行查询后
2. 右键结果 → `Export Results`
3. 选择格式（CSV、JSON 等）

---

## 📚 更多资源

- [SQLTools 文档](https://vscode-sqltools.mteixeira.dev/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [SQL 教程](https://www.w3schools.com/sql/)

---

**祝你使用愉快！** 🎉

