import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';
import { randomUUID } from 'node:crypto';
import { ProductDto } from '@orderly/shared-kernel';
import { CreateProductRequestDto } from './dto/create-product-request.dto';
import { UpdateProductRequestDto } from './dto/update-product-request.dto';
import { UpdateProductStatusRequestDto } from './dto/update-product-status-request.dto';

interface RequestMetadata {
  authorization?: string;
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  findProducts(): Promise<ProductDto[]> {
    return this.get<ProductDto[]>('/products', {});
  }

  findProductById(productId: string): Promise<ProductDto> {
    return this.get<ProductDto>(`/products/${productId}`, {});
  }

  createProduct(
    authorization: string,
    dto: CreateProductRequestDto
  ): Promise<ProductDto> {
    return this.post<ProductDto>('/products', dto, { authorization });
  }

  updateProduct(
    authorization: string,
    productId: string,
    dto: UpdateProductRequestDto
  ): Promise<ProductDto> {
    return this.patch<ProductDto>(`/products/${productId}`, dto, { authorization });
  }

  updateProductStatus(
    authorization: string,
    productId: string,
    dto: UpdateProductStatusRequestDto
  ): Promise<ProductDto> {
    return this.patch<ProductDto>(`/products/${productId}/status`, dto, { authorization });
  }

  private async get<T>(path: string, metadata: RequestMetadata): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(path, {
          headers: this.buildHeaders(metadata)
        })
      );
      return response.data;
    } catch (error) {
      throw this.mapAxiosError(error);
    }
  }

  private async post<T>(path: string, payload: unknown, metadata: RequestMetadata): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(path, payload, {
          headers: this.buildHeaders(metadata)
        })
      );
      return response.data;
    } catch (error) {
      throw this.mapAxiosError(error);
    }
  }

  private async patch<T>(path: string, payload: unknown, metadata: RequestMetadata): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch<T>(path, payload, {
          headers: this.buildHeaders(metadata)
        })
      );
      return response.data;
    } catch (error) {
      throw this.mapAxiosError(error);
    }
  }

  private buildHeaders(metadata: RequestMetadata): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (metadata.authorization) {
      headers.Authorization = metadata.authorization;
    }

    const correlationHeader = this.configService.get<string>('CORRELATION_HEADER', 'x-correlation-id');
    headers[correlationHeader] = metadata.correlationId ?? randomUUID();

    if (metadata.causationId) {
      headers['x-causation-id'] = metadata.causationId;
    }

    return headers;
  }

  private mapAxiosError(error: unknown): Error {
    if (isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status ?? HttpStatus.BAD_GATEWAY;
        const data = error.response.data ?? { message: 'Catalog service responded with an error' };
        throw new HttpException(data, status);
      }

      throw new ServiceUnavailableException('Unable to reach catalog service');
    }

    return new InternalServerErrorException('Unexpected error while contacting catalog service');
  }
}
