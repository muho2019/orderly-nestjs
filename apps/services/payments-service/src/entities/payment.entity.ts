import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';

export enum PaymentStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED'
}

@Entity({ name: 'payments' })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @Column({ type: 'varchar', length: 32 })
  provider!: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.Pending })
  status!: PaymentStatus;

  @Column({ type: 'int', name: 'amount_minor_units' })
  amountMinorUnits!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'client_reference' })
  clientReference!: string | null;

  @Column({ type: 'varchar', length: 191, nullable: true, name: 'processor_reference' })
  processorReference!: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'failure_reason' })
  failureReason!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'processor_payload' })
  processorPayload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
