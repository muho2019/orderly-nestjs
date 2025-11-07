import { MoneyValue } from '@orderly/shared-kernel';

export enum ProcessorPaymentStatus {
  Approved = 'APPROVED',
  Declined = 'DECLINED',
  Pending = 'PENDING',
  Cancelled = 'CANCELLED'
}

export interface ProcessorAuthorizeRequest {
  paymentId: string;
  orderId: string;
  amount: MoneyValue;
  metadata?: Record<string, unknown>;
}

export interface ProcessorAuthorizeResponse {
  status: ProcessorPaymentStatus;
  processorPaymentId: string;
  rawResponse: Record<string, unknown>;
  failureReason?: string;
}

export interface ProcessorCancelRequest {
  paymentId: string;
  processorReference?: string | null;
  reason?: string;
}

export interface ProcessorCancelResponse {
  status: ProcessorPaymentStatus;
  rawResponse: Record<string, unknown>;
  failureReason?: string;
}

export interface ProcessorWebhookEvent {
  paymentId: string;
  status: ProcessorPaymentStatus;
  rawPayload?: Record<string, unknown>;
  failureReason?: string;
}

export abstract class PaymentsProcessor {
  abstract authorize(request: ProcessorAuthorizeRequest): Promise<ProcessorAuthorizeResponse>;

  abstract cancel(request: ProcessorCancelRequest): Promise<ProcessorCancelResponse>;

  abstract parseWebhook(payload: unknown): Promise<ProcessorWebhookEvent>;
}
