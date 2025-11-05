import { MoneyDto } from './money.dto';

export class OrderLineDto {
  productId!: string;
  quantity!: number;
  unitPrice!: MoneyDto;
  lineTotal!: MoneyDto;
}
