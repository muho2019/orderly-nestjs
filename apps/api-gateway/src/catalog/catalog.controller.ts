import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import type { Request } from 'express';
import { ProductDto } from '@orderly/shared-kernel';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { CreateProductRequestDto } from './dto/create-product-request.dto';
import { UpdateProductRequestDto } from './dto/update-product-request.dto';
import { UpdateProductStatusRequestDto } from './dto/update-product-status-request.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  findProducts(): Promise<ProductDto[]> {
    return this.catalogService.findProducts();
  }

  @Get('products/:productId')
  findProductById(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string
  ): Promise<ProductDto> {
    return this.catalogService.findProductById(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('products')
  createProduct(
    @Req() request: Request,
    @Body() dto: CreateProductRequestDto
  ): Promise<ProductDto> {
    return this.catalogService.createProduct(this.getAuthorization(request), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('products/:productId')
  updateProduct(
    @Req() request: Request,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() dto: UpdateProductRequestDto
  ): Promise<ProductDto> {
    return this.catalogService.updateProduct(this.getAuthorization(request), productId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('products/:productId/status')
  updateProductStatus(
    @Req() request: Request,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() dto: UpdateProductStatusRequestDto
  ): Promise<ProductDto> {
    return this.catalogService.updateProductStatus(
      this.getAuthorization(request),
      productId,
      dto
    );
  }

  private getAuthorization(request: Request): string {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || header.trim().length === 0) {
      throw new Error('Authorization header is required');
    }
    return header;
  }
}
