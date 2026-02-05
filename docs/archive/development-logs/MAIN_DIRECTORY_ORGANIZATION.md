# 主目录文件整理方案

## 📋 当前主目录文件分析

### 文档类文件（中文）

| 文件名 | 内容 | 建议 |
|--------|------|------|
| `数据库连接信息.md` | 数据库连接配置和使用指南 | 移动到 `docs/database/` |
| `文档清单.md` | 文档索引（旧版） | 已过时，可删除或归档 |
| `项目完成总结.md` | 项目总结（旧版） | 已被新版本替代，归档到 `docs/archive/` |
| `VS Code数据库插件使用指南.md` | VS Code 插件使用说明 | 移动到 `docs/tools/` |

### 总结类文件（英文）

| 文件名 | 内容 | 建议 |
|--------|------|------|
| `ONTOLOGY_REFACTORING_SUMMARY.md` | 本体论重构总结（旧版） | 已被新版本替代，归档到 `docs/archive/` |
| `PROJECT_COMPLETION_SUMMARY.md` | 项目完成总结（新版） | 保留在主目录 ✅ |
| `ARCHIVE_COMPLETION_SUMMARY.md` | 归档完成总结 | 保留在主目录 ✅ |

### 数据库相关文件

| 文件名 | 内容 | 建议 |
|--------|------|------|
| `queries.sql` | 常用 SQL 查询 | 移动到 `docs/database/` 或 `server/database/` |

### 备份文件

| 文件名 | 内容 | 建议 |
|--------|------|------|
| `Blueprint_Backup_2026-01-08_12-10-46-137_1.json` | 旧的备份文件 | 移动到 `backups/` 目录 |

### 配置文件（保留）

| 文件名 | 说明 |
|--------|------|
| `.env*` | 环境变量配置 ✅ |
| `docker-compose.yml` | Docker 编排配置 ✅ |
| `Dockerfile` | Docker 镜像配置 ✅ |
| `nginx.conf` | Nginx 配置 ✅ |
| `package.json` | 前端依赖配置 ✅ |
| `tsconfig.json` | TypeScript 配置 ✅ |
| `vite.config.ts` | Vite 配置 ✅ |

### 源代码文件（保留）

| 文件名 | 说明 |
|--------|------|
| `index.html` | 前端入口 HTML ✅ |
| `index.tsx` | 前端入口 TypeScript ✅ |
| `types.ts` | 类型定义 ✅ |
| `metadata.json` | 项目元数据 ✅ |

## 🎯 整理方案

### 方案 A: 创建新目录结构（推荐）

```
项目根目录/
├── docs/
│   ├── database/                    # 数据库相关文档 ✨ 新增
│   │   ├── connection-info.md      # 数据库连接信息
│   │   ├── queries.sql             # 常用查询
│   │   └── README.md               # 数据库文档说明
│   ├── tools/                       # 工具使用指南 ✨ 新增
│   │   ├── vscode-database.md      # VS Code 数据库插件
│   │   └── README.md               # 工具文档说明
│   └── archive/                     # 归档文档 ✨ 新增
│       ├── old-project-summary.md  # 旧项目总结
│       ├── old-doc-list.md         # 旧文档清单
│       └── old-ontology-summary.md # 旧本体论总结
├── backups/                         # 备份文件
│   └── Blueprint_Backup_*.json     # 移动备份文件
├── PROJECT_COMPLETION_SUMMARY.md    # 项目完成总结 ✅ 保留
├── ARCHIVE_COMPLETION_SUMMARY.md    # 归档完成总结 ✅ 保留
└── README.md                        # 项目主页 ✅ 保留
```

### 方案 B: 最小化整理（简单）

只移动明显需要整理的文件：
1. 备份文件 → `backups/`
2. 旧文档 → `docs/archive/`
3. 数据库文档 → `docs/database/`

## 📝 详细整理计划

### 第 1 步: 创建新目录

```bash
# 创建数据库文档目录
mkdir -p docs/database

# 创建工具文档目录
mkdir -p docs/tools

# 创建归档目录
mkdir -p docs/archive
```

### 第 2 步: 移动数据库相关文件

```bash
# 移动数据库连接信息
mv "数据库连接信息.md" docs/database/connection-info.md

# 移动 SQL 查询文件
mv queries.sql docs/database/queries.sql
```

### 第 3 步: 移动工具文档

```bash
# 移动 VS Code 插件指南
mv "VS Code数据库插件使用指南.md" docs/tools/vscode-database.md
```

### 第 4 步: 归档旧文档

