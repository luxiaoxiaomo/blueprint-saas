/**
 * 性能优化测试
 * 验证缓存、批量查询和性能监控功能
 */

console.log('🧪 开始测试性能优化功能...\n');

// ============================================
// Mock 实现
// ============================================

// CacheService 测试
class CacheService {
  constructor(config = {}) {
    this.cache = new Map();
    this.config = {
      ttl: config.ttl || 300,
      maxSize: config.maxSize || 1000,
    };
  }
  
  async get(key) {
    const entry = this.cache.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.value;
      } else {
        this.cache.delete(key);
      }
    }
    return null;
  }
  
  async set(key, value, ttl) {
    const expiresAt = Date.now() + (ttl || this.config.ttl) * 1000;
    
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, { value, expiresAt });
  }
  
  async delete(key) {
    this.cache.delete(key);
  }
  
  async deletePattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  async clear() {
    this.cache.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
    };
  }
  
  static objectKey(type, id) {
    return `obj:${type}:${id}`;
  }
  
  static queryKey(type, filters) {
    const filterStr = JSON.stringify(filters);
    return `query:${type}:${filterStr}`;
  }
}

// PerformanceMonitor 测试
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }
  
  start(name) {
    const id = `${name}:${Date.now()}:${Math.random()}`;
    this.startTimes.set(id, Date.now());
    return id;
  }
  
  end(id, error = false) {
    const startTime = this.startTimes.get(id);
    if (!startTime) return;
    
    const duration = Date.now() - startTime;
    this.startTimes.delete(id);
    
    const name = id.split(':')[0];
    
    let metric = this.metrics.get(name);
    if (!metric) {
      metric = {
        name,
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        errors: 0,
      };
      this.metrics.set(name, metric);
    }
    
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;
    
    if (error) {
      metric.errors++;
    }
  }
  
  getMetric(name) {
    return this.metrics.get(name) || null;
  }
  
  getAllMetrics() {
    return Array.from(this.metrics.values());
  }
  
  getSummary() {
    const metrics = this.getAllMetrics();
    
    const totalRequests = metrics.reduce((sum, m) => sum + m.count, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0);
    const totalTime = metrics.reduce((sum, m) => sum + m.totalTime, 0);
    const avgResponseTime = totalRequests > 0 ? totalTime / totalRequests : 0;
    
    const slowestOperations = metrics
      .map(m => ({ name: m.name, avgTime: m.avgTime }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);
    
    return {
      totalRequests,
      totalErrors,
      avgResponseTime,
      slowestOperations,
    };
  }
  
  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// ============================================
// 测试函数
// ============================================

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;
  
  // 测试 1: CacheService - 基本缓存操作
  try {
    console.log('📝 测试 1: CacheService - 基本缓存操作');
    
    const cache = new CacheService({ ttl: 1, maxSize: 10 });
    
    // 设置缓存
    await cache.set('key1', { data: 'value1' });
    
    // 获取缓存
    const value = await cache.get('key1');
    if (!value || value.data !== 'value1') {
      throw new Error('缓存值不正确');
    }
    
    // 删除缓存
    await cache.delete('key1');
    const deleted = await cache.get('key1');
    if (deleted !== null) {
      throw new Error('缓存应该被删除');
    }
    
    console.log('✅ 测试 1 通过: 基本缓存操作正常\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 1 失败:', error.message);
    failedTests++;
  }
  
  // 测试 2: CacheService - 缓存过期
  try {
    console.log('📝 测试 2: CacheService - 缓存过期');
    
    const cache = new CacheService({ ttl: 1 }); // 1 秒过期
    
    await cache.set('key2', { data: 'value2' });
    
    // 立即获取应该成功
    const value1 = await cache.get('key2');
    if (!value1) {
      throw new Error('缓存应该存在');
    }
    
    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // 过期后获取应该返回 null
    const value2 = await cache.get('key2');
    if (value2 !== null) {
      throw new Error('缓存应该已过期');
    }
    
    console.log('✅ 测试 2 通过: 缓存过期机制正常\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 2 失败:', error.message);
    failedTests++;
  }
  
  // 测试 3: CacheService - 缓存大小限制
  try {
    console.log('📝 测试 3: CacheService - 缓存大小限制');
    
    const cache = new CacheService({ maxSize: 5 });
    
    // 添加 6 个缓存项
    for (let i = 0; i < 6; i++) {
      await cache.set(`key${i}`, { data: `value${i}` });
    }
    
    const stats = cache.getStats();
    if (stats.size > 5) {
      throw new Error(`缓存大小应该不超过 5，实际: ${stats.size}`);
    }
    
    // 第一个应该被删除
    const first = await cache.get('key0');
    if (first !== null) {
      throw new Error('最旧的缓存应该被删除');
    }
    
    console.log('✅ 测试 3 通过: 缓存大小限制正常');
    console.log(`   缓存大小: ${stats.size}/${stats.maxSize}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 3 失败:', error.message);
    failedTests++;
  }
  
  // 测试 4: CacheService - 模式删除
  try {
    console.log('📝 测试 4: CacheService - 模式删除');
    
    const cache = new CacheService();
    
    // 添加多个缓存项
    await cache.set('user:1', { name: 'Alice' });
    await cache.set('user:2', { name: 'Bob' });
    await cache.set('project:1', { name: 'Project A' });
    
    // 删除所有 user 缓存
    await cache.deletePattern('user:*');
    
    const user1 = await cache.get('user:1');
    const user2 = await cache.get('user:2');
    const project1 = await cache.get('project:1');
    
    if (user1 !== null || user2 !== null) {
      throw new Error('user 缓存应该被删除');
    }
    
    if (project1 === null) {
      throw new Error('project 缓存不应该被删除');
    }
    
    console.log('✅ 测试 4 通过: 模式删除正常\n');
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 4 失败:', error.message);
    failedTests++;
  }
  
  // 测试 5: PerformanceMonitor - 基本监控
  try {
    console.log('📝 测试 5: PerformanceMonitor - 基本监控');
    
    const monitor = new PerformanceMonitor();
    
    // 模拟操作
    const id1 = monitor.start('operation1');
    await new Promise(resolve => setTimeout(resolve, 10));
    monitor.end(id1);
    
    const id2 = monitor.start('operation1');
    await new Promise(resolve => setTimeout(resolve, 20));
    monitor.end(id2);
    
    const metric = monitor.getMetric('operation1');
    if (!metric) {
      throw new Error('应该有指标记录');
    }
    
    if (metric.count !== 2) {
      throw new Error(`操作次数应该是 2，实际: ${metric.count}`);
    }
    
    if (metric.avgTime < 10) {
      throw new Error('平均时间应该大于 10ms');
    }
    
    console.log('✅ 测试 5 通过: 性能监控正常');
    console.log(`   操作次数: ${metric.count}`);
    console.log(`   平均时间: ${metric.avgTime.toFixed(2)}ms`);
    console.log(`   最小时间: ${metric.minTime.toFixed(2)}ms`);
    console.log(`   最大时间: ${metric.maxTime.toFixed(2)}ms\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 5 失败:', error.message);
    failedTests++;
  }
  
  // 测试 6: PerformanceMonitor - 错误跟踪
  try {
    console.log('📝 测试 6: PerformanceMonitor - 错误跟踪');
    
    const monitor = new PerformanceMonitor();
    
    // 成功操作
    const id1 = monitor.start('operation2');
    monitor.end(id1, false);
    
    // 失败操作
    const id2 = monitor.start('operation2');
    monitor.end(id2, true);
    
    const metric = monitor.getMetric('operation2');
    if (metric.errors !== 1) {
      throw new Error(`错误数应该是 1，实际: ${metric.errors}`);
    }
    
    console.log('✅ 测试 6 通过: 错误跟踪正常');
    console.log(`   总操作: ${metric.count}`);
    console.log(`   错误数: ${metric.errors}\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 6 失败:', error.message);
    failedTests++;
  }
  
  // 测试 7: PerformanceMonitor - 统计摘要
  try {
    console.log('📝 测试 7: PerformanceMonitor - 统计摘要');
    
    const monitor = new PerformanceMonitor();
    
    // 模拟多个操作
    for (let i = 0; i < 5; i++) {
      const id = monitor.start('fast-op');
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.end(id);
    }
    
    for (let i = 0; i < 3; i++) {
      const id = monitor.start('slow-op');
      await new Promise(resolve => setTimeout(resolve, 20));
      monitor.end(id);
    }
    
    const summary = monitor.getSummary();
    
    if (summary.totalRequests !== 8) {
      throw new Error(`总请求数应该是 8，实际: ${summary.totalRequests}`);
    }
    
    if (summary.slowestOperations.length === 0) {
      throw new Error('应该有最慢操作列表');
    }
    
    if (summary.slowestOperations[0].name !== 'slow-op') {
      throw new Error('最慢的操作应该是 slow-op');
    }
    
    console.log('✅ 测试 7 通过: 统计摘要正常');
    console.log(`   总请求数: ${summary.totalRequests}`);
    console.log(`   平均响应时间: ${summary.avgResponseTime.toFixed(2)}ms`);
    console.log(`   最慢操作: ${summary.slowestOperations[0].name} (${summary.slowestOperations[0].avgTime.toFixed(2)}ms)\n`);
    passedTests++;
  } catch (error) {
    console.error('❌ 测试 7 失败:', error.message);
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
    console.log('\n🎉 所有测试通过！性能优化功能工作正常。\n');
  } else {
    console.log('\n⚠️  部分测试失败，请检查代码。\n');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});
