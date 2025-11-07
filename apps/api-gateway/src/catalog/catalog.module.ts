import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const timeoutValue = configService.get<string>('CATALOG_SERVICE_TIMEOUT');
        const timeout =
          timeoutValue && !Number.isNaN(Number(timeoutValue)) ? Number(timeoutValue) : 5000;

        return {
          baseURL: configService.get<string>(
            'CATALOG_SERVICE_BASE_URL',
            'http://localhost:3004/v1'
          ),
          timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    })
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}
