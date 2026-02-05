/**
 * 成员管理集成测试
 * 测试成员分配、转移和角色更新功能
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'blueprint_saas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// 测试数据
let testOrganizationId;
let testUserId;
let testMemberId;
let testDepartmentId1;
let testDepartmentId2;

async function setup() {
  console.log('🔧 设置测试环境...');
  
  // 创建测试用户
  const userResult = await pool.query(`
    INSERT INTO users (email, password, name)
    VALUES ('test-member@example.com', 'hashed_password', 'Test Member User')
    RETURNING id
  `);
  testUserId = userResult.rows[0].id;
  
  // 创建测试组织
  const orgResult = await pool.query(`
    INSERT INTO organizations (name, identifier, owner_id, plan)
    VALUES ('Test Member Org', 'test-member-org', $1, 'professional')
    RETURNING id
  `, [testUserId]);
  testOrganizationId = orgResult.rows[0].id;
  
  // 创建测试部门
  const dept1Result = await pool.query(`
    INSERT INTO departments (organization_id, name, path, level)
    VALUES ($1, 'Engineering', '', 0)
    RETURNING id
  `, [testOrganizationId]);
  testDepartmentId1 = dept1Result.rows[0].id;
  
  // 更新部门路径
  await pool.query(`
    UPDATE departments SET path = $1 WHERE id = $2
  `, [`/${testDepartmentId1}`, testDepartmentId1]);
  
  const dept2Result = await pool.query(`
    INSERT INTO departments (organization_id, name, path, level)
    VALUES ($1, 'Product', '', 0)
    RETURNING id
  `, [testOrganizationId]);
  testDepartmentId2 = dept2Result.rows[0].id;
  
  // 更新部门路径
  await pool.query(`
    UPDATE departments SET path = $1 WHERE id = $2
  `, [`/${testDepartmentId2}`, testDepartmentId2]);
  
  // 创建测试成员
  const memberResult = await pool.query(`
    INSERT INTO members (organization_id, user_id, role, status, joined_at)
    VALUES ($1, $2, 'developer', 'active', CURRENT_TIMESTAMP)
    RETURNING id
  `, [testOrganizationId, testUserId]);
  testMemberId = memberResult.rows[0].id;
  
  console.log('✅ 测试环境设置完成');
  console.log(`   组织 ID: ${testOrganizationId}`);
  console.log(`   用户 ID: ${testUserId}`);
  console.log(`   成员 ID: ${testMemberId}`);
  console.log(`   部门 1 ID: ${testDepartmentId1}`);
  console.log(`   部门 2 ID: ${testDepartmentId2}`);
}

async function cleanup() {
  console.log('🧹 清理测试数据...');
  
  try {
    // 删除测试数据（级联删除）
    if (testOrganizationId) {
      await pool.query('DELETE FROM organizations WHERE id = $1', [testOrganizationId]);
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    
    console.log('✅ 测试数据清理完成');
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  }
}

async function testAssignMemberToDepartment() {
  console.log('\n📝 测试 1: 分配成员到部门');
  
  try {
    // 分配成员到部门 1
    const result = await pool.query(`
      UPDATE members
      SET department_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [testDepartmentId1, testMemberId]);
    
    const member = result.rows[0];
    
    if (member.department_id === testDepartmentId1) {
      console.log('✅ 成员成功分配到部门 1');
    } else {
      throw new Error('部门分配失败');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }
}

async function testTransferMember() {
  console.log('\n📝 测试 2: 转移成员到另一个部门');
  
  try {
    // 转移成员从部门 1 到部门 2
    const result = await pool.query(`
      UPDATE members
      SET department_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND department_id = $3
      RETURNING *
    `, [testDepartmentId2, testMemberId, testDepartmentId1]);
    
    if (result.rows.length === 0) {
      throw new Error('成员转移失败：当前部门不匹配');
    }
    
    const member = result.rows[0];
    
    if (member.department_id === testDepartmentId2) {
      console.log('✅ 成员成功转移到部门 2');
    } else {
      throw new Error('部门转移失败');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }
}

async function testUpdateMemberRole() {
  console.log('\n📝 测试 3: 更新成员角色');
  
  try {
    // 更新成员角色从 developer 到 architect
    const result = await pool.query(`
      UPDATE members
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, ['architect', testMemberId]);
    
    const member = result.rows[0];
    
    if (member.role === 'architect') {
      console.log('✅ 成员角色成功更新为 architect');
    } else {
      throw new Error('角色更新失败');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }
}

async function testMemberUniqueness() {
  console.log('\n📝 测试 4: 验证成员唯一性（一个成员只属于一个部门）');
  
  try {
    // 查询成员的部门
    const result = await pool.query(`
      SELECT department_id FROM members WHERE id = $1
    `, [testMemberId]);
    
    const member = result.rows[0];
    
    if (member.department_id === testDepartmentId2) {
      console.log('✅ 成员唯一性验证通过：成员只属于一个部门');
    } else {
      throw new Error('成员唯一性验证失败');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }
}

async function testFindMembersByDepartment() {
  console.log('\n📝 测试 5: 查询部门的所有成员');
  
  try {
    const result = await pool.query(`
      SELECT * FROM members WHERE department_id = $1
    `, [testDepartmentId2]);
    
    console.log(`✅ 找到 ${result.rows.length} 个成员在部门 2`);
    
    if (result.rows.length > 0) {
      console.log('   成员列表:');
      result.rows.forEach(member => {
        console.log(`   - ${member.id} (角色: ${member.role})`);
      });
    }
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }
}

async function runTests() {
  console.log('🚀 开始成员管理集成测试\n');
  console.log('=' .repeat(60));
  
  try {
    await setup();
    
    await testAssignMemberToDepartment();
    await testTransferMember();
    await testUpdateMemberRole();
    await testMemberUniqueness();
    await testFindMembersByDepartment();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试通过！');
    console.log('=' .repeat(60));
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error('❌ 测试失败:', error.message);
    console.log('=' .repeat(60));
    process.exit(1);
  } finally {
    await cleanup();
    await pool.end();
  }
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试运行失败:', error);
  process.exit(1);
});
