import { PaymentStatus } from '@orderly/shared-kernel';

export interface PaymentResponse {
  id: string;
  orderId: string;
  status: PaymentStatus;
  provider: string;
  amount: {
    amount: number;
    currency: string;
  };
  clientReference?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}
