import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

console.log(`Starting server on port ${PORT}`);
console.log(`CORS Origin: ${corsOrigin}`);

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      CORS_ORIGIN: corsOrigin
    }
  });
});

app.get('/api/health', (req, res) => {
  console.log('API health check requested');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// 登录
app.post('/api/auth/login', (req, res) => {
  res.json({ 
    token: 'test-token', 
    user: { id: '1', email: 'test@example.com', name: 'Test User' } 
  });
});

// 注册
app.post('/api/auth/register', (req, res) => {
  res.json({ 
    token: 'test-token', 
    user: { id: '1', email: 'test@example.com', name: 'Test User' } 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on 0.0.0.0:${PORT}`);
});
