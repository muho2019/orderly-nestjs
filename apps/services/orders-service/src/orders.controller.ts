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
  UseGuards
} from '@nestjs/common';
import { CancelOrderDto, CreateOrderDto, OrderResponseDto } from '@orderly/shared-kernel';
import type { Request } from 'express';
import { ApiGatewayAuthGuard } from './api-gateway-auth.guard';
import { OrdersService } from './orders.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email?: string;
    [key: string]: unknown;
  };
}

@Controller('orders')
@UseGuards(ApiGatewayAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
    @Headers('x-correlation-id') correlationId?: string | string[],
    @Headers('x-causation-id') causationId?: string | string[]
  ): Promise<OrderResponseDto> {
    const normalizedCorrelationId = Array.isArray(correlationId) ? correlationId[0] : correlationId;
    const normalizedCausationId = Array.isArray(causationId) ? causationId[0] : causationId;

    const order = await this.ordersService.createOrder(request.user.sub, dto, {
      correlationId: normalizedCorrelationId ?? undefined,
      causationId: normalizedCausationId ?? undefined
    });

    return this.ordersService.mapToResponse(order);
  }

  @Get()
  async findOrders(@Req() request: AuthenticatedRequest): Promise<OrderResponseDto[]> {
    const orders = await this.ordersService.findOrdersForUser(request.user.sub);
    return this.ordersService.mapToResponses(orders);
  }

  @Get(':orderId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
  async findOrderById(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.findOrderByIdForUser(orderId, request.user.sub);
    return this.ordersService.mapToResponse(order);
  }

  @Patch(':orderId([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: CancelOrderDto,
    @Headers('x-correlation-id') correlationId?: string | string[],
    @Headers('x-causation-id') causationId?: string | string[]
  ): Promise<OrderResponseDto> {
    const normalizedCorrelationId = Array.isArray(correlationId) ? correlationId[0] : correlationId;
    const normalizedCausationId = Array.isArray(causationId) ? causationId[0] : causationId;

    const order = await this.ordersService.cancelOrder(orderId, request.user.sub, dto, {
      correlationId: normalizedCorrelationId ?? undefined,
      causationId: normalizedCausationId ?? undefined
    });

    return this.ordersService.mapToResponse(order);
  }
}
