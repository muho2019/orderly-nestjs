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
import {
  CancelOrderDto,
  CreateOrderDto,
  OrderResponseDto
} from '@orderly/shared-kernel';
import { JwtClaims } from '../auth/services/auth-token.service';

export interface OrderProductsResponse {
  id: string;
  name: string;
  price: {
    amount: number;
    currency: string;
  };
}

interface RequestMetadata {
  authorization?: string;
  user?: JwtClaims;
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  async createOrder(
    authorization: string,
    user: JwtClaims,
    dto: CreateOrderDto,
    metadata: RequestMetadata = {}
  ): Promise<OrderResponseDto> {
    return this.post<OrderResponseDto>('', dto, {
      authorization,
      user,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId
    });
  }

  async findOrders(
    authorization: string,
    user: JwtClaims,
    metadata: RequestMetadata = {}
  ): Promise<OrderResponseDto[]> {
    return this.get<OrderResponseDto[]>('', {
      authorization,
      user,
      correlationId: metadata.correlationId
    });
  }

  async findOrderById(
    authorization: string,
    user: JwtClaims,
    orderId: string,
    metadata: RequestMetadata = {}
  ): Promise<OrderResponseDto> {
    return this.get<OrderResponseDto>(`/${orderId}`, {
      authorization,
      user,
      correlationId: metadata.correlationId
    });
  }

  async cancelOrder(
    authorization: string,
    user: JwtClaims,
    orderId: string,
    dto: CancelOrderDto,
    metadata: RequestMetadata = {}
  ): Promise<OrderResponseDto> {
    return this.patch<OrderResponseDto>(`/${orderId}/cancel`, dto, {
      authorization,
      user,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId
    });
  }

  async getProducts(): Promise<OrderProductsResponse[]> {
    return this.get<OrderProductsResponse[]>('/products', {});
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

    const anonymousUserId = this.configService.get<string>(
      'ORDERS_SERVICE_ANONYMOUS_USER_ID',
      'anonymous-web-user'
    );
    const anonymousEmail = this.configService.get<string>(
      'ORDERS_SERVICE_ANONYMOUS_EMAIL',
      ''
    );

    const userId = metadata.user?.sub?.trim().length ? metadata.user.sub : anonymousUserId;
    if (userId && userId.trim().length > 0) {
      headers['X-User-Id'] = userId.trim();
    }

    const emailCandidate = metadata.user?.email ?? anonymousEmail;
    if (emailCandidate && emailCandidate.trim().length > 0) {
      headers['X-User-Email'] = emailCandidate.trim();
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
        const data = error.response.data ?? { message: 'Orders service responded with an error' };
        throw new HttpException(data, status);
      }

      throw new ServiceUnavailableException('Unable to reach orders service');
    }

    return new InternalServerErrorException('Unexpected error while contacting orders service');
  }
}
