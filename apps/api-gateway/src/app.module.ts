import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env.development.local', '.env.development', '.env'],
      expandVariables: true
    }),
    AuthModule,
    OrdersModule,
    PaymentsModule
  ]
})
export class AppModule {}
