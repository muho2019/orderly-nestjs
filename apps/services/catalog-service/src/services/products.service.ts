import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MoneyValue, ProductStatus } from '@orderly/shared-kernel';
import { ProductEntity } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { UpdateProductStatusDto } from '../dto/update-product-status.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>
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

    return this.productsRepository.save(entity);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findById(id);

    if (dto.name !== undefined) {
      product.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      product.description = dto.description?.trim() || null;
    }

    if (dto.price) {
      const price = MoneyValue.from(dto.price.amount, dto.price.currency);
      product.priceAmount = price.amount;
      product.priceCurrency = price.currency;
    }

    if (dto.sku !== undefined) {
      product.sku = dto.sku?.trim() || null;
    }

    if (dto.thumbnailUrl !== undefined) {
      product.thumbnailUrl = dto.thumbnailUrl?.trim() || null;
    }

    return this.productsRepository.save(product);
  }

  async updateStatus(id: string, dto: UpdateProductStatusDto): Promise<ProductEntity> {
    const product = await this.findById(id);
    product.status = dto.status;
    product.description = this.appendStatusNote(product.description, dto.reason);
    return this.productsRepository.save(product);
  }

  private appendStatusNote(description: string | null, reason?: string): string | null {
    if (!reason) {
      return description;
    }

    const note = `Status update: ${reason}`;
    return description ? `${description}\n\n${note}` : note;
  }
}
