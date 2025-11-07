import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaOrdersEventPublisher, OrdersEventPublisher } from './orders-event.publisher';
import { OrderEntity } from './order.entity';
import { OrderLineEntity } from './order-line.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ApiGatewayAuthGuard } from './api-gateway-auth.guard';
import { MockProductCatalogService, ProductCatalogService } from './product-catalog.service';
import { ProductsController } from './products.controller';
import { PaymentsEventsConsumer } from './payments-events.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, OrderLineEntity])],
  controllers: [OrdersController, ProductsController],
  providers: [
    OrdersService,
    {
      provide: OrdersEventPublisher,
      useClass: KafkaOrdersEventPublisher
    },
    {
      provide: ProductCatalogService,
      useClass: MockProductCatalogService
    },
    ApiGatewayAuthGuard,
    PaymentsEventsConsumer
  ],
  exports: [OrdersService]
})
export class OrdersModule {}
