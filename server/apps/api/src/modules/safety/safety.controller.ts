/**
 * 职责:协议与同意路由——GET /v1/agreements、POST /v1/consents、GET /v1/consents/me
 * 关联需求:FR-02(R-5,D-031 单独同意);关联任务:PKG-17(T10)
 */
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { User } from '@vrm/database';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AGREEMENT_KEY_VALUES, AgreementsService } from './agreements.service';

class RecordConsentDto {
  @IsIn(AGREEMENT_KEY_VALUES)
  agreementKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  version!: string;

  @Type(() => Boolean)
  @IsBoolean()
  accepted!: boolean;
}

@ApiTags('safety')
@Controller()
export class AgreementsController {
  constructor(private readonly agreements: AgreementsService) {}

  @Get('agreements')
  @ApiOperation({ summary: '协议清单(每 key 当前生效版本;首启隐私总览与四项敏感权限)' })
  async list() {
    return { items: await this.agreements.listLatest() };
  }
}

@ApiTags('safety')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ConsentsController {
  constructor(private readonly agreements: AgreementsService) {}

  @Post('consents')
  @ApiOperation({ summary: '记录单项同意/拒绝(D-031:逐项单独;人脸照片拒绝即阻断生成)' })
  async record(@CurrentUser() user: User, @Body() dto: RecordConsentDto) {
    return this.agreements.recordConsent(user.id, dto.agreementKey, dto.version, dto.accepted);
  }

  @Get('consents/me')
  @ApiOperation({ summary: '我的同意状态(每 key 最近一条)' })
  async mine(@CurrentUser() user: User) {
    return { items: await this.agreements.myConsents(user.id) };
  }
}
