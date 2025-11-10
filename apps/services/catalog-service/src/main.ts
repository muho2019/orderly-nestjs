import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.setGlobalPrefix('v1');

  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  Logger.log(`Catalog service is running on port ${port}`, 'Bootstrap');
}

bootstrap().catch((error) => {
  Logger.error('Failed to bootstrap catalog service', error);
  process.exit(1);
});
