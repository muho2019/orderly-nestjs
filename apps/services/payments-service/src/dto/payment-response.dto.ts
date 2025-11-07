import { MoneyDto } from '@orderly/shared-kernel';
import { PaymentStatus } from '../entities/payment.entity';

export class PaymentResponseDto {
  id!: string;
  orderId!: string;
  status!: PaymentStatus;
  provider!: string;
  amount!: MoneyDto;
  clientReference?: string;
  failureReason?: string;
  createdAt!: string;
  updatedAt!: string;
}
