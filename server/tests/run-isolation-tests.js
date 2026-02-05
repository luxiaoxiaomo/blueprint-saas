#!/usr/bin/env node

/**
 * 数据隔离测试运行脚本
 * 运行所有数据隔离相关的测试
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 开始运行数据隔离测试...\n');

// 测试文件列表
const testFiles = [
  'integration/test-data-isolation.js',
  'integration/test-api-isolation.js',
];

let passedTests = 0;
let failedTests = 0;

/**
 * 运行单个测试文件
 */
function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`📝 运行测试: ${testFile}`);
    console.log('─'.repeat(60));

    const testPath = path.join(__dirname, testFile);
    const vitest = spawn('npx', ['vitest', 'run', testPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });

    vitest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} 通过\n`);
        passedTests++;
      } else {
        console.log(`❌ ${testFile} 失败\n`);
        failedTests++;
      }
      resolve();
    });

    vitest.on('error', (error) => {
      console.error(`❌ 运行 ${testFile} 时出错:`, error);
      failedTests++;
      resolve();
    });
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    // 运行所有测试
    for (const testFile of testFiles) {
      await runTest(testFile);
    }

    // 输出总结
    console.log('═'.repeat(60));
    console.log('📊 测试总结');
    console.log('═'.repeat(60));
    console.log(`✅ 通过: ${passedTests}`);
    console.log(`❌ 失败: ${failedTests}`);
    console.log(`📈 总计: ${passedTests + failedTests}`);
    console.log('═'.repeat(60));

    // 返回退出码
    process.exit(failedTests > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ 测试运行出错:', error);
    process.exit(1);
  }
}

main();
