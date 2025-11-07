import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  PaymentsProcessor,
  ProcessorAuthorizeRequest,
  ProcessorAuthorizeResponse,
  ProcessorCancelRequest,
  ProcessorCancelResponse,
  ProcessorPaymentStatus,
  ProcessorWebhookEvent
} from './payments-processor';
import { MockWebhookDto } from '../dto/mock-webhook.dto';

interface ParsedWebhookPayload extends ProcessorWebhookEvent {
  rawPayload: Record<string, unknown>;
}

@Injectable()
export class MockPaymentsProcessor extends PaymentsProcessor {
  private readonly logger = new Logger(MockPaymentsProcessor.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async authorize(request: ProcessorAuthorizeRequest): Promise<ProcessorAuthorizeResponse> {
    const declineThreshold = this.getDeclineThreshold();
    const shouldDecline =
      request.amount.amount >= declineThreshold ||
      this.hasForceDeclineFlag(request.metadata) ||
      request.amount.amount <= 0;

    if (shouldDecline) {
      return {
        status: ProcessorPaymentStatus.Declined,
        processorPaymentId: this.buildProcessorId(request.paymentId),
        rawResponse: {
          decision: 'DECLINED',
          reason: 'Mock processor declined payment',
          amount: request.amount.amount
        },
        failureReason: 'DECLINED_BY_RULE'
      };
    }

    return {
      status: ProcessorPaymentStatus.Approved,
      processorPaymentId: this.buildProcessorId(request.paymentId),
      rawResponse: {
        decision: 'APPROVED',
        approvedAt: new Date().toISOString(),
        amount: request.amount.amount
      }
    };
  }

  async cancel(request: ProcessorCancelRequest): Promise<ProcessorCancelResponse> {
    this.logger.debug(`Mock cancel for payment ${request.paymentId}`);
    return {
      status: ProcessorPaymentStatus.Cancelled,
      rawResponse: {
        cancelledAt: new Date().toISOString(),
        processorReference: request.processorReference ?? null,
        reason: request.reason ?? null
      }
    };
  }

  async parseWebhook(payload: unknown): Promise<ProcessorWebhookEvent> {
    const parsed = this.validatePayload(payload);
    this.logger.debug(
      `Received mock webhook for payment ${parsed.paymentId} => ${parsed.status}`
    );
    return parsed;
  }

  private getDeclineThreshold(): number {
    const raw = this.configService.get<string>('MOCK_PAYMENTS_DECLINE_THRESHOLD');
    const parsed = raw ? Number(raw) : undefined;
    return Number.isFinite(parsed) && parsed! > 0 ? parsed! : 500_000;
  }

  private hasForceDeclineFlag(metadata?: Record<string, unknown>): boolean {
    if (!metadata) {
      return false;
    }
    const value = metadata['forceDecline'];
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return false;
  }

  private buildProcessorId(paymentId: string): string {
    return `mock_${paymentId}_${randomUUID()}`;
  }

  private validatePayload(payload: unknown): ParsedWebhookPayload {
    const data = payload as MockWebhookDto | undefined;
    if (!data || typeof data.paymentId !== 'string') {
      throw new BadRequestException('Invalid mock webhook payload');
    }

    const normalizedStatus = String(data.status ?? '').toUpperCase();
    const status = this.mapWebhookStatus(normalizedStatus);

    return {
      paymentId: data.paymentId,
      status,
      rawPayload: {
        ...data
      },
      failureReason:
        status === ProcessorPaymentStatus.Declined
          ? data.message ?? 'MOCK_WEBHOOK_FAILED'
          : undefined
    };
  }

  private mapWebhookStatus(status: string): ProcessorPaymentStatus {
    switch (status) {
      case ProcessorPaymentStatus.Approved:
        return ProcessorPaymentStatus.Approved;
      case 'FAILED':
      case ProcessorPaymentStatus.Declined:
        return ProcessorPaymentStatus.Declined;
      case ProcessorPaymentStatus.Cancelled:
        return ProcessorPaymentStatus.Cancelled;
      default:
        throw new BadRequestException(`Unsupported mock webhook status: ${status}`);
    }
  }
}
