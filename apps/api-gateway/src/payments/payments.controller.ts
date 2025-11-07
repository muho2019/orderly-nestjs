import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { PaymentsService } from './payments.service';
import { PaymentResponse } from './interfaces/payment-response.interface';

interface AuthorizedRequest extends Request {
  headers: Request['headers'] & { authorization?: string };
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  requestPayment(
    @Req() request: AuthorizedRequest,
    @Body() dto: RequestPaymentDto,
    @Headers('x-correlation-id') correlationId?: string | string[],
    @Headers('x-causation-id') causationId?: string | string[]
  ): Promise<PaymentResponse> {
    const authorization = this.getAuthorization(request);

    return this.paymentsService.requestPayment(dto, {
      authorization,
      correlationId: this.normalizeHeader(correlationId),
      causationId: this.normalizeHeader(causationId)
    });
  }

  private getAuthorization(request: AuthorizedRequest): string {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || header.trim().length === 0) {
      throw new Error('Authorization header is required');
    }
    return header;
  }

  private normalizeHeader(value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value ?? undefined;
  }
}
