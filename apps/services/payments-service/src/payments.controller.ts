import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { MockWebhookDto } from './dto/mock-webhook.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  requestPayment(
    @Body() dto: RequestPaymentDto,
    @Headers('x-correlation-id') correlationId?: string | string[],
    @Headers('x-causation-id') causationId?: string | string[]
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.requestPayment(dto, {
      correlationId: this.normalizeHeader(correlationId),
      causationId: this.normalizeHeader(causationId)
    });
  }

  @Get(':paymentId')
  getPayment(
    @Param('paymentId', new ParseUUIDPipe({ version: '4' })) paymentId: string
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPayment(paymentId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleMockWebhook(
    @Body() dto: MockWebhookDto,
    @Headers('x-correlation-id') correlationId?: string | string[],
    @Headers('x-causation-id') causationId?: string | string[]
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.handleMockWebhook(dto, {
      correlationId: this.normalizeHeader(correlationId),
      causationId: this.normalizeHeader(causationId)
    });
  }

  @Post(':paymentId/cancel')
  @HttpCode(HttpStatus.OK)
  cancelPayment(
    @Param('paymentId', new ParseUUIDPipe({ version: '4' })) paymentId: string,
    @Body() dto: CancelPaymentDto,
    @Headers('x-correlation-id') correlationId?: string | string[],
    @Headers('x-causation-id') causationId?: string | string[]
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.cancelPayment(paymentId, dto, {
      correlationId: this.normalizeHeader(correlationId),
      causationId: this.normalizeHeader(causationId)
    });
  }

  private normalizeHeader(value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value ?? undefined;
  }
}
