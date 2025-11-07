import { MoneyDto } from './money.dto';
import { EventMetadata } from './order-created.event';
import { PaymentStatus } from './payment-status.enum';

export const PAYMENTS_PAYMENT_REQUESTED_EVENT = 'payments.payment.requested' as const;

export interface PaymentRequestedEventPayload {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  provider: string;
  amount: MoneyDto;
  clientReference?: string;
}

export interface PaymentRequestedEvent {
  name: typeof PAYMENTS_PAYMENT_REQUESTED_EVENT;
  version: 1;
  payload: PaymentRequestedEventPayload;
  metadata: EventMetadata;
}
