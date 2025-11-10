import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaOrdersEventPublisher, OrdersEventPublisher } from './orders-event.publisher';
import { OrderEntity } from './order.entity';
import { OrderLineEntity } from './order-line.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ApiGatewayAuthGuard } from './api-gateway-auth.guard';
import { HttpProductCatalogService, ProductCatalogService } from './product-catalog.service';
import { ProductsController } from './products.controller';
import { PaymentsEventsConsumer } from './payments-events.consumer';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([OrderEntity, OrderLineEntity]),
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
  controllers: [OrdersController, ProductsController],
  providers: [
    OrdersService,
    {
      provide: OrdersEventPublisher,
      useClass: KafkaOrdersEventPublisher
    },
    {
      provide: ProductCatalogService,
      useClass: HttpProductCatalogService
    },
    ApiGatewayAuthGuard,
    PaymentsEventsConsumer
  ],
  exports: [OrdersService]
})
export class OrdersModule {}
