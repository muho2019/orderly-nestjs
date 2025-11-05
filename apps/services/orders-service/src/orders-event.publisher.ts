import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  ORDERS_ORDER_CREATED_EVENT,
  ORDERS_ORDER_STATUS_CHANGED_EVENT
} from '@orderly/shared-kernel';
import { Kafka, type Producer } from 'kafkajs';

export abstract class OrdersEventPublisher {
  abstract publishOrderCreated(event: OrderCreatedEvent): Promise<void>;
  abstract publishOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void>;
}

@Injectable()
export class KafkaOrdersEventPublisher
  extends OrdersEventPublisher
  implements OnModuleDestroy
{
  private readonly logger = new Logger(KafkaOrdersEventPublisher.name);
  private producer?: Producer;

  constructor(private readonly configService: ConfigService) {
    super();
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

    if (brokers.length === 0) {
      throw new Error('KAFKA_BROKERS must not be empty');
    }

    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'orders-service');
    const kafka = new Kafka({ clientId, brokers });

    this.producer = kafka.producer();
    await this.producer.connect();

    return this.producer;
  }

  async publishOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const topic = this.configService.get<string>('ORDERS_CREATED_TOPIC', ORDERS_ORDER_CREATED_EVENT);
    const producer = await this.getProducer();

    await producer.send({
      topic,
      messages: [
        {
          key: event.payload.orderId,
          value: JSON.stringify(event)
        }
      ]
    });

    this.logger.debug(`Published ${event.name} for order ${event.payload.orderId}`);
  }

  async publishOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    const topic = this.configService.get<string>(
      'ORDERS_STATUS_CHANGED_TOPIC',
      ORDERS_ORDER_STATUS_CHANGED_EVENT
    );
    const producer = await this.getProducer();

    await producer.send({
      topic,
      messages: [
        {
          key: `${event.payload.orderId}:${event.payload.currentStatus}`,
          value: JSON.stringify(event)
        }
      ]
    });

    this.logger.debug(
      `Published ${event.name} for order ${event.payload.orderId}: ${event.payload.previousStatus} -> ${event.payload.currentStatus}`
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }
}
