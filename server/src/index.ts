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

// CORS 配置
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
console.log(`🔐 CORS Origin: ${corsOrigin}`);

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
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
    console.log('🔧 正在启动服务器...');
    console.log(`📝 环境变量检查:`);
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   - PORT: ${process.env.PORT}`);
    console.log(`   - DB_HOST: ${process.env.DB_HOST ? '已设置' : '未设置'}`);
    console.log(`   - CORS_ORIGIN: ${corsOrigin}`);
    
    // 先启动服务器，数据库初始化失败不影响启动
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ 服务器成功启动在 0.0.0.0:${PORT}`);
      console.log(`📊 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔐 CORS 已启用，允许来自: ${corsOrigin}`);
    });
    
    // 异步初始化数据库
    initDatabase().catch(err => {
      console.error('❌ 数据库初始化失败:', err);
      console.warn('⚠️  服务器将继续运行，但数据库功能可能不可用');
    });
    
    // Redis 是可选的
    initRedis().catch(err => {
      console.warn('⚠️  Redis 连接失败，系统将在没有缓存的情况下运行');
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
