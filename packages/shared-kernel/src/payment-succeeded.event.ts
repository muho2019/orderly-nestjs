import { MoneyDto } from './money.dto';
import { EventMetadata } from './order-created.event';
import { PaymentStatus } from './payment-status.enum';

export const PAYMENTS_PAYMENT_SUCCEEDED_EVENT = 'payments.payment.succeeded' as const;

export interface PaymentSucceededEventPayload {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  provider: string;
  amount: MoneyDto;
  clientReference?: string;
  processorReference?: string | null;
}

export interface PaymentSucceededEvent {
  name: typeof PAYMENTS_PAYMENT_SUCCEEDED_EVENT;
  version: 1;
  payload: PaymentSucceededEventPayload;
  metadata: EventMetadata;
}
