import {
  EventMetadata,
  MoneyDto,
  PaymentCancelledEvent,
  PaymentFailedEvent,
  PaymentRequestedEvent,
  PaymentStatus,
  PaymentSucceededEvent,
  PAYMENTS_PAYMENT_CANCELLED_EVENT,
  PAYMENTS_PAYMENT_FAILED_EVENT,
  PAYMENTS_PAYMENT_REQUESTED_EVENT,
  PAYMENTS_PAYMENT_SUCCEEDED_EVENT
} from '@orderly/shared-kernel';
import { PaymentEntity } from './entities/payment.entity';

function mapAmount(entity: PaymentEntity): MoneyDto {
  const money = new MoneyDto();
  money.amount = entity.amountMinorUnits;
  money.currency = entity.currency;
  return money;
}

export function mapPaymentRequestedEvent(
  payment: PaymentEntity,
  metadata: EventMetadata
): PaymentRequestedEvent {
  return {
    name: PAYMENTS_PAYMENT_REQUESTED_EVENT,
    version: 1,
    metadata,
    payload: {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: PaymentStatus.Pending,
      provider: payment.provider,
      amount: mapAmount(payment),
      clientReference: payment.clientReference ?? undefined
    }
  };
}

export function mapPaymentSucceededEvent(
  payment: PaymentEntity,
  metadata: EventMetadata
): PaymentSucceededEvent {
  return {
    name: PAYMENTS_PAYMENT_SUCCEEDED_EVENT,
    version: 1,
    metadata,
    payload: {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: PaymentStatus.Approved,
      provider: payment.provider,
      amount: mapAmount(payment),
      clientReference: payment.clientReference ?? undefined,
      processorReference: payment.processorReference
    }
  };
}

export function mapPaymentFailedEvent(
  payment: PaymentEntity,
  metadata: EventMetadata
): PaymentFailedEvent {
  return {
    name: PAYMENTS_PAYMENT_FAILED_EVENT,
    version: 1,
    metadata,
    payload: {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: PaymentStatus.Failed,
      provider: payment.provider,
      amount: mapAmount(payment),
      clientReference: payment.clientReference ?? undefined,
      failureReason: payment.failureReason ?? undefined
    }
  };
}

export function mapPaymentCancelledEvent(
  payment: PaymentEntity,
  metadata: EventMetadata
): PaymentCancelledEvent {
  return {
    name: PAYMENTS_PAYMENT_CANCELLED_EVENT,
    version: 1,
    metadata,
    payload: {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: PaymentStatus.Cancelled,
      provider: payment.provider,
      amount: mapAmount(payment),
      clientReference: payment.clientReference ?? undefined,
      reason: payment.failureReason ?? undefined
    }
  };
}
