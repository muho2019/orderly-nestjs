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
import { RequestPaymentDto } from './dto/request-payment.dto';
import { PaymentResponse } from './interfaces/payment-response.interface';

interface RequestMetadata {
  authorization: string;
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  async requestPayment(
    dto: RequestPaymentDto,
    metadata: RequestMetadata
  ): Promise<PaymentResponse> {
    return this.post<PaymentResponse>('', dto, metadata);
  }

  private async post<T>(
    path: string,
    payload: unknown,
    metadata: RequestMetadata
  ): Promise<T> {
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

  private buildHeaders(metadata: RequestMetadata): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: metadata.authorization
    };

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
        const data = error.response.data ?? { message: 'Payments service responded with an error' };
        throw new HttpException(data, status);
      }
      throw new ServiceUnavailableException('Unable to reach payments service');
    }

    return new InternalServerErrorException('Unexpected error while contacting payments service');
  }
}
