import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// CORS 配置
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 简单的登录端点用于测试
app.post('/api/auth/login', (req, res) => {
  res.json({ 
    token: 'test-token', 
    user: { id: '1', email: 'test@example.com', name: 'Test User' } 
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({ 
    token: 'test-token', 
    user: { id: '1', email: 'test@example.com', name: 'Test User' } 
  });
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 简单服务器启动在 0.0.0.0:${PORT}`);
  console.log(`🔐 CORS Origin: ${corsOrigin}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM，关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT，关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
