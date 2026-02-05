/**
 * 租户上下文服务
 * 用于管理当前请求的租户（组织）上下文
 * 确保所有数据操作都在正确的租户范围内
 */

import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  organizationId: string;
  userId: string;
  userEmail: string;
  userRole?: string;
}

class TenantContextService {
  private asyncLocalStorage: AsyncLocalStorage<TenantContext>;

  constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage<TenantContext>();
  }

  /**
   * 运行带租户上下文的函数
   */
  run<T>(context: TenantContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * 获取当前租户上下文
   */
  getContext(): TenantContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * 获取当前组织ID
   * @throws Error 如果上下文不存在
   */
  getOrganizationId(): string {
    const context = this.getContext();
    if (!context) {
      throw new Error('租户上下文未设置。请确保请求经过租户中间件处理。');
    }
    return context.organizationId;
  }

  /**
   * 获取当前用户ID
   * @throws Error 如果上下文不存在
   */
  getUserId(): string {
    const context = this.getContext();
    if (!context) {
      throw new Error('租户上下文未设置。请确保请求经过租户中间件处理。');
    }
    return context.userId;
  }

  /**
   * 获取当前用户邮箱
   * @throws Error 如果上下文不存在
   */
  getUserEmail(): string {
    const context = this.getContext();
    if (!context) {
      throw new Error('租户上下文未设置。请确保请求经过租户中间件处理。');
    }
    return context.userEmail;
  }

  /**
   * 检查是否有租户上下文
   */
  hasContext(): boolean {
    return this.getContext() !== undefined;
  }

  /**
   * 验证资源是否属于当前租户
   * @param resourceOrganizationId 资源的组织ID
   * @throws Error 如果资源不属于当前租户
   */
  validateResourceAccess(resourceOrganizationId: string): void {
    const currentOrgId = this.getOrganizationId();
    if (resourceOrganizationId !== currentOrgId) {
      throw new Error(
        `访问被拒绝：资源属于组织 ${resourceOrganizationId}，但当前上下文是组织 ${currentOrgId}`
      );
    }
  }
}

// 导出单例
export const tenantContext = new TenantContextService();
export type { TenantContext };
