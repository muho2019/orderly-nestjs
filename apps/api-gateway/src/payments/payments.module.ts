import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const timeoutValue = configService.get<string>('PAYMENTS_SERVICE_TIMEOUT');
        const timeout =
          timeoutValue && !Number.isNaN(Number(timeoutValue)) ? Number(timeoutValue) : 5000;

        return {
          baseURL: configService.get<string>(
            'PAYMENTS_SERVICE_BASE_URL',
            'http://localhost:3003/v1/payments'
          ),
          timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    })
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
