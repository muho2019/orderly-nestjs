import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CancelOrderDto,
  CreateOrderDto,
  MoneyValue,
  OrderStatus,
  ORDERS_ORDER_CREATED_EVENT,
  ORDERS_ORDER_STATUS_CHANGED_EVENT
} from '@orderly/shared-kernel';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { OrderEntity } from './order.entity';
import { OrderLineEntity } from './order-line.entity';
import { OrdersEventPublisher } from './orders-event.publisher';

const ESPRESSO_ID = '0f0b9c0a-0d58-4a37-9882-5e39f68d3c0d';
const LATTE_ID = '7c070b25-92f7-4e72-9db9-8a1ab3f8ea9a';
import { ProductCatalogService } from './product-catalog.service';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn()
}));

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: jest.Mocked<Repository<OrderEntity>>;
  let eventPublisher: { publishOrderCreated: jest.Mock; publishOrderStatusChanged: jest.Mock };
  let productCatalog: { findById: jest.Mock };
  let catalogEntries: Map<
    string,
    { id: string; name: string; price: MoneyValue }
  >;
  const { randomUUID } = jest.requireMock('node:crypto') as { randomUUID: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn()
    } as unknown as jest.Mocked<Repository<OrderEntity>>;

    eventPublisher = {
      publishOrderCreated: jest.fn().mockResolvedValue(undefined),
      publishOrderStatusChanged: jest.fn().mockResolvedValue(undefined)
    };

    productCatalog = {
      findById: jest.fn()
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: repository
        },
        {
          provide: OrdersEventPublisher,
          useValue: eventPublisher
        },
        {
          provide: ProductCatalogService,
          useValue: productCatalog
        }
      ]
    }).compile();

    service = moduleRef.get(OrdersService);
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    randomUUID.mockReset().mockReturnValue('correlation-id');

    catalogEntries = new Map([
      [
        ESPRESSO_ID,
        {
          id: ESPRESSO_ID,
          name: 'Espresso',
          price: MoneyValue.from(2500, 'KRW')
        }
      ],
      [
        LATTE_ID,
        {
          id: LATTE_ID,
          name: 'Cafe Latte',
          price: MoneyValue.from(4500, 'KRW')
        }
      ]
    ]);
    productCatalog.findById.mockImplementation((id: string) => catalogEntries.get(id));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const createDto = (): CreateOrderDto => ({
    items: [
      {
        productId: ESPRESSO_ID,
        quantity: 2,
        unitPrice: { amount: 2500, currency: 'KRW' }
      },
      {
        productId: LATTE_ID,
        quantity: 1,
        unitPrice: { amount: 4500, currency: 'KRW' }
      }
    ],
    note: 'Leave at the door',
    clientReference: 'checkout-123'
  });

  const buildPersistedOrder = (): OrderEntity => {
    const order = new OrderEntity();
    order.id = 'order-id';
    order.userId = 'user-id';
    order.status = OrderStatus.Created;
    order.totalAmount = 9500;
    order.currency = 'KRW';
    order.note = 'Leave at the door';
    order.clientReference = 'checkout-123';
    order.paymentId = null;
    order.createdAt = new Date('2024-01-01T00:00:00.000Z');
    order.updatedAt = new Date('2024-01-01T00:00:00.000Z');

    const line1 = new OrderLineEntity();
    line1.id = 'line-1';
    line1.productId = ESPRESSO_ID;
    line1.quantity = 2;
    line1.unitPriceAmount = 2500;
    line1.unitPriceCurrency = 'KRW';
    line1.lineTotalAmount = 5000;
    line1.lineTotalCurrency = 'KRW';

    const line2 = new OrderLineEntity();
    line2.id = 'line-2';
    line2.productId = LATTE_ID;
    line2.quantity = 1;
    line2.unitPriceAmount = 4500;
    line2.unitPriceCurrency = 'KRW';
    line2.lineTotalAmount = 4500;
    line2.lineTotalCurrency = 'KRW';

    order.lines = [line1, line2];
    return order;
  };

  it('creates an order, calculates totals, and publishes event', async () => {
    const dto = createDto();
    repository.findOne.mockResolvedValue(null);
    const persisted = buildPersistedOrder();
    repository.save.mockResolvedValue(persisted);
    repository.findOneOrFail.mockResolvedValue(persisted);

    const order = await service.createOrder('user-id', dto);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { userId: 'user-id', clientReference: 'checkout-123' },
      relations: ['lines']
    });
    expect(productCatalog.findById).toHaveBeenCalledTimes(2);
    expect(repository.save).toHaveBeenCalled();
    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'order-id' },
      relations: ['lines']
    });

    expect(eventPublisher.publishOrderCreated).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
    const event = eventPublisher.publishOrderCreated.mock.calls[0][0];
    expect(event.name).toBe(ORDERS_ORDER_CREATED_EVENT);
    expect(event.metadata).toEqual({
      correlationId: 'correlation-id',
      causationId: undefined,
      occurredAt: '2024-01-01T00:00:00.000Z'
    });
    expect(event.payload).toMatchObject({
      orderId: 'order-id',
      userId: 'user-id',
      total: { amount: 9500, currency: 'KRW' },
      items: expect.arrayContaining([
        expect.objectContaining({
          productId: ESPRESSO_ID,
          quantity: 2,
          unitPrice: { amount: 2500, currency: 'KRW' },
          lineTotal: { amount: 5000, currency: 'KRW' }
        }),
        expect.objectContaining({
          productId: LATTE_ID,
          quantity: 1,
          unitPrice: { amount: 4500, currency: 'KRW' },
          lineTotal: { amount: 4500, currency: 'KRW' }
        })
      ])
    });

    expect(order.id).toBe('order-id');
    expect(order.totalAmount).toBe(9500);
  });

  it('fetches orders for a user ordered by most recent', async () => {
    const persisted = buildPersistedOrder();
    repository.find.mockResolvedValue([persisted]);

    const orders = await service.findOrdersForUser('user-id');

    expect(repository.find).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      order: { createdAt: 'DESC' },
      relations: ['lines']
    });
    expect(orders).toEqual([persisted]);
  });

  it('fetches a single order for the given user', async () => {
    const persisted = buildPersistedOrder();
    repository.findOne.mockResolvedValue(persisted);

    const order = await service.findOrderByIdForUser('order-id', 'user-id');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'order-id', userId: 'user-id' },
      relations: ['lines']
    });
    expect(order).toBe(persisted);
  });

  it('throws when the order does not exist for the user', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOrderByIdForUser('missing', 'user-id')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('returns the existing order when client reference matches', async () => {
    const dto = createDto();
    const existingOrder = buildPersistedOrder();
    repository.findOne.mockResolvedValue(existingOrder);

    const order = await service.createOrder('user-id', dto);

    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderCreated).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
    expect(order).toBe(existingOrder);
  });

  it('throws when currencies differ across order items', async () => {
    const dto = createDto();
    dto.items[1].unitPrice.currency = 'USD';
    repository.findOne.mockResolvedValue(null);

    await expect(service.createOrder('user-id', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderCreated).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
  });

  it('throws when product does not exist in catalog', async () => {
    const dto = createDto();
    catalogEntries.delete(LATTE_ID);
    repository.findOne.mockResolvedValue(null);

    await expect(service.createOrder('user-id', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderCreated).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
  });

  it('throws when submitted unit price does not match catalog price', async () => {
    const dto = createDto();
    dto.items[0].unitPrice.amount = 9999;
    repository.findOne.mockResolvedValue(null);

    await expect(service.createOrder('user-id', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderCreated).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
  });

  it('cancels an order and publishes status changed event', async () => {
    const existing = buildPersistedOrder();
    repository.findOne.mockResolvedValue(existing);
    const cancelledOrder = { ...existing, status: OrderStatus.Cancelled };
    repository.save.mockResolvedValue(cancelledOrder);
    repository.findOneOrFail.mockResolvedValue(cancelledOrder);

    const dto = { reason: 'Changed my mind' } as CancelOrderDto;

    const result = await service.cancelOrder('order-id', 'user-id', dto);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'order-id', userId: 'user-id' },
      relations: ['lines']
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: OrderStatus.Cancelled }));
    expect(repository.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 'order-id' },
      relations: ['lines']
    });
    expect(eventPublisher.publishOrderStatusChanged).toHaveBeenCalledTimes(1);
    const statusEvent = eventPublisher.publishOrderStatusChanged.mock.calls[0][0];
    expect(statusEvent.name).toBe(ORDERS_ORDER_STATUS_CHANGED_EVENT);
    expect(statusEvent.payload).toMatchObject({
      orderId: 'order-id',
      userId: 'user-id',
      previousStatus: OrderStatus.Created,
      currentStatus: OrderStatus.Cancelled,
      reason: 'Changed my mind'
    });
    expect(result.status).toBe(OrderStatus.Cancelled);
  });

  it('returns existing cancelled order without publishing event', async () => {
    const cancelled = buildPersistedOrder();
    cancelled.status = OrderStatus.Cancelled;
    repository.findOne.mockResolvedValue(cancelled);

    const result = await service.cancelOrder('order-id', 'user-id', {} as CancelOrderDto);

    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
    expect(result.status).toBe(OrderStatus.Cancelled);
  });

  it('throws when trying to cancel a non-cancellable order', async () => {
    const confirmed = buildPersistedOrder();
    confirmed.status = OrderStatus.Confirmed;
    repository.findOne.mockResolvedValue(confirmed);

    await expect(
      service.cancelOrder('order-id', 'user-id', { reason: 'Too late' } as CancelOrderDto)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
  });

  it('throws when cancelling an order that does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.cancelOrder('missing-id', 'user-id', {} as CancelOrderDto)
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderStatusChanged).not.toHaveBeenCalled();
  });
});
