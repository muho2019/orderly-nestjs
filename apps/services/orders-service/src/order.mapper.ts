import {
  EventMetadata,
  MoneyDto,
  OrderCreatedEvent,
  OrderLineDto,
  OrderResponseDto,
  ORDERS_ORDER_CREATED_EVENT
} from '@orderly/shared-kernel';
import { OrderEntity } from './order.entity';
import { OrderLineEntity } from './order-line.entity';

function mapMoney(amount: number, currency: string): MoneyDto {
  return { amount, currency };
}

function mapLine(line: OrderLineEntity): OrderLineDto {
  return {
    productId: line.productId,
    quantity: line.quantity,
    unitPrice: mapMoney(line.unitPriceAmount, line.unitPriceCurrency),
    lineTotal: mapMoney(line.lineTotalAmount, line.lineTotalCurrency)
  };
}

export function mapOrderEntityToResponse(order: OrderEntity): OrderResponseDto {
  return new OrderResponseDto({
    id: order.id,
    userId: order.userId,
    status: order.status,
    total: mapMoney(order.totalAmount, order.currency),
    items: order.lines?.map(mapLine) ?? [],
    note: order.note ?? undefined,
    clientReference: order.clientReference ?? undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString()
  });
}

export function mapOrderEntityToEvent(order: OrderEntity, metadata: EventMetadata): OrderCreatedEvent {
  return {
    name: ORDERS_ORDER_CREATED_EVENT,
    version: 1,
    payload: {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      total: mapMoney(order.totalAmount, order.currency),
      items: order.lines?.map(mapLine) ?? [],
      note: order.note ?? undefined,
      clientReference: order.clientReference ?? undefined
    },
    metadata
  };
}
