# 清理浏览器缓存中的旧项目名称

## 问题

前端界面仍然显示旧的项目名称（V课堂、问鼎平台），这是因为数据缓存在浏览器的 localStorage 中。

## 解决方案

### 方法 1：清除浏览器缓存（推荐）

1. 打开浏览器开发者工具（F12）
2. 进入 Console（控制台）标签
3. 粘贴并执行以下代码：

```javascript
// 清除所有项目缓存
localStorage.removeItem('blueprint_projects');
localStorage.removeItem('blueprint_active_project_id');

// 刷新页面
location.reload();
```

### 方法 2：手动更新 localStorage 中的项目名称

如果你想保留其他数据，只更新项目名称：

```javascript
// 获取当前项目列表
let projects = JSON.parse(localStorage.getItem('blueprint_projects') || '[]');

// 更新项目名称
projects = projects.map(project => {
  if (project.name === 'V课堂') {
    project.name = 'X课堂';
    if (project.model && project.model.name === 'V课堂') {
      project.model.name = 'X课堂';
    }
  }
  if (project.name === '问鼎平台') {
    project.name = '蓝图平台';
    if (project.model && project.model.name === '问鼎平台') {
      project.model.name = '蓝图平台';
    }
  }
  return project;
});

// 保存回 localStorage
localStorage.setItem('blueprint_projects', JSON.stringify(projects));

// 刷新页面
location.reload();
```

### 方法 3：完全重置应用数据

如果你想从数据库重新加载所有数据：

```javascript
// 清除所有应用数据
localStorage.clear();

// 刷新页面（会要求重新登录）
location.reload();
```

## 步骤说明

1. **打开前端应用**：http://localhost:5173
2. **按 F12** 打开开发者工具
3. **点击 Console 标签**
4. **复制上面的代码**（选择方法 1 或 2）
5. **粘贴到控制台并按回车**
6. **页面会自动刷新**

## 验证

刷新后，你应该看到：
- ✅ "V课堂" 变成 "X课堂"
- ✅ "问鼎平台" 变成 "蓝图平台"

## 为什么会这样？

前端应用使用 localStorage 缓存项目数据以提高性能。当你更新数据库时，浏览器中的缓存不会自动更新。

有两种数据来源：
1. **localStorage**（浏览器缓存）- 旧数据
2. **数据库**（PostgreSQL）- 新数据 ✅

清除缓存后，应用会从数据库重新加载数据。

## 注意事项

- 方法 1 会清除项目缓存，但保留登录状态
- 方法 3 会清除所有数据，需要重新登录
- 如果你有未保存的工作，请先保存

## 自动同步

为了避免将来出现这种情况，建议：
1. 使用"项目管理"页面的刷新按钮
2. 或者定期清除浏览器缓存
3. 或者使用数据库作为唯一数据源（需要修改代码）
