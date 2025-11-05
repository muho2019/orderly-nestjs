import { EventMetadata } from './order-created.event';
import { OrderStatus } from './order-status.enum';

export const ORDERS_ORDER_STATUS_CHANGED_EVENT = 'orders.order.statusChanged' as const;

export interface OrderStatusChangedEventPayload {
  orderId: string;
  userId: string;
  previousStatus: OrderStatus;
  currentStatus: OrderStatus;
  reason?: string;
}

export interface OrderStatusChangedEvent {
  name: typeof ORDERS_ORDER_STATUS_CHANGED_EVENT;
  version: 1;
  payload: OrderStatusChangedEventPayload;
  metadata: EventMetadata;
}
