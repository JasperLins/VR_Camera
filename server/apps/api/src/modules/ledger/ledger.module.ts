/**
 * 职责:账本模块装配(PKG-13)
 */
import { Module } from '@nestjs/common';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';

@Module({
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService]
})
export class LedgerModule {}
