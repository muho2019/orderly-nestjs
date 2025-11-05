import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from './orders.module';
import { OrderEntity } from './order.entity';
import { OrderLineEntity } from './order-line.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development.local', '.env.development', '.env']
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5434),
        username: configService.get<string>('DB_USER', 'orderly'),
        password: configService.get<string>('DB_PASSWORD', 'orderly'),
        database: configService.get<string>('DB_NAME', 'orderly_orders'),
        synchronize: configService.get<boolean>('TYPEORM_SYNC', true),
        autoLoadEntities: true,
        entities: [OrderEntity, OrderLineEntity]
      })
    }),
    OrdersModule
  ]
})
export class AppModule {}
