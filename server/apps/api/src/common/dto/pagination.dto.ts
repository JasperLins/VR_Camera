/**
 * 职责:分页查询公共 DTO——各业务模块的列表查询 DTO 继承本类,禁止重复声明 page/pageSize 字段
 * 关联任务:PKG-02(CONVENTIONS.md §1 公共抽取)
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ description: '页码,从 1 开始', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: '每页条数,1-100', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  /** 跳过行数(服务层组装 LIMIT/OFFSET 用) */
  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }
}
