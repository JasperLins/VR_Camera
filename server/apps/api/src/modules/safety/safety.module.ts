/**
 * 职责:安全模块装配——机审服务 + 协议同意(PKG-17)
 */
import { Module } from '@nestjs/common';
import { AgreementsController, ConsentsController } from './safety.controller';
import { AgreementsService } from './agreements.service';
import { ContentSafetyService, MockContentSafetyProvider } from './content-safety.service';

@Module({
  controllers: [AgreementsController, ConsentsController],
  providers: [
    MockContentSafetyProvider,
    { provide: 'CONTENT_SAFETY_PROVIDER', useExisting: MockContentSafetyProvider },
    ContentSafetyService,
    AgreementsService
  ],
  exports: [ContentSafetyService, AgreementsService]
})
export class SafetyModule {}
