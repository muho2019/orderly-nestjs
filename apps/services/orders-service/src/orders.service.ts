import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  CreateOrderDto,
  CancelOrderDto,
  EventMetadata,
  MoneyValue,
  OrderResponseDto,
  OrderStatus
} from '@orderly/shared-kernel';
import { OrderEntity } from './order.entity';
import { OrderLineEntity } from './order-line.entity';
import { OrdersEventPublisher } from './orders-event.publisher';
import {
  mapOrderEntityToEvent,
  mapOrderEntityToResponse,
  mapOrderStatusChangedEvent
} from './order.mapper';
import { ProductCatalogService } from './product-catalog.service';

interface CreateOrderOptions {
  correlationId?: string;
  causationId?: string;
}

interface CancelOrderOptions {
  correlationId?: string;
  causationId?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly eventPublisher: OrdersEventPublisher,
    private readonly productCatalog: ProductCatalogService
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto, options?: CreateOrderOptions): Promise<OrderEntity> {
    if (!userId) {
      throw new BadRequestException('Authenticated user id is required to create an order');
    }

    const trimmedClientReference =
      dto.clientReference && dto.clientReference.trim().length > 0 ? dto.clientReference.trim() : null;
    if (trimmedClientReference) {
      const existing = await this.ordersRepository.findOne({
        where: { userId, clientReference: trimmedClientReference },
        relations: ['lines']
      });
      if (existing) {
        return existing;
      }
    }

    const { lines, total } = this.buildOrderLines(dto);

    const order = new OrderEntity();
    order.userId = userId;
    order.status = OrderStatus.Created;
    order.totalAmount = total.amount;
    order.currency = total.currency;
    order.note = dto.note && dto.note.trim().length > 0 ? dto.note.trim() : null;
    order.clientReference = trimmedClientReference;
    order.paymentId = null;
    order.lines = lines;

    lines.forEach((line) => {
      line.order = order;
    });

    const savedOrder = await this.ordersRepository.save(order);
    const persistedOrder = await this.ordersRepository.findOneOrFail({
      where: { id: savedOrder.id },
      relations: ['lines']
    });

    const eventMetadata = this.buildEventMetadata(options?.correlationId, options?.causationId);
    const event = mapOrderEntityToEvent(persistedOrder, eventMetadata);
    await this.eventPublisher.publishOrderCreated(event);

    return persistedOrder;
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    dto: CancelOrderDto | undefined,
    options?: CancelOrderOptions
  ): Promise<OrderEntity> {
    if (!userId || userId.trim().length === 0) {
      throw new BadRequestException('Authenticated user id is required to cancel an order');
    }

    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order id is required to cancel an order');
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId, userId },
      relations: ['lines']
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.Cancelled) {
      return order;
    }

    if (order.status !== OrderStatus.Created) {
      throw new BadRequestException('Only orders in CREATED status can be cancelled');
    }

    const previousStatus = order.status;
    order.status = OrderStatus.Cancelled;

    await this.ordersRepository.save(order);

    const persisted = await this.ordersRepository.findOneOrFail({
      where: { id: order.id },
      relations: ['lines']
    });

    const metadata = this.buildEventMetadata(options?.correlationId, options?.causationId);
    const normalizedReason =
      dto?.reason && dto.reason.trim().length > 0 ? dto.reason.trim() : undefined;
    const event = mapOrderStatusChangedEvent(persisted, previousStatus, metadata, normalizedReason);
    await this.eventPublisher.publishOrderStatusChanged(event);

    return persisted;
  }

  mapToResponse(order: OrderEntity): OrderResponseDto {
    return mapOrderEntityToResponse(order);
  }

  mapToResponses(orders: OrderEntity[]): OrderResponseDto[] {
    return orders.map((order) => this.mapToResponse(order));
  }

  async findOrdersForUser(userId: string): Promise<OrderEntity[]> {
    if (!userId || userId.trim().length === 0) {
      throw new BadRequestException('Authenticated user id is required to fetch orders');
    }

    return this.ordersRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['lines']
    });
  }

  async findOrderByIdForUser(orderId: string, userId: string): Promise<OrderEntity> {
    if (!userId || userId.trim().length === 0) {
      throw new BadRequestException('Authenticated user id is required to fetch an order');
    }

    if (!orderId || orderId.trim().length === 0) {
      throw new BadRequestException('Order id is required');
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId, userId },
      relations: ['lines']
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async markOrderAsPaid(orderId: string, paymentId: string): Promise<void> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) {
      return;
    }

    if (order.status === OrderStatus.Fulfilled) {
      return;
    }

    if (order.status === OrderStatus.Created || order.status === OrderStatus.Confirmed) {
      order.status = OrderStatus.Confirmed;
      order.paymentId = paymentId;
      await this.ordersRepository.save(order);
    }
  }

  async markOrderPaymentFailed(orderId: string, reason?: string): Promise<void> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) {
      return;
    }

    if (order.status === OrderStatus.Fulfilled || order.status === OrderStatus.Cancelled) {
      return;
    }

    order.status = OrderStatus.Cancelled;
    order.note = [order.note, reason?.trim()].filter(Boolean).join(' | ') || order.note;
    await this.ordersRepository.save(order);
  }

  private buildOrderLines(dto: CreateOrderDto): { lines: OrderLineEntity[]; total: MoneyValue } {
    if (!dto.items.length) {
      throw new BadRequestException('Order must contain at least one item');
    }

    let total: MoneyValue | undefined;

    const lines = dto.items.map((item) => {
      const product = this.productCatalog.findById(item.productId);
      if (!product) {
        throw new BadRequestException(`Unknown product: ${item.productId}`);
      }

      const catalogPrice = product.price;
      const requestedPrice = MoneyValue.from(item.unitPrice.amount, item.unitPrice.currency);

      if (!catalogPrice.equals(requestedPrice)) {
        throw new BadRequestException(`Price mismatch for product: ${item.productId}`);
      }

      if (!total) {
        total = MoneyValue.from(0, catalogPrice.currency);
      } else if (catalogPrice.currency !== total.currency) {
        throw new BadRequestException('All order items must use the same currency');
      }

      const lineTotal = catalogPrice.multiply(item.quantity);
      total = total.add(lineTotal);

      const line = new OrderLineEntity();
      line.productId = item.productId;
      line.quantity = item.quantity;
      line.unitPriceAmount = catalogPrice.amount;
      line.unitPriceCurrency = catalogPrice.currency;
      line.lineTotalAmount = lineTotal.amount;
      line.lineTotalCurrency = lineTotal.currency;

      return line;
    });

    if (!total) {
      throw new BadRequestException('Order must contain at least one item');
    }

    return { lines, total };
  }

  private buildEventMetadata(correlationId?: string, causationId?: string): EventMetadata {
    return {
      correlationId: correlationId ?? randomUUID(),
      causationId,
      occurredAt: new Date().toISOString()
    };
  }
}
