import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException
} from '@nestjs/common';
import { MoneyValue, ProductDto } from '@orderly/shared-kernel';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface ProductSnapshot {
  id: string;
  name: string;
  price: MoneyValue;
}

export abstract class ProductCatalogService {
  abstract listAll(): Promise<readonly ProductSnapshot[]>;
  abstract findById(id: string): Promise<ProductSnapshot | undefined>;
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
  async listAll(): Promise<readonly ProductSnapshot[]> {
    return MOCK_PRODUCTS;
  }

  async findById(id: string): Promise<ProductSnapshot | undefined> {
    return MOCK_PRODUCTS.find((product) => product.id === id);
  }
}

function mapProductDtoToSnapshot(dto: ProductDto): ProductSnapshot {
  return {
    id: dto.id,
    name: dto.name,
    price: MoneyValue.from(dto.price.amount, dto.price.currency)
  };
}

@Injectable()
export class HttpProductCatalogService extends ProductCatalogService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async listAll(): Promise<readonly ProductSnapshot[]> {
    try {
      const response = await firstValueFrom(this.httpService.get<ProductDto[]>('/products'));
      return response.data.map(mapProductDtoToSnapshot);
    } catch (error) {
      throw this.mapAxiosError(error);
    }
  }

  async findById(id: string): Promise<ProductSnapshot | undefined> {
    try {
      const response = await firstValueFrom(this.httpService.get<ProductDto>(`/products/${id}`));
      return mapProductDtoToSnapshot(response.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === HttpStatus.NOT_FOUND) {
        return undefined;
      }
      throw this.mapAxiosError(error);
    }
  }

  private mapAxiosError(error: unknown): Error {
    if (isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status ?? HttpStatus.BAD_GATEWAY;
        const data = error.response.data ?? {
          message: 'Catalog service responded with an error'
        };
        throw new HttpException(data, status);
      }

      throw new ServiceUnavailableException('Unable to reach catalog service');
    }

    return new InternalServerErrorException('Unexpected error while contacting catalog service');
  }
}
