import { OrderLineDto } from './order-line.dto';
import { OrderStatus } from './order-status.enum';
import { MoneyDto } from './money.dto';

export const ORDERS_ORDER_CREATED_EVENT = 'orders.order.created' as const;

export interface EventMetadata {
  correlationId: string;
  causationId?: string;
  occurredAt: string;
}

export interface OrderCreatedEventPayload {
  orderId: string;
  userId: string;
  status: OrderStatus;
  total: MoneyDto;
  items: OrderLineDto[];
  note?: string;
  clientReference?: string;
}

export interface OrderCreatedEvent {
  name: typeof ORDERS_ORDER_CREATED_EVENT;
  version: 1;
  payload: OrderCreatedEventPayload;
  metadata: EventMetadata;
}
