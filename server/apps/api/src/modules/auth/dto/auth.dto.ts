/**
 * 职责:登录入参 DTO(PKG-08)
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class GuestLoginDto {
  @ApiProperty({ description: '客户端生成的设备标识(UUID,持久存储);同 deviceId 复用游客账号' })
  @IsString()
  @Length(8, 64)
  deviceId!: string;
}

export class WechatLoginDto {
  @ApiProperty({ description: '微信开放平台 SDK 返回的 authorization code' })
  @IsString()
  @Length(1, 256)
  code!: string;

  @ApiPropertyOptional({ description: '游客态设备标识(携带则触发游客账号合并,联调后启用)' })
  @IsOptional()
  @IsString()
  @Length(8, 64)
  deviceId?: string;
}
