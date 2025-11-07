import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post
} from '@nestjs/common';
import { ProductDto } from '@orderly/shared-kernel';
import { ProductsService } from '../services/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { UpdateProductStatusDto } from '../dto/update-product-status.dto';

function mapToDto(entity: any): ProductDto {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description ?? undefined,
    price: {
      amount: entity.priceAmount,
      currency: entity.priceCurrency
    },
    status: entity.status,
    sku: entity.sku ?? undefined,
    thumbnailUrl: entity.thumbnailUrl ?? undefined
  };
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(): Promise<ProductDto[]> {
    const products = await this.productsService.findAll();
    return products.map(mapToDto);
  }

  @Get(':id')
  async findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<ProductDto> {
    return mapToDto(await this.productsService.findById(id));
  }

  @Post()
  async create(@Body() dto: CreateProductDto): Promise<ProductDto> {
    return mapToDto(await this.productsService.create(dto));
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProductDto
  ): Promise<ProductDto> {
    return mapToDto(await this.productsService.update(id, dto));
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProductStatusDto
  ): Promise<ProductDto> {
    return mapToDto(await this.productsService.updateStatus(id, dto));
  }
}
