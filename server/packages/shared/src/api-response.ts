/**
 * 职责:API 统一响应契约类型——与全局信封拦截器(apps/api)的输出结构保持一致
 * 关联任务:PKG-02;规范:CONVENTIONS.md §4.1
 */

/** 统一响应包:code=0 成功;非 0 为 AppErrorCode */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T | null;
  requestId: string;
}

/** 分页请求查询参数(各模块 DTO 继承公共字段,避免重复定义) */
export interface PageQuery {
  page: number;
  pageSize: number;
}

/** 分页响应数据体 */
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
