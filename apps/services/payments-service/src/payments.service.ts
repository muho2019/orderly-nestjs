import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventMetadata, MoneyDto, MoneyValue } from '@orderly/shared-kernel';
import { randomUUID } from 'node:crypto';
import { PaymentEntity, PaymentStatus } from './entities/payment.entity';
import { RequestPaymentDto } from './dto/request-payment.dto';
import { PaymentsProcessor, ProcessorPaymentStatus } from './processors/payments-processor';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { MockWebhookDto } from './dto/mock-webhook.dto';
import {
  mapPaymentCancelledEvent,
  mapPaymentFailedEvent,
  mapPaymentRequestedEvent,
  mapPaymentSucceededEvent,
} from './payment-event.mapper';
import { PaymentsEventPublisher } from './payments-event.publisher';

interface EventOptions {
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export class PaymentsService {
  private readonly provider = 'MOCK';

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    private readonly paymentsProcessor: PaymentsProcessor,
    private readonly eventPublisher: PaymentsEventPublisher
  ) {}

  async requestPayment(dto: RequestPaymentDto, options?: EventOptions): Promise<PaymentResponseDto> {
    const amount = MoneyValue.from(dto.amount.amount, dto.amount.currency);
    const payment = this.paymentsRepository.create({
      orderId: dto.orderId,
      amountMinorUnits: amount.amount,
      currency: amount.currency,
      clientReference: dto.clientReference?.trim() || null,
      provider: this.provider,
      status: PaymentStatus.Pending,
    });

    const persisted = await this.paymentsRepository.save(payment);
    const metadata = this.buildEventMetadata(options);
    await this.eventPublisher.publishPaymentRequested(mapPaymentRequestedEvent(persisted, metadata));

    const processorResult = await this.paymentsProcessor.authorize({
      paymentId: persisted.id,
      orderId: persisted.orderId,
      amount,
      metadata: { clientReference: dto.clientReference },
    });

    persisted.processorReference = processorResult.processorPaymentId;
    persisted.processorPayload = processorResult.rawResponse;
    persisted.status = this.mapProcessorStatus(processorResult.status);
    persisted.failureReason = processorResult.failureReason ?? null;
    const updated = await this.paymentsRepository.save(persisted);
    await this.publishStatusEvent(updated, metadata);
    return this.toResponse(updated);
  }

  async getPayment(paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentsRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.toResponse(payment);
  }

  async cancelPayment(paymentId: string, dto: CancelPaymentDto, options?: EventOptions): Promise<PaymentResponseDto> {
    const payment = await this.paymentsRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.Cancelled) {
      return this.toResponse(payment);
    }

    const result = await this.paymentsProcessor.cancel({
      paymentId: payment.id,
      processorReference: payment.processorReference,
      reason: dto.reason,
    });

    payment.status = this.mapProcessorStatus(result.status);
    payment.failureReason = result.failureReason ?? payment.failureReason;
    payment.processorPayload = result.rawResponse;

    const updated = await this.paymentsRepository.save(payment);
    await this.publishStatusEvent(updated, this.buildEventMetadata(options));
    return this.toResponse(updated);
  }

  async handleMockWebhook(dto: MockWebhookDto, options?: EventOptions): Promise<PaymentResponseDto> {
    const processorEvent = await this.paymentsProcessor.parseWebhook(dto);
    const payment = await this.paymentsRepository.findOne({
      where: { id: processorEvent.paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.status = this.mapProcessorStatus(processorEvent.status);
    payment.failureReason = processorEvent.failureReason ?? null;
    payment.processorPayload = processorEvent.rawPayload ?? payment.processorPayload;

    const updated = await this.paymentsRepository.save(payment);
    await this.publishStatusEvent(updated, this.buildEventMetadata(options));
    return this.toResponse(updated);
  }

  private mapProcessorStatus(status: ProcessorPaymentStatus): PaymentStatus {
    switch (status) {
      case ProcessorPaymentStatus.Approved:
        return PaymentStatus.Approved;
      case ProcessorPaymentStatus.Cancelled:
        return PaymentStatus.Cancelled;
      case ProcessorPaymentStatus.Declined:
        return PaymentStatus.Failed;
      case ProcessorPaymentStatus.Pending:
      default:
        return PaymentStatus.Pending;
    }
  }

  private toResponse(entity: PaymentEntity): PaymentResponseDto {
    const response = new PaymentResponseDto();
    response.id = entity.id;
    response.orderId = entity.orderId;
    response.status = entity.status;
    response.provider = entity.provider;
    const amount = new MoneyDto();
    amount.amount = entity.amountMinorUnits;
    amount.currency = entity.currency;
    response.amount = amount;
    response.clientReference = entity.clientReference ?? undefined;
    response.failureReason = entity.failureReason ?? undefined;
    response.createdAt = entity.createdAt.toISOString();
    response.updatedAt = entity.updatedAt.toISOString();
    return response;
  }

  private async publishStatusEvent(payment: PaymentEntity, metadata: EventMetadata): Promise<void> {
    switch (payment.status) {
      case PaymentStatus.Approved:
        await this.eventPublisher.publishPaymentSucceeded(mapPaymentSucceededEvent(payment, metadata));
        break;
      case PaymentStatus.Failed:
        await this.eventPublisher.publishPaymentFailed(mapPaymentFailedEvent(payment, metadata));
        break;
      case PaymentStatus.Cancelled:
        await this.eventPublisher.publishPaymentCancelled(mapPaymentCancelledEvent(payment, metadata));
        break;
      default:
        break;
    }
  }

  private buildEventMetadata(options?: EventOptions): EventMetadata {
    return {
      correlationId: options?.correlationId ?? randomUUID(),
      causationId: options?.causationId,
      occurredAt: new Date().toISOString(),
    };
  }
}
