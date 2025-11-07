import { ConfigService } from '@nestjs/config';
import { MoneyValue } from '@orderly/shared-kernel';
import { MockPaymentsProcessor } from './mock-payments.processor';
import { ProcessorPaymentStatus } from './payments-processor';

describe('MockPaymentsProcessor', () => {
  const createConfigService = (threshold?: number): ConfigService =>
    ({
      get: jest.fn((key: string) =>
        key === 'MOCK_PAYMENTS_DECLINE_THRESHOLD' && threshold !== undefined
          ? String(threshold)
          : undefined
      )
    }) as unknown as ConfigService;

  it('approves payments below the decline threshold', async () => {
    const processor = new MockPaymentsProcessor(createConfigService(10_000));
    const result = await processor.authorize({
      paymentId: 'payment-1',
      orderId: 'order-1',
      amount: MoneyValue.from(1_000, 'KRW')
    });

    expect(result.status).toBe(ProcessorPaymentStatus.Approved);
  });

  it('declines payments that exceed the threshold', async () => {
    const processor = new MockPaymentsProcessor(createConfigService(1_000));
    const result = await processor.authorize({
      paymentId: 'payment-2',
      orderId: 'order-2',
      amount: MoneyValue.from(10_000, 'KRW')
    });

    expect(result.status).toBe(ProcessorPaymentStatus.Declined);
    expect(result.failureReason).toBe('DECLINED_BY_RULE');
  });

  it('parses webhook payloads and normalizes status', async () => {
    const processor = new MockPaymentsProcessor(createConfigService());
    const event = await processor.parseWebhook({
      paymentId: 'payment-3',
      status: 'FAILED',
      message: 'insufficient_funds'
    });

    expect(event.paymentId).toBe('payment-3');
    expect(event.status).toBe(ProcessorPaymentStatus.Declined);
    expect(event.failureReason).toBe('insufficient_funds');
  });
});
