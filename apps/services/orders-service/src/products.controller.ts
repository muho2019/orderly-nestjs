import { Controller, Get } from '@nestjs/common';
import { MoneyDto } from '@orderly/shared-kernel';
import { ProductCatalogService } from './product-catalog.service';

interface ProductResponse {
  id: string;
  name: string;
  price: MoneyDto;
}

@Controller('orders/products')
export class ProductsController {
  constructor(private readonly productCatalog: ProductCatalogService) {}

  @Get()
  async findAll(): Promise<ProductResponse[]> {
    const products = await this.productCatalog.listAll();
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: {
        amount: product.price.amount,
        currency: product.price.currency
      }
    }));
  }
}
