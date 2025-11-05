import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const timeoutValue = configService.get<string>('ORDERS_SERVICE_TIMEOUT');
        const timeout =
          timeoutValue && !Number.isNaN(Number(timeoutValue)) ? Number(timeoutValue) : 5000;

        return {
          baseURL: configService.get<string>(
            'ORDERS_SERVICE_BASE_URL',
            'http://localhost:3000/v1/orders'
          ),
          timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    }),
    AuthModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
