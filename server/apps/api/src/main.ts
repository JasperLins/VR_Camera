/**
 * 职责:API 进程入口——装配 Nest 应用、全局前缀 /v1、校验管道、Swagger 文档、优雅停机
 * 关联任务:PKG-02(服务端工程地基);首次构建验收线 = /v1/health 200(dev-environment.md §5)
 */
import './load-env';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { env } from '@vrm/shared';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // 全局路由前缀:对外契约统一 /v1/*(tech-stack §7.1 SSE 端点 /v1/tasks/:id/events 同口径)
  app.setGlobalPrefix('v1');

  // 入参校验:DTO 声明 class-validator 装饰即生效,白名单剔除未声明字段
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // OpenAPI 文档(DoD 要求「OpenAPI 客户端再生成无 diff」,此处为唯一导出源)
  const docConfig = new DocumentBuilder()
    .setTitle('VR 留念 API')
    .setDescription('vr-memento 服务端接口(统一信封:{code,message,data,requestId})')
    .setVersion('0.1.0')
    .addTag('health')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, docConfig));

  await app.enableShutdownHooks().listen(env.API_PORT);
  new Logger('Bootstrap').log(`listening on http://localhost:${env.API_PORT}/v1 (docs: /docs)`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('bootstrap failed', err instanceof Error ? err.stack : err);
  process.exit(1);
});
