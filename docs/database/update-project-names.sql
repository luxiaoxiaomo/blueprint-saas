-- 更新项目名称脚本
-- 将 "V课堂" 改为 "X课堂"
-- 将 "问鼎平台" 改为 "蓝图平台"

-- 开始事务
BEGIN;

-- 1. 更新 "V课堂" 为 "X课堂"
UPDATE projects 
SET 
    name = 'X课堂',
    model = jsonb_set(model, '{name}', '"X课堂"'),
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'V课堂';

-- 2. 更新 "问鼎平台" 为 "蓝图平台"
UPDATE projects 
SET 
    name = '蓝图平台',
    model = jsonb_set(model, '{name}', '"蓝图平台"'),
    updated_at = CURRENT_TIMESTAMP
WHERE name = '问鼎平台';

-- 验证更新结果
SELECT 
    id,
    name,
    model->>'name' as model_name,
    updated_at
FROM projects
WHERE name IN ('X课堂', '蓝图平台')
ORDER BY name;

-- 如果一切正常，提交事务
COMMIT;

-- 如果需要回滚，取消注释下面这行
-- ROLLBACK;
