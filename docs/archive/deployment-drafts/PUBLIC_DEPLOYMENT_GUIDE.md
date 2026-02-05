# 蓝图 AI 公网部署完整指南

**项目**: 蓝图 AI 系统架构梳理工具  
**版本**: Phase 1  
**最后更新**: 2026-01-28

---

## 📖 文档导航

### 快速开始

1. **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** - 部署概览和快速指南
   - 部署架构
   - 快速部署（5 分钟）
   - 部署验证

2. **[PRODUCTION_DEPLOYMENT_CHECKLIST.md](PRODUCTION_DEPLOYMENT_CHECKLIST.md)** - 完整部署清单
   - 部署前准备
   - 详细部署步骤
   - 部署验证
   - 常见问题

3. **[deploy.sh](deploy.sh)** - 自动化部署脚本
   - 一键部署
   - 自动配置
   - 自动优化

### 部署后

4. **[OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md)** - 运维指南
   - 日常检查
   - 故障排查
   - 性能优化
   - 备份恢复

5. **[NEXT_STEPS_AFTER_DEPLOYMENT.md](NEXT_STEPS_AFTER_DEPLOYMENT.md)** - 部署后行动计划
   - 第 1 周行动
   - 用户上线
   - Phase 2 规划
   - 成功指标

### 参考文档

6. **[server/DEPLOYMENT_GUIDE.md](server/DEPLOYMENT_GUIDE.md)** - 详细部署指南
   - Docker 部署
   - 传统部署
   - 环境配置
   - 监控和维护

7. **[server/API_DOCUMENTATION.md](server/API_DOCUMENTATION.md)** - API 文档
   - API 端点
   - 请求示例
   - 响应格式

---

## 🚀 快速部署（5 分钟）

### 前置条件

- [ ] 购买云服务器（2 核 4GB 内存）
- [ ] 购买域名
- [ ] 配置 DNS 解析
- [ ] SSH 连接到服务器

### 部署步骤

```bash
# 1. 连接到服务器
ssh root@your-server-ip

# 2. 下载部署脚本
wget https://your-repo/deploy.sh

# 3. 执行部署
bash deploy.sh your-domain.com your-db-password your-jwt-secret

# 4. 等待完成（约 5-10 分钟）

# 5. 访问应用
# 前端: https://your-domain.com
# API: https://your-domain.com/api
```

### 验证部署

```bash
# 检查容器状态
docker-compose ps

# 检查应用健康
curl https://your-domain.com/api/health

# 查看日志
docker-compose logs -f
```

---

## 📋 部署清单

### 部署前

- [ ] 代码审查完成
- [ ] 安全漏洞检查: `npm audit`
- [ ] 编译测试: `npm run build`
- [ ] 测试通过: `npm run test`
- [ ] 生成强密码
- [ ] 生成 JWT 密钥

### 部署中

- [ ] 系统初始化
- [ ] Docker 安装
- [ ] 代码克隆
- [ ] 环境配置
- [ ] 镜像构建
- [ ] 容器启动
- [ ] Nginx 配置
- [ ] SSL 配置
- [ ] 防火墙配置
- [ ] 备份配置

### 部署后

- [ ] 功能测试
- [ ] 性能测试
- [ ] 安全测试
- [ ] 备份验证
- [ ] 监控配置
- [ ] 日志配置

---

## 🔧 常见问题

### Q: 部署需要多长时间？
A: 使用自动化脚本约 5-10 分钟，手动部署约 30-60 分钟。

### Q: 需要什么样的服务器？
A: 最小配置：2 核 4GB 内存 20GB SSD。推荐配置：4 核 8GB 内存 50GB SSD。

### Q: 如何备份数据？
A: 自动备份已配置，每天 2:00 AM 执行。备份位置：`/var/backups/blueprint-ai/`

### Q: 如何恢复备份？
A: 参考 `OPERATIONS_GUIDE.md` 中的恢复步骤。

### Q: 如何监控系统？
A: 使用 `docker stats` 查看资源使用，使用 `docker-compose logs` 查看日志。

### Q: 如何扩展系统？
A: 参考 `server/DEPLOYMENT_GUIDE.md` 中的扩展部署章节。

---

