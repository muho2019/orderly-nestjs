import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CatalogProductCreatedEvent,
  CatalogProductStatusChangedEvent,
  CatalogProductUpdatedEvent,
  CATALOG_PRODUCT_CREATED_EVENT,
  CATALOG_PRODUCT_STATUS_CHANGED_EVENT,
  CATALOG_PRODUCT_UPDATED_EVENT
} from '@orderly/shared-kernel';
import { Kafka, Producer } from 'kafkajs';

export abstract class ProductsEventPublisher {
  abstract publishProductCreated(event: CatalogProductCreatedEvent): Promise<void>;

  abstract publishProductUpdated(event: CatalogProductUpdatedEvent): Promise<void>;

  abstract publishProductStatusChanged(
    event: CatalogProductStatusChangedEvent
  ): Promise<void>;
}

@Injectable()
export class KafkaProductsEventPublisher
  extends ProductsEventPublisher
  implements OnModuleDestroy
{
  private readonly logger = new Logger(KafkaProductsEventPublisher.name);
  private producer?: Producer;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async publishProductCreated(event: CatalogProductCreatedEvent): Promise<void> {
    await this.sendEvent(
      this.configService.get<string>('CATALOG_CREATED_TOPIC', CATALOG_PRODUCT_CREATED_EVENT),
      event
    );
  }

  async publishProductUpdated(event: CatalogProductUpdatedEvent): Promise<void> {
    await this.sendEvent(
      this.configService.get<string>('CATALOG_UPDATED_TOPIC', CATALOG_PRODUCT_UPDATED_EVENT),
      event
    );
  }

  async publishProductStatusChanged(
    event: CatalogProductStatusChangedEvent
  ): Promise<void> {
    await this.sendEvent(
      this.configService.get<string>(
        'CATALOG_STATUS_CHANGED_TOPIC',
        CATALOG_PRODUCT_STATUS_CHANGED_EVENT
      ),
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

  private async sendEvent<T extends { payload: { productId?: string; product?: { id: string } } }>(
    topic: string,
    event: T
  ): Promise<void> {
    const producer = await this.getProducer();
    const key =
      (event.payload as { productId?: string }).productId ??
      ((event.payload as { product?: { id: string } }).product?.id ?? 'anonymous');

    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(event)
        }
      ]
    });

    this.logger.debug(`Published catalog event to ${topic} (key=${key})`);
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

    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'catalog-service');
    const kafka = new Kafka({ clientId, brokers });
    this.producer = kafka.producer();
    await this.producer.connect();
    return this.producer;
  }
}
