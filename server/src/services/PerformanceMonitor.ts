/**
 * PerformanceMonitor - 性能监控服务
 * 监控系统性能指标，包括响应时间、吞吐量、错误率等
 */

/**
 * 性能指标
 */
interface PerformanceMetric {
  name: string;
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  errors: number;
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private startTimes: Map<string, number> = new Map();
  
  /**
   * 开始计时
   */
  start(name: string): string {
    const id = `${name}:${Date.now()}:${Math.random()}`;
    this.startTimes.set(id, Date.now());
    return id;
  }
  
  /**
   * 结束计时
   */
  end(id: string, error?: boolean): void {
    const startTime = this.startTimes.get(id);
    if (!startTime) {
      return;
    }
    
    const duration = Date.now() - startTime;
    this.startTimes.delete(id);
    
    // 提取指标名称
    const name = id.split(':')[0];
    
    // 更新指标
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
  
  /**
   * 记录指标（简化版）
   */
  record(name: string, duration: number, error?: boolean): void {
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
  
  /**
   * 获取指标
   */
  getMetric(name: string): PerformanceMetric | null {
    return this.metrics.get(name) || null;
  }
  
  /**
   * 获取所有指标
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }
  
  /**
   * 获取统计摘要
   */
  getSummary(): {
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    slowestOperations: Array<{ name: string; avgTime: number }>;
  } {
    const metrics = this.getAllMetrics();
    
    const totalRequests = metrics.reduce((sum, m) => sum + m.count, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0);
    const totalTime = metrics.reduce((sum, m) => sum + m.totalTime, 0);
    const avgResponseTime = totalRequests > 0 ? totalTime / totalRequests : 0;
    
    const slowestOperations = metrics
      .map(m => ({ name: m.name, avgTime: m.avgTime }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
    
    return {
      totalRequests,
      totalErrors,
      avgResponseTime,
      slowestOperations,
    };
  }
  
  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
  
  /**
   * 打印报告
   */
  printReport(): void {
    const summary = this.getSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('性能监控报告');
    console.log('='.repeat(60));
    console.log(`总请求数: ${summary.totalRequests}`);
    console.log(`总错误数: ${summary.totalErrors}`);
    console.log(`错误率: ${summary.totalRequests > 0 ? (summary.totalErrors / summary.totalRequests * 100).toFixed(2) : 0}%`);
    console.log(`平均响应时间: ${summary.avgResponseTime.toFixed(2)}ms`);
    
    if (summary.slowestOperations.length > 0) {
      console.log('\n最慢的操作:');
      summary.slowestOperations.forEach((op, i) => {
        console.log(`  ${i + 1}. ${op.name}: ${op.avgTime.toFixed(2)}ms`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * 性能监控装饰器
 */
export function monitor(metricName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: any[]) {
      const monitor = performanceMonitor;
      const id = monitor.start(name);
      
      try {
        const result = await originalMethod.apply(this, args);
        monitor.end(id, false);
        return result;
      } catch (error) {
        monitor.end(id, true);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * 全局性能监控实例
 */
export const performanceMonitor = new PerformanceMonitor();
