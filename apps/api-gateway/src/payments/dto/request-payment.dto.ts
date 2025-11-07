import { Type } from 'class-transformer';
import { IsUUID, ValidateNested } from 'class-validator';
import { MoneyDto } from '@orderly/shared-kernel';

export class RequestPaymentDto {
  @IsUUID('4')
  orderId!: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  amount!: MoneyDto;
}
