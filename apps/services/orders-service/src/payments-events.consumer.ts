import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PAYMENTS_PAYMENT_CANCELLED_EVENT,
  PAYMENTS_PAYMENT_FAILED_EVENT,
  PAYMENTS_PAYMENT_SUCCEEDED_EVENT,
  PaymentCancelledEvent,
  PaymentFailedEvent,
  PaymentSucceededEvent
} from '@orderly/shared-kernel';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { OrdersService } from './orders.service';

@Injectable()
export class PaymentsEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsEventsConsumer.name);
  private consumer?: Consumer;

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.configService.get<string>('DISABLE_PAYMENTS_CONSUMER') === 'true') {
      this.logger.warn('Payments events consumer disabled via configuration');
      return;
    }

    const brokers = this.parseBrokers();
    const kafka = new Kafka({
      clientId: `${this.configService.get<string>('KAFKA_CLIENT_ID', 'orders-service')}-payments-consumer`,
      brokers
    });

    this.consumer = kafka.consumer({
      groupId: this.configService.get<string>(
        'PAYMENTS_EVENTS_CONSUMER_GROUP',
        'orders-payments-consumer'
      )
    });

    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: PAYMENTS_PAYMENT_SUCCEEDED_EVENT,
      fromBeginning: false
    });
    await this.consumer.subscribe({
      topic: PAYMENTS_PAYMENT_FAILED_EVENT,
      fromBeginning: false
    });
    await this.consumer.subscribe({
      topic: PAYMENTS_PAYMENT_CANCELLED_EVENT,
      fromBeginning: false
    });

    await this.consumer.run({
      eachMessage: (payload) => this.handleMessage(payload)
    });

    this.logger.log('Payments events consumer started');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect().catch((error) =>
        this.logger.error('Failed to disconnect payments consumer', error)
      );
    }
  }

  private async handleMessage({ topic, message }: EachMessagePayload): Promise<void> {
    if (!message.value) {
      return;
    }

    try {
      const event = JSON.parse(message.value.toString());
      switch (event?.name) {
        case PAYMENTS_PAYMENT_SUCCEEDED_EVENT:
          await this.handleSucceeded(event as PaymentSucceededEvent);
          break;
        case PAYMENTS_PAYMENT_FAILED_EVENT:
          await this.handleFailed(event as PaymentFailedEvent);
          break;
        case PAYMENTS_PAYMENT_CANCELLED_EVENT:
          await this.handleCancelled(event as PaymentCancelledEvent);
          break;
        default:
          this.logger.debug(`Ignored event from topic ${topic}`);
      }
    } catch (error) {
      this.logger.error('Failed to process payments event', error as Error);
    }
  }

  private async handleSucceeded(event: PaymentSucceededEvent): Promise<void> {
    await this.ordersService.markOrderAsPaid(
      event.payload.orderId,
      event.payload.paymentId
    );
  }

  private async handleFailed(event: PaymentFailedEvent): Promise<void> {
    await this.ordersService.markOrderPaymentFailed(
      event.payload.orderId,
      event.payload.failureReason
    );
  }

  private async handleCancelled(event: PaymentCancelledEvent): Promise<void> {
    await this.ordersService.markOrderPaymentFailed(
      event.payload.orderId,
      event.payload.reason
    );
  }

  private parseBrokers(): string[] {
    const brokersRaw = this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092');
    const brokers = brokersRaw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (!brokers.length) {
      throw new Error('KAFKA_BROKERS must not be empty');
    }
    return brokers;
  }
}
