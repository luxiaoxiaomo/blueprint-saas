import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// 优先使用 DATABASE_URL，如果不存在则使用单独的环境变量
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'blueprint_saas',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    };

export const pool = new Pool(connectionConfig);

// 测试数据库连接
export async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 测试查询
    const result = await client.query('SELECT NOW()');
    console.log('✅ 数据库查询测试成功:', result.rows[0].now);
    
    client.release();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}
