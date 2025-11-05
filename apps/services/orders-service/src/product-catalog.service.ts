import { Injectable } from '@nestjs/common';
import { MoneyValue } from '@orderly/shared-kernel';

export interface ProductSnapshot {
  id: string;
  name: string;
  price: MoneyValue;
}

export abstract class ProductCatalogService {
  abstract listAll(): readonly ProductSnapshot[];
  abstract findById(id: string): ProductSnapshot | undefined;
}

const MOCK_PRODUCTS: readonly ProductSnapshot[] = [
  {
    id: '0f0b9c0a-0d58-4a37-9882-5e39f68d3c0d',
    name: 'Espresso',
    price: MoneyValue.from(2500, 'KRW')
  },
  {
    id: '7c070b25-92f7-4e72-9db9-8a1ab3f8ea9a',
    name: 'Cafe Latte',
    price: MoneyValue.from(4500, 'KRW')
  },
  {
    id: '9e21dc36-d4dd-4a1b-8d42-7a4f7a4ed5bd',
    name: 'New York Cheesecake',
    price: MoneyValue.from(6500, 'KRW')
  }
] as const;

@Injectable()
export class MockProductCatalogService extends ProductCatalogService {
  listAll(): readonly ProductSnapshot[] {
    return MOCK_PRODUCTS;
  }

  findById(id: string): ProductSnapshot | undefined {
    return MOCK_PRODUCTS.find((product) => product.id === id);
  }
}
