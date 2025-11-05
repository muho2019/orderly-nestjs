import { OrderLineDto } from './order-line.dto';
import { OrderStatus } from './order-status.enum';
import { MoneyDto } from './money.dto';

export class OrderResponseDto {
  id!: string;
  userId!: string;
  status!: OrderStatus;
  total!: MoneyDto;
  items!: OrderLineDto[];
  note?: string;
  clientReference?: string;
  createdAt!: string;
  updatedAt!: string;

  constructor(init: Partial<OrderResponseDto>) {
    Object.assign(this, init);
  }
}
