/**
 * 职责:地理路由——附近内容/网格聚合/热门区域(PKG-10 M-1/M-2/M-3)
 * 关联需求:FR-01/FR-03;坐标出入参一律 WGS84(D-006)
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@vrm/database';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClusterQueryDto, HotRegionQueryDto, NearbyQueryDto } from './dto/geo.dto';
import { GeoService } from './geo.service';

@ApiTags('geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('nearby')
  @ApiOperation({ summary: '附近内容(ST_DWithin 半径 + 海拔 ±5m + 可见性过滤,按距离排序)' })
  async nearby(@CurrentUser() user: User, @Query() query: NearbyQueryDto) {
    return this.geoService.nearby({
      userId: user.id,
      lat: query.lat,
      lng: query.lng,
      radius: query.radius,
      altitude: query.altitude,
      page: query.page,
      pageSize: query.pageSize
    });
  }

  @Get('clusters')
  @ApiOperation({ summary: 'geohash 网格聚合(zoom 分级,返回 cell/count/topContentId)' })
  async clusters(@CurrentUser() user: User, @Query() query: ClusterQueryDto) {
    return this.geoService.clusters({
      userId: user.id,
      lat: query.lat,
      lng: query.lng,
      radius: query.radius,
      zoom: query.zoom
    });
  }

  @Get('hot-regions')
  @ApiOperation({ summary: '热门区域 Top N(内容密度;打卡口径待 S-1 落库后切换)' })
  async hotRegions(@Query() query: HotRegionQueryDto) {
    return this.geoService.hotRegions({ precision: query.precision, limit: query.limit });
  }
}
