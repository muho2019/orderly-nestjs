import { MoneyDto } from './money.dto';
import { EventMetadata } from './order-created.event';
import { PaymentStatus } from './payment-status.enum';

export const PAYMENTS_PAYMENT_CANCELLED_EVENT = 'payments.payment.cancelled' as const;

export interface PaymentCancelledEventPayload {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  provider: string;
  amount: MoneyDto;
  clientReference?: string;
  reason?: string;
}

export interface PaymentCancelledEvent {
  name: typeof PAYMENTS_PAYMENT_CANCELLED_EVENT;
  version: 1;
  payload: PaymentCancelledEventPayload;
  metadata: EventMetadata;
}
