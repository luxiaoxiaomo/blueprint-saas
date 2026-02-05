# 📊 数据库连接信息

## PostgreSQL 连接参数

### 基本信息
```
主机地址：localhost
端口：5432
数据库名：blueprint_saas
用户名：postgres
密码：o1L7F%HlA$Q+n*kb4f5j
```

### 连接字符串
```
postgresql://postgres:o1L7F%HlA$Q+n*kb4f5j@localhost:5432/blueprint_saas
```

---

## 🔧 使用不同工具连接

### 1. DBeaver（推荐）

1. 打开 DBeaver
2. 点击 "新建连接" → 选择 "PostgreSQL"
3. 填写连接信息：
   - **主机**: `localhost`
   - **端口**: `5432`
   - **数据库**: `blueprint_saas`
   - **用户名**: `postgres`
   - **密码**: `o1L7F%HlA$Q+n*kb4f5j`
4. 点击 "测试连接"
5. 点击 "完成"

### 2. pgAdmin

1. 打开 pgAdmin
2. 右键 "Servers" → "Register" → "Server"
3. **General** 标签：
   - **Name**: `蓝图AI数据库`
4. **Connection** 标签：
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `blueprint_saas`
   - **Username**: `postgres`
   - **Password**: `o1L7F%HlA$Q+n*kb4f5j`
5. 点击 "Save"

### 3. VS Code (PostgreSQL 插件)

1. 安装插件：`PostgreSQL` by Chris Kolkman
2. 点击左侧 PostgreSQL 图标
3. 点击 "+" 添加连接
4. 输入连接字符串：
   ```
   postgresql://postgres:o1L7F%HlA$Q+n*kb4f5j@localhost:5432/blueprint_saas
   ```

### 4. DataGrip

1. 打开 DataGrip
2. 点击 "+" → "Data Source" → "PostgreSQL"
3. 填写：
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `blueprint_saas`
   - **User**: `postgres`
   - **Password**: `o1L7F%HlA$Q+n*kb4f5j`
4. 点击 "Test Connection"
5. 点击 "OK"

### 5. 命令行 (psql)

```bash
# Windows (PowerShell)
docker exec -it blueprint_postgres psql -U postgres -d blueprint_saas

# 或者直接连接（如果本地安装了 psql）
psql -h localhost -p 5432 -U postgres -d blueprint_saas
# 输入密码：o1L7F%HlA$Q+n*kb4f5j
```

---

## 📋 数据库表结构

### users（用户表）
```sql
SELECT * FROM users;
```

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 用户ID（主键）|
| email | VARCHAR(255) | 邮箱（唯一）|
| password | VARCHAR(255) | 密码（加密）|
| name | VARCHAR(255) | 用户名 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### projects（项目表）
```sql
SELECT * FROM projects;
```

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 项目ID（主键）|
| user_id | UUID | 用户ID（外键）|
| name | VARCHAR(255) | 项目名称 |
| description | TEXT | 项目描述 |
| model | JSONB | 项目数据（JSON）|
| is_archived | BOOLEAN | 是否归档 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### tasks（任务表）
```sql
SELECT * FROM tasks;
```

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 任务ID（主键）|
| project_id | UUID | 项目ID（外键）|
| user_id | UUID | 用户ID（外键）|
| name | VARCHAR(255) | 任务名称 |
| status | VARCHAR(50) | 任务状态 |
| task_type | VARCHAR(50) | 任务类型 |
| messages | JSONB | 消息记录 |
| files | JSONB | 文件列表 |
| result | JSONB | 分析结果 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

---

## 🔍 常用查询

### 查看所有用户
```sql
SELECT id, email, name, created_at 
FROM users 
ORDER BY created_at DESC;
```

### 查看某个用户的所有项目
```sql
SELECT p.id, p.name, p.description, p.is_archived, p.created_at
FROM projects p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'test@example.com'
ORDER BY p.created_at DESC;
```

### 查看项目详情（包含模型数据）
```sql
SELECT 
    p.name as project_name,
    p.model->>'name' as model_name,
    jsonb_array_length(p.model->'modules') as module_count,
    jsonb_array_length(p.model->'entities') as entity_count
FROM projects p
WHERE p.id = 'your-project-id';
```

### 统计每个用户的项目数
```sql
SELECT 
    u.name as user_name,
    u.email,
    COUNT(p.id) as project_count,
    COUNT(CASE WHEN p.is_archived = false THEN 1 END) as active_projects
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
GROUP BY u.id, u.name, u.email
ORDER BY project_count DESC;
```

### 查看最近创建的项目
```sql
SELECT 
    u.name as user_name,
    p.name as project_name,
    p.created_at
FROM projects p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
LIMIT 10;
```

---

## 🛠️ 数据库管理

### 备份数据库
```bash
# 在项目根目录运行
docker exec blueprint_postgres pg_dump -U postgres blueprint_saas > backup.sql
```

### 恢复数据库
```bash
# 恢复备份
docker exec -i blueprint_postgres psql -U postgres blueprint_saas < backup.sql
```

### 查看数据库大小
```sql
SELECT 
    pg_size_pretty(pg_database_size('blueprint_saas')) as database_size;
```

### 查看表大小
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ⚠️ 注意事项

1. **密码安全**：不要将此文件提交到 Git
2. **生产环境**：使用更强的密码
3. **防火墙**：生产环境不要暴露 5432 端口
4. **定期备份**：建议每天备份数据库
5. **权限管理**：生产环境创建只读用户用于查询

---

## 📞 需要帮助？

如果连接遇到问题：
1. 确认 Docker 容器正在运行：`docker-compose ps`
2. 查看数据库日志：`docker-compose logs postgres`
3. 测试端口是否开放：`telnet localhost 5432`
4. 查看 [故障排查文档](./docs/06-故障排查.md)

