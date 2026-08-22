/**
 * 职责:地理查询入参 DTO——附近内容/聚合/热门区域(M-1/M-2/M-3 契约)
 * 关联任务:PKG-10;坐标一律 WGS84(D-006)
 */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, Max, Min } from 'class-validator';
import { GEO_DEFAULTS } from '@vrm/shared';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class NearbyQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '纬度 WGS84', default: 30.259 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiPropertyOptional({ description: '经度 WGS84', default: 120.166 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ description: '查询半径(米)', default: GEO_DEFAULTS.RADIUS_METERS, enum: GEO_DEFAULTS.RADIUS_OPTIONS })
  @Type(() => Number)
  @IsIn(GEO_DEFAULTS.RADIUS_OPTIONS)
  radius: number = GEO_DEFAULTS.RADIUS_METERS;

  @ApiPropertyOptional({ description: '用户海拔(米,椭球高)', default: 10 })
  @Type(() => Number)
  @IsNumber()
  altitude: number = 10;
}

export class ClusterQueryDto {
  @ApiPropertyOptional({ description: '纬度 WGS84', default: 30.259 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiPropertyOptional({ description: '经度 WGS84', default: 120.166 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ description: '聚合候选半径(米)', default: GEO_DEFAULTS.RADIUS_METERS, enum: GEO_DEFAULTS.RADIUS_OPTIONS })
  @Type(() => Number)
  @IsIn(GEO_DEFAULTS.RADIUS_OPTIONS)
  radius: number = GEO_DEFAULTS.RADIUS_METERS;

  @ApiPropertyOptional({ description: '地图缩放级(3-20,决定 geohash 精度)', default: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(20)
  zoom: number = 12;
}

export class HotRegionQueryDto {
  @ApiPropertyOptional({ description: 'geohash 精度(1-7,默认 6 ≈ 1.2km 网格)', default: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  precision: number = 6;

  @ApiPropertyOptional({ description: 'Top N(1-50)', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
