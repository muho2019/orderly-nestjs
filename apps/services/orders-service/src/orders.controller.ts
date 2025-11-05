import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { CreateOrderDto, OrderResponseDto } from '@orderly/shared-kernel';
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
}
