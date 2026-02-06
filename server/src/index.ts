import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { initRedis, closeRedis } from './redis.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import moduleRoutes from './routes/modules.js';
import entityRoutes from './routes/entities.js';
import taskRoutes from './routes/tasks.js';
import linkRoutes from './routes/links.js';
import importRoutes from './routes/import.js';
import auditRoutes from './routes/audit.js';
import memberRoutes from './routes/members.js';
import departmentRoutes from './routes/departments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/import', importRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/departments', departmentRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 健康检查（Railway 可能会检查这个）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
async function startServer() {
  try {
    await initDatabase();
    
    // Redis 是可选的，连接失败不影响启动
    try {
      await initRedis();
    } catch (error) {
      console.warn('⚠️  Redis 连接失败，系统将在没有缓存的情况下运行');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📊 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ 本体论架构已集成`);
      console.log(`✅ 企业级 SaaS 升级 - 第一阶段启动`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('⚠️  收到 SIGTERM 信号，正在关闭服务器...');
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  收到 SIGINT 信号，正在关闭服务器...');
  await closeRedis();
  process.exit(0);
});

startServer();
