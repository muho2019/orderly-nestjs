import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PAYMENTS_PAYMENT_CANCELLED_EVENT,
  PAYMENTS_PAYMENT_FAILED_EVENT,
  PAYMENTS_PAYMENT_REQUESTED_EVENT,
  PAYMENTS_PAYMENT_SUCCEEDED_EVENT,
  PaymentCancelledEvent,
  PaymentFailedEvent,
  PaymentRequestedEvent,
  PaymentSucceededEvent
} from '@orderly/shared-kernel';
import { Kafka, Producer } from 'kafkajs';

export abstract class PaymentsEventPublisher {
  abstract publishPaymentRequested(event: PaymentRequestedEvent): Promise<void>;
  abstract publishPaymentSucceeded(event: PaymentSucceededEvent): Promise<void>;
  abstract publishPaymentFailed(event: PaymentFailedEvent): Promise<void>;
  abstract publishPaymentCancelled(event: PaymentCancelledEvent): Promise<void>;
}

@Injectable()
export class KafkaPaymentsEventPublisher
  extends PaymentsEventPublisher
  implements OnModuleDestroy
{
  private readonly logger = new Logger(KafkaPaymentsEventPublisher.name);
  private producer?: Producer;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async publishPaymentRequested(event: PaymentRequestedEvent): Promise<void> {
    await this.sendEvent(
      this.configService.get<string>('PAYMENTS_REQUESTED_TOPIC', PAYMENTS_PAYMENT_REQUESTED_EVENT),
      event
    );
  }

  async publishPaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    await this.sendEvent(
      this.configService.get<string>('PAYMENTS_SUCCEEDED_TOPIC', PAYMENTS_PAYMENT_SUCCEEDED_EVENT),
      event
    );
  }

  async publishPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    await this.sendEvent(
      this.configService.get<string>('PAYMENTS_FAILED_TOPIC', PAYMENTS_PAYMENT_FAILED_EVENT),
      event
    );
  }

  async publishPaymentCancelled(event: PaymentCancelledEvent): Promise<void> {
    await this.sendEvent(
      this.configService.get<string>('PAYMENTS_CANCELLED_TOPIC', PAYMENTS_PAYMENT_CANCELLED_EVENT),
      event
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect().catch((error) =>
        this.logger.error('Failed to disconnect Kafka producer', error)
      );
    }
  }

  private async sendEvent<T extends { payload: { paymentId: string } }>(
    topic: string,
    event: T
  ): Promise<void> {
    const producer = await this.getProducer();
    await producer.send({
      topic,
      messages: [
        {
          key: event.payload.paymentId,
          value: JSON.stringify(event)
        }
      ]
    });
    this.logger.debug(`Published ${event.payload.paymentId} to ${topic}`);
  }

  private async getProducer(): Promise<Producer> {
    if (this.producer) {
      return this.producer;
    }

    const brokersRaw = this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092');
    const brokers = brokersRaw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (!brokers.length) {
      throw new Error('KAFKA_BROKERS must not be empty');
    }

    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'payments-service');
    const kafka = new Kafka({ clientId, brokers });
    this.producer = kafka.producer();
    await this.producer.connect();
    return this.producer;
  }
}
