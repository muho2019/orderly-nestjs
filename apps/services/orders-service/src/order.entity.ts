import { OrderStatus } from '@orderly/shared-kernel';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { OrderLineEntity } from './order-line.entity';

@Entity({ name: 'orders' })
@Index(['userId', 'clientReference'], {
  unique: true,
  where: '"client_reference" IS NOT NULL'
})
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.Created
  })
  status!: OrderStatus;

  @Column({ type: 'int', name: 'total_amount' })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'client_reference' })
  clientReference!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId!: string | null;

  @OneToMany(() => OrderLineEntity, (line) => line.order, {
    cascade: true,
    eager: true
  })
  lines!: OrderLineEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
