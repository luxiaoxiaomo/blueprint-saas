import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    console.log('📝 注册请求:', { email: req.body.email, name: req.body.name });
    
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      console.log('❌ 缺少必要信息');
      return res.status(400).json({ error: '请提供完整的注册信息' });
    }

    console.log('📊 检查邮箱是否已存在:', email);
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      console.log('❌ 邮箱已被注册:', email);
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    console.log('🔐 加密密码...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('💾 创建用户...');
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name]
    );

    const user = result.rows[0];
    console.log('✅ 用户创建成功:', { id: user.id, email: user.email });
    
    console.log('🎫 生成 JWT token...');
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET 未配置！');
      return res.status(500).json({ error: '服务器配置错误' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ Token 生成成功');

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('❌ 注册错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('错误堆栈:', errorStack);
    res.status(500).json({ error: '注册失败', details: errorMessage });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 登录请求:', { email: req.body.email });
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ 缺少邮箱或密码');
      return res.status(400).json({ error: '请提供邮箱和密码' });
    }

    console.log('📊 查询用户:', email);
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('❌ 用户不存在:', email);
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const user = result.rows[0];
    console.log('✅ 找到用户:', { id: user.id, email: user.email });
    
    console.log('🔑 验证密码...');
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      console.log('❌ 密码错误');
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    console.log('✅ 密码正确');
    console.log('🎫 生成 JWT token...');
    
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET 未配置！');
      return res.status(500).json({ error: '服务器配置错误' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ Token 生成成功');

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('❌ 登录错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('错误堆栈:', errorStack);
    res.status(500).json({ error: '登录失败', details: errorMessage });
  }
});

export default router;
