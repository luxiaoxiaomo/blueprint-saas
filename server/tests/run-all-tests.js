/**
 * 运行所有测试脚本
 */

import { execSync } from 'child_process';

const tests = [
  'integration/test-ontology.js',
  'integration/test-repositories.js',
  'integration/test-audit.js',
  'integration/test-permissions.js',
  'integration/test-routes.js',
  'integration/test-links.js',
  'integration/test-enterprise.js',
  'integration/test-enterprise-actions.js',
  'integration/test-performance.js',
];

console.log('🚀 开始运行所有测试...\n');
console.log('='.repeat(60));

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const test of tests) {
  console.log(`\n📦 运行: ${test}`);
  console.log('-'.repeat(60));
  
  try {
    const output = execSync(`node ${test}`, { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    // 解析输出获取测试结果
    const passedMatch = output.match(/✅ 通过: (\d+) 个测试/);
    const failedMatch = output.match(/❌ 失败: (\d+) 个测试/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    
    totalPassed += passed;
    totalFailed += failed;
    
    results.push({
      name: test,
      passed,
      failed,
      success: failed === 0,
    });
    
    console.log(`✅ ${test}: ${passed} 通过, ${failed} 失败`);
  } catch (error) {
    console.error(`❌ ${test}: 运行失败`);
    results.push({
      name: test,
      passed: 0,
      failed: 1,
      success: false,
    });
    totalFailed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 总体测试结果');
console.log('='.repeat(60));

results.forEach(result => {
  const icon = result.success ? '✅' : '❌';
  console.log(`${icon} ${result.name.padEnd(35)} ${result.passed} 通过, ${result.failed} 失败`);
});

console.log('\n' + '='.repeat(60));
console.log(`总计: ${totalPassed} 个测试通过, ${totalFailed} 个测试失败`);
console.log(`成功率: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (totalFailed === 0) {
  console.log('\n🎉 所有测试通过！系统工作正常。\n');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查代码。\n');
  process.exit(1);
}
