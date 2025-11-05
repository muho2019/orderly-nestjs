import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CancelOrderDto,
  CreateOrderDto,
  OrderResponseDto
} from '@orderly/shared-kernel';
import { OrdersService, OrderProductsResponse } from './orders.service';
import { JwtClaims } from '../auth/services/auth-token.service';

interface AuthorizedRequest extends Request {
  user?: JwtClaims;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(
    @Req() request: AuthorizedRequest,
    @Body() dto: CreateOrderDto,
    @Headers('x-correlation-id') correlationId?: string | string[],
    @Headers('x-causation-id') causationId?: string | string[]
  ): Promise<OrderResponseDto> {
    const authorization = this.getAuthorization(request);

    return this.ordersService.createOrder(
      authorization,
      this.getUser(request),
      dto,
      {
        correlationId: this.normalizeHeaderValue(correlationId),
        causationId: this.normalizeHeaderValue(causationId)
      }
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findOrders(
    @Req() request: AuthorizedRequest,
    @Headers('x-correlation-id') correlationId?: string | string[]
  ): Promise<OrderResponseDto[]> {
    const authorization = this.getAuthorization(request);

    return this.ordersService.findOrders(authorization, this.getUser(request), {
      correlationId: this.normalizeHeaderValue(correlationId)
    });
  }

  @Get('products')
  getProducts(): Promise<OrderProductsResponse[]> {
    return this.ordersService.getProducts();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':orderId')
  findById(
    @Req() request: AuthorizedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Headers('x-correlation-id') correlationId?: string | string[]
  ): Promise<OrderResponseDto> {
    const authorization = this.getAuthorization(request);

    return this.ordersService.findOrderById(
      authorization,
      this.getUser(request),
      orderId,
      {
        correlationId: this.normalizeHeaderValue(correlationId)
      }
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  cancelOrder(
    @Req() request: AuthorizedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: CancelOrderDto,
    @Headers('x-correlation-id') correlationId?: string | string[],
    @Headers('x-causation-id') causationId?: string | string[]
  ): Promise<OrderResponseDto> {
    const authorization = this.getAuthorization(request);

    return this.ordersService.cancelOrder(
      authorization,
      this.getUser(request),
      orderId,
      dto,
      {
        correlationId: this.normalizeHeaderValue(correlationId),
        causationId: this.normalizeHeaderValue(causationId)
      }
    );
  }

  private getAuthorization(request: AuthorizedRequest): string {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || header.trim().length === 0) {
      throw new UnauthorizedException('Authorization header is required');
    }
    return header;
  }

  private getUser(request: AuthorizedRequest): JwtClaims {
    if (!request.user) {
      throw new UnauthorizedException('Authenticated user context is required');
    }

    return request.user;
  }

  private normalizeHeaderValue(value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
