import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { ProductEntity } from './entities/product.entity';
import {
  KafkaProductsEventPublisher,
  ProductsEventPublisher
} from './events/products-event.publisher';
import { AdminApiGuard } from './guards/admin-api.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    AdminApiGuard,
    {
      provide: ProductsEventPublisher,
      useClass: KafkaProductsEventPublisher
    }
  ],
  exports: [ProductsService]
})
export class CatalogModule {}
