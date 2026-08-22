/**
 * 职责:生成任务入参 DTO——创建/取消(T9 契约);标签为结构化枚举,禁 prompt 字符串(O-6)
 * 关联任务:PKG-14
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { GEN_ADDONS, GEN_MATERIALS, GEN_STYLES, GEN_TEXTURES } from '@vrm/shared';

export class GenTagsDto {
  @ApiProperty({ description: '整体风格', enum: [...GEN_STYLES] })
  @IsIn(GEN_STYLES as unknown as string[])
  style!: string;

  @ApiProperty({ description: '材质', enum: [...GEN_MATERIALS] })
  @IsIn(GEN_MATERIALS as unknown as string[])
  material!: string;

  @ApiProperty({ description: '贴图精度', enum: [...GEN_TEXTURES] })
  @IsIn(GEN_TEXTURES as unknown as string[])
  texture!: string;

  @ApiProperty({ description: '附加选项', enum: [...GEN_ADDONS], type: [String] })
  @IsArray()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(GEN_ADDONS as unknown as string[], { each: true })
  addons!: string[];
}

export class CreateGenTaskDto {
  /** 上传端点占位:OSS STS 直传属人工批次,联调期可空(mock 链路不消费照片) */
  @ApiPropertyOptional({ description: '照片 OSS key(上传通道开通前可空)' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  photoOssKey?: string;

  @ApiProperty({ description: '结构化生成标签', type: GenTagsDto })
  @Type(() => GenTagsDto)
  @ValidateNested()
  tags!: GenTagsDto;
}
