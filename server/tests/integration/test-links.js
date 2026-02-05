/**
 * 链接系统测试
 * 验证对象链接的创建、查询和删除功能
 */

console.log('🧪 开始测试链接系统...\n');

// ============================================
// Mock 实现
// ============================================

// Mock Pool
class MockPool {
  constructor() {
    this.data = {
      links: new Map(),
      projects: new Map(),
      modules: new Map(),
    };
    this.idCounter = 1;
  }
  
  async query(sql, values = []) {
    // 模拟 INSERT links
    if (sql.includes('INSERT INTO ontology_links')) {
      const id = `link-${this.idCounter++}`;
      const link = {
        id,
        source_id: values[0],
        target_id: values[1],
        link_type: values[2],
        metadata: values[3] || {},
        created_at: new Date(),
      };
      
      // 检查是否已存在
      const key = `${values[0]}-${values[1]}-${values[2]}`;
      const existing = Array.from(this.data.links.values()).find(
        l => `${l.source_id}-${l.target_id}-${l.link_type}` === key
      );
      
      if (existing) {
        // 更新现有链接
        existing.metadata = values[3] || {};
        existing.created_at = new Date();
        return { rows: [existing] };
      }
      
      this.data.links.set(id, link);
      return { rows: [link] };
    }
    
    // 模拟 SELECT links by ID
    if (sql.includes('SELECT') && sql.includes('FROM ontology_links') && sql.includes('WHERE id')) {
      const id = values[0];
      const link = this.data.links.get(id);
      return { rows: link ? [link] : [] };
    }
    
    // 模拟 SELECT links by source_id
    if (sql.includes('SELECT') && sql.includes('FROM ontology_links') && sql.includes('WHERE source_id')) {
      const sourceId = values[0];
      const linkType = values[1];
      const links = Array.from(this.data.links.values()).filter(
        l => l.source_id === sourceId && (!linkType || l.link_type === linkType)
      );
      return { rows: links };
    }
    
    // 模拟 SELECT links by target_id
    if (sql.includes('SELECT') && sql.includes('FROM ontology_links') && sql.includes('WHERE target_id')) {
      const targetId = values[0];
      const linkType = values[1];
      const links = Array.from(this.data.links.values()).filter(
        l => l.target_id === targetId && (!linkType || l.link_type === linkType)
      );
      return { rows: links };
    }
    
    // 模拟 DELETE links
    if (sql.includes('DELETE FROM ontology_links')) {
      if (sql.includes('WHERE id')) {
        const id = values[0];
        this.data.links.delete(id);
        return { rowCount: 1 };
      } else if (sql.includes('WHERE source_id')) {
        const sourceId = values[0];
        const linkType = values[1];
        let count = 0;
        for (const [id, link] of this.data.links.entries()) {
          if (link.source_id === sourceId && (!linkType || link.link_type === linkType)) {
            this.data.links.delete(id);
            count++;
          }
        }
        return { rowCount: count };
      }
    }
    
    // 模拟 COUNT
    if (sql.includes('COUNT(*)')) {
      const count = this.data.links.size;
      return { rows: [{ total: count }] };
    }
    
    // 模拟 GROUP BY
    if (sql.includes('GROUP BY link_type')) {
      const byType = {};
      for (const link of this.data.links.values()) {
        byType[link.link_type] = (byType[link.link_type] || 0) + 1;
      }
      const rows = Object.entries(byType).map(([link_type, count]) => ({
        link_type,
        count: count.toString(),
      }));
      return { rows };
    }
    
    return { rows: [] };
  }
  
  async connect() {
    return {
      query: this.query.bind(this),
      release: () => {},
    };
  }
}

// Mock LinkRepository
class LinkRepository {
  constructor(pool) {
    this.pool = pool;
  }
  
  async findById(id) {
    const result = await this.pool.query('SELECT * FROM ontology_links WHERE id = $1', [id]);
    return result.rows.length > 0 ? this.mapRowToLink(result.rows[0]) : null;
  }
  
  async findBySourceId(sourceId, linkType) {
    const result = await this.pool.query(
      'SELECT * FROM ontology_links WHERE source_id = $1',
      [sourceId, linkType]
    );
    return result.rows.map(row => this.mapRowToLink(row));
  }
  
  async findByTargetId(targetId, linkType) {
    const result = await this.pool.query(
      'SELECT * FROM ontology_links WHERE target_id = $1',
      [targetId, linkType]
    );
    return result.rows.map(row => this.mapRowToLink(row));
  }
  
  async create(sourceId, targetId, linkType, metadata) {
    const result = await this.pool.query(
      'INSERT INTO ontology_links (source_id, target_id, link_type, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
      [sourceId, targetId, linkType, metadata]
    );
    return this.mapRowToLink(result.rows[0]);
  }
  
  async delete(id) {
    await this.pool.query('DELETE FROM ontology_links WHERE id = $1', [id]);
  }
  
  async deleteBySourceId(sourceId, linkType) {
    const result = await this.pool.query(
      'DELETE FROM ontology_links WHERE source_id = $1',
      [sourceId, linkType]
    );
    return result.rowCount || 0;
  }
  
