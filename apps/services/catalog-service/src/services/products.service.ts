import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventMetadata, MoneyValue, ProductStatus } from '@orderly/shared-kernel';
import { ProductEntity } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { UpdateProductStatusDto } from '../dto/update-product-status.dto';
import {
  mapProductCreatedEvent,
  mapProductStatusChangedEvent,
  mapProductUpdatedEvent
} from '../events/product-event.mapper';
import { ProductsEventPublisher } from '../events/products-event.publisher';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    private readonly eventPublisher: ProductsEventPublisher
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return this.productsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<ProductEntity> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    const price = MoneyValue.from(dto.price.amount, dto.price.currency);
    const entity = this.productsRepository.create({
      name: dto.name,
      description: dto.description?.trim() || null,
      priceAmount: price.amount,
      priceCurrency: price.currency,
      status: ProductStatus.Draft,
      sku: dto.sku?.trim() || null,
      thumbnailUrl: dto.thumbnailUrl?.trim() || null
    });

    const saved = await this.productsRepository.save(entity);
    await this.eventPublisher.publishProductCreated(
      mapProductCreatedEvent(saved, this.buildMetadata())
    );
    return saved;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findById(id);
    const changedFields: string[] = [];

    if (dto.name !== undefined) {
      product.name = dto.name.trim();
      changedFields.push('name');
    }

    if (dto.description !== undefined) {
      product.description = dto.description?.trim() || null;
      changedFields.push('description');
    }

    if (dto.price) {
      const price = MoneyValue.from(dto.price.amount, dto.price.currency);
      product.priceAmount = price.amount;
      product.priceCurrency = price.currency;
      changedFields.push('price');
    }

    if (dto.sku !== undefined) {
      product.sku = dto.sku?.trim() || null;
      changedFields.push('sku');
    }

    if (dto.thumbnailUrl !== undefined) {
      product.thumbnailUrl = dto.thumbnailUrl?.trim() || null;
      changedFields.push('thumbnailUrl');
    }

    const saved = await this.productsRepository.save(product);
    if (changedFields.length) {
      await this.eventPublisher.publishProductUpdated(
        mapProductUpdatedEvent(saved, this.buildMetadata(), changedFields)
      );
    }
    return saved;
  }

  async updateStatus(id: string, dto: UpdateProductStatusDto): Promise<ProductEntity> {
    const product = await this.findById(id);
    const previousStatus = product.status;
    product.status = dto.status;
    product.description = this.appendStatusNote(product.description, dto.reason);
    const saved = await this.productsRepository.save(product);
    await this.eventPublisher.publishProductStatusChanged(
      mapProductStatusChangedEvent(saved, previousStatus, this.buildMetadata(), dto.reason)
    );
    return saved;
  }

  private appendStatusNote(description: string | null, reason?: string): string | null {
    if (!reason) {
      return description;
    }

    const note = `Status update: ${reason}`;
    return description ? `${description}\n\n${note}` : note;
  }

  private buildMetadata(): EventMetadata {
    return {
      correlationId: randomUUID(),
      occurredAt: new Date().toISOString()
    };
  }
}
