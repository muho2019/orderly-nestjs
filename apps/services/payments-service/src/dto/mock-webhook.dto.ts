import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const MOCK_WEBHOOK_STATUSES = ['APPROVED', 'FAILED', 'CANCELLED'] as const;

export type MockWebhookStatus = (typeof MOCK_WEBHOOK_STATUSES)[number];

export class MockWebhookDto {
  @IsUUID('4')
  paymentId!: string;

  @IsIn(MOCK_WEBHOOK_STATUSES)
  status!: MockWebhookStatus;

  @IsOptional()
  @IsString()
  message?: string;
}