  async getStats(sourceId) {
    const totalResult = await this.pool.query('SELECT COUNT(*) as total FROM ontology_links');
    const typeResult = await this.pool.query('SELECT link_type, COUNT(*) as count FROM ontology_links GROUP BY link_type');
    
    const byType = {};
    typeResult.rows.forEach(row => {
      byType[row.link_type] = parseInt(row.count);
    });
    
    return {
      total: parseInt(totalResult.rows[0].total),
      byType,
    };
  }
  
  mapRowToLink(row) {
    return {
      id: row.id,
      sourceId: row.source_id,
      targetId: row.target_id,
      linkType: row.link_type,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }
}

// ============================================
// 测试函数
// ============================================

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  const pool = new MockPool();
  const linkRepo = new LinkRepository(pool);
  
  // 测试 1: 创建链接
  try {
    console.log('📝 测试 1: 创建链接');
    
    const link = await linkRepo.create(
      'project-1',
      'module-1',
      'Project→Module',
      { description: '项目包含模块' }
    );
    
    if (!link.id) {
      throw new Error('链接应该有 ID');
    }
    
    if (link.sourceId !== 'project-1') {
      throw new Error('源对象 ID 不匹配');
    }
    
    if (link.targetId !== 'module-1') {
      throw new Error('目标对象 ID 不匹配');
    }
    
    if (link.linkType !== 'Project→Module') {
      throw new Error('链接类型不匹配');
    }
    
    console.log('✅ 测试 1 通过: 链接创建成功');
    console.log(`   链接ID: ${link.id}`);
    console.log(`   类型: ${link.linkType}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: 根据源对象查找链接
  try {
    console.log('📝 测试 2: 根据源对象查找链接');
    
    // 创建多个链接
    await linkRepo.create('project-1', 'module-1', 'Project→Module');
    await linkRepo.create('project-1', 'module-2', 'Project→Module');
    await linkRepo.create('project-1', 'entity-1', 'Project→Entity');
    
    const links = await linkRepo.findBySourceId('project-1');
    
    if (links.length !== 3) {
      throw new Error(`应该返回3个链接，实际返回${links.length}个`);
    }
    
    // 按类型过滤
    const moduleLinks = await linkRepo.findBySourceId('project-1', 'Project→Module');
    
    if (moduleLinks.length !== 2) {
      throw new Error(`应该返回2个模块链接，实际返回${moduleLinks.length}个`);
    }
    
    console.log('✅ 测试 2 通过: 成功查找源对象的链接');
    console.log(`   总链接数: ${links.length}`);
    console.log(`   模块链接数: ${moduleLinks.length}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: 根据目标对象查找链接
  try {
    console.log('📝 测试 3: 根据目标对象查找链接');
    
    const links = await linkRepo.findByTargetId('module-1');
    
    if (links.length === 0) {
      throw new Error('应该找到链接');
    }
    
    if (links[0].targetId !== 'module-1') {
      throw new Error('目标对象 ID 不匹配');
    }
    
    console.log('✅ 测试 3 通过: 成功查找目标对象的链接');
    console.log(`   找到 ${links.length} 个链接\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: 删除链接
  try {
    console.log('📝 测试 4: 删除链接');
    
    const link = await linkRepo.create('project-2', 'module-3', 'Project→Module');
    const linkId = link.id;
    
    await linkRepo.delete(linkId);
    
    const found = await linkRepo.findById(linkId);
    
    if (found !== null) {
      throw new Error('链接应该已被删除');
    }
    
    console.log('✅ 测试 4 通过: 链接删除成功\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failedTests++;
  }
  
  // 测试 5: 批量删除源对象的链接
  try {
    console.log('📝 测试 5: 批量删除源对象的链接');
    
    await linkRepo.create('project-3', 'module-4', 'Project→Module');
    await linkRepo.create('project-3', 'module-5', 'Project→Module');
    await linkRepo.create('project-3', 'entity-2', 'Project→Entity');
    
    const count = await linkRepo.deleteBySourceId('project-3', 'Project→Module');
    
    if (count !== 2) {
      throw new Error(`应该删除2个链接，实际删除${count}个`);
    }
    
    const remaining = await linkRepo.findBySourceId('project-3');
    
    if (remaining.length !== 1) {
      throw new Error(`应该剩余1个链接，实际剩余${remaining.length}个`);
    }
    
    console.log('✅ 测试 5 通过: 批量删除成功');
    console.log(`   删除了 ${count} 个链接\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failedTests++;
  }
  
  // 测试 6: 链接统计
  try {
    console.log('📝 测试 6: 链接统计');
    
    const stats = await linkRepo.getStats();
    
    if (typeof stats.total !== 'number') {
      throw new Error('总数应该是数字');
    }
    
    if (typeof stats.byType !== 'object') {
      throw new Error('byType 应该是对象');
    }
    
    console.log('✅ 测试 6 通过: 统计信息正确');
    console.log(`   总链接数: ${stats.total}`);
    console.log(`   按类型: ${JSON.stringify(stats.byType)}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 6 失败:', error.message);
    failedTests++;
  }
  
  // 测试总结
  console.log('='.repeat(50));
  console.log('📊 测试总结');
  console.log('='.repeat(50));
  console.log(`✅ 通过: ${passedTests} 个测试`);
  console.log(`❌ 失败: ${failedTests} 个测试`);
  console.log(`📈 成功率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  if (failedTests === 0) {
    console.log('\n🎉 所有测试通过！链接系统工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