## 📊 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户浏览器                          │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│                   Nginx 反向代理                         │
│              (SSL/TLS + 负载均衡)                       │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼──────────┐
│  前端应用      │      │   后端 API       │
│  (React)       │      │  (Node.js)       │
│  Port: 3000    │      │  Port: 5000      │
└────────────────┘      └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──┐  ┌──────▼──┐  ┌────▼────┐
            │PostgreSQL│  │  Redis  │  │  Logs   │
            │ Port:5432│  │ Port:6379  │         │
            └──────────┘  └─────────┘  └─────────┘
```

---

## 🔐 安全建议

### 必做项

- [ ] 修改所有默认密码
- [ ] 启用 HTTPS（Let's Encrypt）
- [ ] 配置防火墙
- [ ] 启用备份
- [ ] 配置监控告警

### 推荐项

- [ ] 启用 2FA（双因素认证）
- [ ] 配置 VPN 访问
- [ ] 启用审计日志
- [ ] 定期安全更新
- [ ] 定期渗透测试

---

## 📈 性能指标

| 指标 | 目标 | 检查方法 |
|------|------|---------|
| 可用性 | > 99.5% | 监控告警 |
| 响应时间 | < 200ms | `curl -w "@curl-format.txt"` |
| 错误率 | < 0.1% | 日志分析 |
| CPU 使用率 | < 50% | `docker stats` |
| 内存使用率 | < 60% | `docker stats` |
| 磁盘使用率 | < 70% | `df -h` |

---

## 💰 成本估算

### 小型部署（< 100 用户）

- 服务器: $10-20/月
- 域名: $10-15/年
- SSL: 免费
- **总计**: ~$15/月

### 中型部署（100-1000 用户）

- 服务器: $40-60/月
- 数据库: $20-40/月
- Redis: $10-20/月
- CDN: $5-10/月
- **总计**: ~$80/月

### 大型部署（> 1000 用户）

- 应用服务器: $100-200/月
- 数据库集群: $100-300/月
- Redis 集群: $50-100/月
- CDN: $20-50/月
- 负载均衡: $20-40/月
- **总计**: ~$350/月

---

## 🎯 部署后的下一步

### 第 1 周

- [ ] 验证系统正常运行
- [ ] 创建管理员账户
- [ ] 进行基础配置
- [ ] 测试核心功能

### 第 2-4 周

- [ ] 邀请用户
- [ ] 进行用户培训
- [ ] 监控系统
- [ ] 收集反馈

### 第 1 个月

- [ ] 性能优化
- [ ] 安全加固
- [ ] 功能改进
- [ ] 文档完善

### 第 2-3 个月

- [ ] 收集需求
- [ ] 规划 Phase 2
- [ ] 制定开发计划
- [ ] 技术准备

---

## 📞 获取帮助

### 文档

| 文档 | 用途 |
|------|------|
| `DEPLOYMENT_SUMMARY.md` | 部署概览 |
| `PRODUCTION_DEPLOYMENT_CHECKLIST.md` | 部署清单 |
| `OPERATIONS_GUIDE.md` | 运维指南 |
| `NEXT_STEPS_AFTER_DEPLOYMENT.md` | 后续行动 |
| `server/DEPLOYMENT_GUIDE.md` | 详细部署 |
| `server/API_DOCUMENTATION.md` | API 文档 |

### 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 启动服务
docker-compose up -d

# 进入容器
docker-compose exec backend sh

# 查看资源使用
docker stats
```

### 联系支持

- 技术支持: support@your-domain.com
- GitHub Issues: https://github.com/your-repo/issues
- 紧急联系: +86-xxx-xxxx-xxxx

---

## ✅ 部署完成检查清单

- [ ] 前端可以访问: https://your-domain.com
- [ ] API 可以访问: https://your-domain.com/api
- [ ] 可以创建账户
- [ ] 可以登录
- [ ] 可以创建项目
- [ ] 可以创建模块
- [ ] 可以创建实体
- [ ] 可以配置关系
- [ ] 备份已配置
- [ ] 监控已配置
- [ ] 日志已配置
- [ ] SSL 证书有效
- [ ] 防火墙已配置

---

## 🎉 恭喜！

你已经成功部署了蓝图 AI 系统！

**现在你可以**:
- ✅ 邀请用户使用
- ✅ 收集用户反馈
- ✅ 计划下一阶段功能
- ✅ 持续优化和改进

**记住**:
- 定期检查系统状态
- 定期备份数据
- 定期更新依赖
- 定期安全审计

---

**最后更新**: 2026-01-28  
**版本**: 1.0.0  
**维护者**: Kiro AI

