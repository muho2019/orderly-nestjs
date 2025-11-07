import { MoneyDto } from './money.dto';
import { EventMetadata } from './order-created.event';
import { PaymentStatus } from './payment-status.enum';

export const PAYMENTS_PAYMENT_FAILED_EVENT = 'payments.payment.failed' as const;

export interface PaymentFailedEventPayload {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  provider: string;
  amount: MoneyDto;
  clientReference?: string;
  failureReason?: string;
}

export interface PaymentFailedEvent {
  name: typeof PAYMENTS_PAYMENT_FAILED_EVENT;
  version: 1;
  payload: PaymentFailedEventPayload;
  metadata: EventMetadata;
}