```bash
# 归档旧项目总结
mv "项目完成总结.md" docs/archive/old-project-summary.md

# 归档旧文档清单
mv "文档清单.md" docs/archive/old-doc-list.md

# 归档旧本体论总结
mv ONTOLOGY_REFACTORING_SUMMARY.md docs/archive/old-ontology-summary.md
```

### 第 5 步: 移动备份文件

```bash
# 移动备份文件
mv Blueprint_Backup_*.json backups/
```

### 第 6 步: 创建说明文档

为每个新目录创建 README.md 说明文件。

## 🎨 整理后的效果

### 主目录（清爽）

```
项目根目录/
├── .env                             # 环境变量
├── .gitignore                       # Git 忽略配置
├── docker-compose.yml               # Docker 编排
├── Dockerfile                       # Docker 镜像
├── index.html                       # 前端入口
├── index.tsx                        # 前端入口
├── metadata.json                    # 项目元数据
├── nginx.conf                       # Nginx 配置
├── package.json                     # 前端依赖
├── tsconfig.json                    # TypeScript 配置
├── types.ts                         # 类型定义
├── vite.config.ts                   # Vite 配置
├── README.md                        # 项目主页 ✅
├── PROJECT_COMPLETION_SUMMARY.md    # 项目完成总结 ✅
├── ARCHIVE_COMPLETION_SUMMARY.md    # 归档完成总结 ✅
├── backups/                         # 备份目录
├── components/                      # 前端组件
├── docs/                            # 文档目录
├── node_modules/                    # 依赖
├── scripts/                         # 脚本
├── server/                          # 后端服务
└── services/                        # 服务层
```

**改善**:
- 主目录文件从 30+ 减少到 15 个核心文件
- 所有文档都有明确的分类
- 旧文档被归档，不会混淆
- 数据库相关文档集中管理

## 📊 文件分类统计

### 整理前

| 类型 | 数量 |
|------|------|
| 配置文件 | 10 |
| 源代码文件 | 5 |
| 文档文件（中文） | 4 |
| 总结文件（英文） | 3 |
| 数据库文件 | 1 |
| 备份文件 | 1 |
| 其他 | 6 |
| **总计** | **30** |

### 整理后（主目录）

| 类型 | 数量 |
|------|------|
| 配置文件 | 10 |
| 源代码文件 | 5 |
| 核心文档 | 3 |
| **总计** | **18** |

**减少**: 40%

## ✅ 整理的好处

### 1. 更清晰的结构

- 文档按类型分类
- 旧文档被归档
- 数据库文档集中

### 2. 更易于查找

- 数据库相关 → `docs/database/`
- 工具使用 → `docs/tools/`
- 历史文档 → `docs/archive/`

### 3. 更专业

- 符合项目最佳实践
- 清晰的目录结构
- 完整的文档说明

### 4. 更易维护

- 新文档有固定位置
- 旧文档不会混淆
- 备份文件集中管理

## 🔄 迁移注意事项

### 1. 更新链接

整理后需要更新以下文档中的链接：
- `README.md`
- `docs/README.md`
- 其他引用这些文件的文档

### 2. Git 历史

使用 `git mv` 命令移动文件，保留 Git 历史：

```bash
git mv "数据库连接信息.md" docs/database/connection-info.md
```

### 3. 备份

整理前先备份重要文件：

```bash
# 创建备份
tar -czf backup-$(date +%Y%m%d).tar.gz *.md *.sql
```

## 📞 建议

### 立即执行

1. ✅ 移动备份文件到 `backups/`
2. ✅ 归档旧文档到 `docs/archive/`
3. ✅ 移动数据库文档到 `docs/database/`

### 可选执行

1. ⬜ 移动工具文档到 `docs/tools/`
2. ⬜ 创建各目录的 README.md
3. ⬜ 更新所有文档链接

### 暂不执行

1. ⬜ 删除任何文件（先归档）
2. ⬜ 修改配置文件位置
3. ⬜ 移动源代码文件

## 🎯 执行优先级

### 高优先级 ⭐⭐⭐

- 移动备份文件
- 归档旧文档
- 创建数据库文档目录

### 中优先级 ⭐⭐

- 移动数据库文档
- 创建工具文档目录
- 创建目录说明文档

### 低优先级 ⭐

- 更新文档链接
- 优化目录结构
- 添加更多说明

---

**建议**: 先执行高优先级任务，确保主目录更清爽，然后逐步完善其他部分。

**预计时间**: 15-20 分钟

**风险**: 低（主要是移动文件，不删除）

**收益**: 高（主目录更清晰，文档更易管理）
