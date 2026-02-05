-- ============================================
-- 蓝图 AI 数据库常用查询
-- ============================================

-- ============================================
-- 1. 用户相关查询
-- ============================================

-- 查看所有用户
SELECT id, email, name, created_at 
FROM users 
ORDER BY created_at DESC;

-- 查看特定用户
SELECT * FROM users WHERE email = 'test@example.com';

-- 统计用户数量
SELECT COUNT(*) as user_count FROM users;

-- ============================================
-- 2. 项目相关查询
-- ============================================

-- 查看所有项目（包含用户信息）
SELECT 
    p.id,
    p.name as project_name,
    p.description,
    u.name as user_name,
    u.email as user_email,
    p.is_archived,
    p.created_at
FROM projects p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- 查看活跃项目
SELECT 
    p.name,
    u.name as user_name,
    p.created_at
FROM projects p
JOIN users u ON p.user_id = u.id
WHERE p.is_archived = false
ORDER BY p.created_at DESC;

-- 查看某个用户的所有项目
SELECT 
    p.id,
    p.name,
    p.description,
    p.is_archived,
    p.created_at
FROM projects p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'test@example.com'
ORDER BY p.created_at DESC;

-- ============================================
-- 3. 项目统计
-- ============================================

-- 统计每个用户的项目数量
SELECT 
    u.name as user_name,
    u.email,
    COUNT(p.id) as total_projects,
    COUNT(CASE WHEN p.is_archived = false THEN 1 END) as active_projects,
    COUNT(CASE WHEN p.is_archived = true THEN 1 END) as archived_projects
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
GROUP BY u.id, u.name, u.email
ORDER BY total_projects DESC;

-- 查看项目详情（包含模块和实体数量）
SELECT 
    p.name as project_name,
    u.name as user_name,
    p.model->>'name' as model_name,
    jsonb_array_length(p.model->'modules') as module_count,
    jsonb_array_length(p.model->'entities') as entity_count,
    p.created_at
FROM projects p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- 统计总体数据
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM projects) as total_projects,
    (SELECT COUNT(*) FROM projects WHERE is_archived = false) as active_projects,
    (SELECT COUNT(*) FROM tasks) as total_tasks;

-- ============================================
-- 4. JSON 数据查询（模块和实体）
-- ============================================

-- 查看项目的模块结构
SELECT 
    name as project_name,
    jsonb_pretty(model->'modules') as modules
FROM projects
WHERE name = '蓝图平台'
LIMIT 1;

-- 查看项目的实体结构
SELECT 
    name as project_name,
    jsonb_pretty(model->'entities') as entities
FROM projects
WHERE name = '蓝图平台'
LIMIT 1;

-- 提取所有模块名称
SELECT 
    p.name as project_name,
    jsonb_array_elements(p.model->'modules')->>'name' as module_name
FROM projects p
WHERE p.model->'modules' IS NOT NULL;

-- 提取所有实体名称
SELECT 
    p.name as project_name,
    jsonb_array_elements(p.model->'entities')->>'name' as entity_name
FROM projects p
WHERE p.model->'entities' IS NOT NULL;

-- 统计每个项目的模块和实体数量
SELECT 
    name as project_name,
    COALESCE(jsonb_array_length(model->'modules'), 0) as module_count,
    COALESCE(jsonb_array_length(model->'entities'), 0) as entity_count,
    pg_size_pretty(pg_column_size(model)) as model_size
FROM projects
ORDER BY entity_count DESC;

-- ============================================
-- 5. 任务相关查询
-- ============================================

-- 查看所有任务
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
ORDER BY t.created_at DESC;

-- 查看进行中的任务
SELECT 
    t.name as task_name,
    t.status,
    p.name as project_name,
    t.created_at
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.status IN ('Analyzing', 'Synchronizing')
ORDER BY t.created_at DESC;

-- 统计任务状态
SELECT 
    status,
    COUNT(*) as count
FROM tasks
GROUP BY status
ORDER BY count DESC;

-- ============================================
-- 6. 数据维护查询
-- ============================================

-- 查看数据库大小
SELECT 
    pg_size_pretty(pg_database_size('blueprint_saas')) as database_size;

-- 查看各表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- 查看表行数
SELECT 
    'users' as table_name,
    COUNT(*) as row_count
FROM users
UNION ALL
SELECT 
    'projects' as table_name,
    COUNT(*) as row_count
FROM projects
UNION ALL
SELECT 
    'tasks' as table_name,
    COUNT(*) as row_count
FROM tasks;

-- ============================================
-- 7. 数据清理（谨慎使用！）
-- ============================================

-- 删除已归档的项目（谨慎！）
-- DELETE FROM projects WHERE is_archived = true;

-- 删除失败的任务
-- DELETE FROM tasks WHERE status = 'Failed';

-- 清空某个用户的所有数据（谨慎！）
-- DELETE FROM projects WHERE user_id = 'user-id-here';

-- ============================================
-- 8. 数据备份查询
-- ============================================

-- 导出用户数据（在 psql 中执行）
-- \copy (SELECT * FROM users) TO 'users_backup.csv' CSV HEADER;

-- 导出项目数据（在 psql 中执行）
-- \copy (SELECT * FROM projects) TO 'projects_backup.csv' CSV HEADER;

-- ============================================
-- 9. 性能分析
-- ============================================

-- 查看最大的项目（按 JSON 数据大小）
SELECT 
    name,
    pg_size_pretty(pg_column_size(model)) as model_size,
    jsonb_array_length(model->'modules') as modules,
    jsonb_array_length(model->'entities') as entities
FROM projects
ORDER BY pg_column_size(model) DESC
LIMIT 10;

-- 查看最近创建的记录
SELECT 
    'user' as type,
    name,
    created_at
FROM users
UNION ALL
SELECT 
    'project' as type,
    name,
    created_at
FROM projects
ORDER BY created_at DESC
LIMIT 20;

-- ============================================
-- 10. 高级查询示例
-- ============================================

-- 查找包含特定模块的项目
SELECT 
    name,
    created_at
FROM projects
WHERE model::text LIKE '%用户管理%';

-- 查找包含特定实体的项目
SELECT 
    name,
    created_at
FROM projects
WHERE model::text LIKE '%User%';

-- 统计每个用户的数据量
SELECT 
    u.name,
    COUNT(DISTINCT p.id) as project_count,
    COUNT(t.id) as task_count,
    SUM(pg_column_size(p.model)) as total_data_size,
    pg_size_pretty(SUM(pg_column_size(p.model))) as total_data_size_pretty
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN tasks t ON u.id = t.user_id
GROUP BY u.id, u.name
ORDER BY total_data_size DESC;
