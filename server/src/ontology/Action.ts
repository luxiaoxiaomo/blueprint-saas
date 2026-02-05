/**
 * Action 基类 - 封装业务操作
 * 所有写操作都应该通过 Action 执行
 */

import { ActionContext, ActionResult, Permission } from './types.js';
import { IOntologyService } from './OntologyService.js';
import { AuditService } from '../services/AuditService.js';
import { PermissionService } from '../services/PermissionService.js';

/**
 * Action 接口
 */
export interface IAction<TInput, TOutput> {
  name: string;
  description: string;
  permissions: Permission[];
  
  /**
   * 验证输入和权限
   */
  validate(input: TInput, context: ActionContext): Promise<void>;
  
  /**
   * 执行操作
   */
  execute(input: TInput, context: ActionContext): Promise<TOutput>;
  
  /**
   * 记录审计日志
   */
  audit(input: TInput, output: TOutput, context: ActionContext): Promise<void>;
}

/**
 * Action 基类
 */
export abstract class Action<TInput, TOutput> implements IAction<TInput, TOutput> {
  abstract name: string;
  abstract description: string;
  abstract permissions: Permission[];
  
  constructor(
    protected ontology: IOntologyService,
    protected auditService?: AuditService,
    protected permissionService?: PermissionService
  ) {}
  
  /**
   * 运行 Action - 完整的执行流程
   */
  async run(input: TInput, context: ActionContext): Promise<ActionResult<TOutput>> {
    try {
      // 1. 验证权限和输入
      await this.validate(input, context);
      
      // 2. 执行操作
      const output = await this.execute(input, context);
      
      // 3. 记录审计日志
      await this.audit(input, output, context);
      
      return {
        success: true,
        data: output,
      };
    } catch (error) {
      // 记录错误
      await this.logError(error, input, context);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * 验证输入和权限（子类可以覆盖）
   */
  async validate(input: TInput, context: ActionContext): Promise<void> {
    // 默认实现：检查权限
    await this.checkPermissions(context);
  }
  
  /**
   * 执行操作（子类必须实现）
   */
  abstract execute(input: TInput, context: ActionContext): Promise<TOutput>;
  
  /**
   * 记录审计日志（子类可以覆盖）
   */
  async audit(input: TInput, output: TOutput, context: ActionContext): Promise<void> {
    if (!this.auditService) return;
    
    // 提取资源类型和ID
    const resourceType = this.extractResourceType();
    const resourceId = this.extractResourceId(output);
    
    await this.auditService.log({
      userId: context.userId,
      action: this.name,
      resourceType,
      resourceId,
      details: {
        input,
        output,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }
  
  /**
   * 提取资源类型
   */
  protected extractResourceType(): string {
    // 从 Action 名称中提取资源类型
    // 例如: CreateProject -> Project, UpdateModule -> Module
    const match = this.name.match(/(Create|Update|Delete|Archive)(\w+)/);
    return match ? match[2] : 'Unknown';
  }
  
  /**
   * 提取资源ID
   */
  protected extractResourceId(output: TOutput): string | undefined {
    // 尝试从输出中提取ID
    if (output && typeof output === 'object' && 'id' in output) {
      return (output as any).id;
    }
    return undefined;
  }
  
  /**
   * 检查权限
   */
  protected async checkPermissions(context: ActionContext, resourceId?: string): Promise<void> {
    // 如果没有配置权限服务，跳过权限检查
    if (!this.permissionService) {
      return;
    }
    
    // 如果 Action 不需要权限，跳过检查
    if (this.permissions.length === 0) {
      return;
    }
    
    // 检查用户是否拥有所需权限
    const result = await this.permissionService.check(
      context.userId,
      this.permissions,
      resourceId
    );
    
    if (!result.allowed) {
      throw new Error(result.reason || '权限不足');
    }
  }
  
  /**
   * 记录错误
   */
  protected async logError(
    error: unknown,
    input: TInput,
    context: ActionContext
  ): Promise<void> {
    console.error(`Action ${this.name} failed:`, error);
    
    if (this.auditService) {
      const resourceType = this.extractResourceType();
      
      await this.auditService.log({
        userId: context.userId,
        action: `${this.name}_FAILED`,
        resourceType,
        details: {
          input,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    }
  }
}
