/**
 * 数据库迁移执行脚本
 * 用法: node migrations/run-migration.js <migration-file>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'blueprint_saas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function runMigration(migrationFile) {
  console.log('='.repeat(60));
  console.log('🚀 开始执行数据库迁移');
  console.log('='.repeat(60));
  console.log(`📄 迁移文件: ${migrationFile}`);
  console.log(`⏰ 开始时间: ${new Date().toISOString()}`);
  console.log('');

  const migrationPath = path.join(__dirname, migrationFile);
  
  // 检查文件是否存在
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ 错误: 迁移文件不存在: ${migrationPath}`);
    process.exit(1);
  }

  // 读取 SQL 文件
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📊 准备执行迁移...');
  console.log('');

  const client = await pool.connect();
  
  try {
    // 开始事务
    await client.query('BEGIN');
    console.log('✅ 事务已开始');
    
    // 执行迁移 SQL
    console.log('⚙️  执行迁移脚本...');
    await client.query(sql);
    
    // 提交事务
    await client.query('COMMIT');
    console.log('✅ 事务已提交');
    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 迁移成功完成！');
    console.log('='.repeat(60));
    console.log(`⏰ 完成时间: ${new Date().toISOString()}`);
    
  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK');
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ 迁移失败，已回滚');
    console.error('='.repeat(60));
    console.error('错误详情:');
    console.error(error);
    console.error('');
    console.error('💡 建议:');
    console.error('1. 检查数据库连接');
    console.error('2. 验证 SQL 语法');
    console.error('3. 检查数据完整性');
    console.error('4. 查看迁移文档: server/migrations/README.md');
    process.exit(1);
    
  } finally {
    client.release();
    await pool.end();
  }
}

// 获取命令行参数
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ 错误: 请指定迁移文件');
  console.error('');
  console.error('用法:');
  console.error('  node migrations/run-migration.js <migration-file>');
  console.error('');
  console.error('示例:');
  console.error('  node migrations/run-migration.js 001_add_organization_to_projects.sql');
  process.exit(1);
}

// 执行迁移
runMigration(migrationFile).catch(error => {
  console.error('❌ 未预期的错误:', error);
  process.exit(1);
});

