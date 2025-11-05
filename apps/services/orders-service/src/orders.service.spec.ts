import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CreateOrderDto,
  MoneyValue,
  OrderStatus,
  ORDERS_ORDER_CREATED_EVENT
} from '@orderly/shared-kernel';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { OrderEntity } from './order.entity';
import { OrderLineEntity } from './order-line.entity';
import { OrdersEventPublisher } from './orders-event.publisher';
import { ProductCatalogService } from './product-catalog.service';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn()
}));

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: jest.Mocked<Repository<OrderEntity>>;
  let eventPublisher: { publishOrderCreated: jest.Mock };
  let productCatalog: { findById: jest.Mock };
  let catalogEntries: Map<
    string,
    { id: string; name: string; price: MoneyValue }
  >;
  const { randomUUID } = jest.requireMock('node:crypto') as { randomUUID: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn()
    } as unknown as jest.Mocked<Repository<OrderEntity>>;

    eventPublisher = {
      publishOrderCreated: jest.fn().mockResolvedValue(undefined)
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
        '0f0b9c0a-0d58-4a37-9882-5e39f68d3c0d',
        {
          id: '0f0b9c0a-0d58-4a37-9882-5e39f68d3c0d',
          name: 'Espresso',
          price: MoneyValue.from(2500, 'KRW')
        }
      ],
      [
        '7c070b25-92f7-4e72-9db9-8a1ab3f8ea9a',
        {
          id: '7c070b25-92f7-4e72-9db9-8a1ab3f8ea9a',
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
        productId: '0f0b9c0a-0d58-4a37-9882-5e39f68d3c0d',
        quantity: 2,
        unitPrice: { amount: 2500, currency: 'KRW' }
      },
      {
        productId: '7c070b25-92f7-4e72-9db9-8a1ab3f8ea9a',
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
    line1.productId = '0f0b9c0a-0d58-4a37-9882-5e39f68d3c0d';
    line1.quantity = 2;
    line1.unitPriceAmount = 2500;
    line1.unitPriceCurrency = 'KRW';
    line1.lineTotalAmount = 5000;
    line1.lineTotalCurrency = 'KRW';

    const line2 = new OrderLineEntity();
    line2.id = 'line-2';
    line2.productId = '7c070b25-92f7-4e72-9db9-8a1ab3f8ea9a';
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
          productId: 'coffee-espresso',
          quantity: 2,
          unitPrice: { amount: 2500, currency: 'KRW' },
          lineTotal: { amount: 5000, currency: 'KRW' }
        }),
        expect.objectContaining({
          productId: 'coffee-latte',
          quantity: 1,
          unitPrice: { amount: 4500, currency: 'KRW' },
          lineTotal: { amount: 4500, currency: 'KRW' }
        })
      ])
    });

    expect(order.id).toBe('order-id');
    expect(order.totalAmount).toBe(9500);
  });

  it('returns the existing order when client reference matches', async () => {
    const dto = createDto();
    const existingOrder = buildPersistedOrder();
    repository.findOne.mockResolvedValue(existingOrder);

    const order = await service.createOrder('user-id', dto);

    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderCreated).not.toHaveBeenCalled();
    expect(order).toBe(existingOrder);
  });

  it('throws when currencies differ across order items', async () => {
    const dto = createDto();
    dto.items[1].unitPrice.currency = 'USD';
    repository.findOne.mockResolvedValue(null);

    await expect(service.createOrder('user-id', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderCreated).not.toHaveBeenCalled();
  });

  it('throws when product does not exist in catalog', async () => {
    const dto = createDto();
    catalogEntries.delete('coffee-latte');
    repository.findOne.mockResolvedValue(null);

    await expect(service.createOrder('user-id', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderCreated).not.toHaveBeenCalled();
  });

  it('throws when submitted unit price does not match catalog price', async () => {
    const dto = createDto();
    dto.items[0].unitPrice.amount = 9999;
    repository.findOne.mockResolvedValue(null);

    await expect(service.createOrder('user-id', dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publishOrderCreated).not.toHaveBeenCalled();
  });
});
