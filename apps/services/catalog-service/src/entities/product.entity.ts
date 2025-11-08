import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { ProductStatus } from '@orderly/shared-kernel';

@Entity({ name: 'products' })
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', name: 'price_amount' })
  priceAmount!: number;

  @Column({ type: 'varchar', length: 3, name: 'price_currency' })
  priceCurrency!: string;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.Draft })
  status!: ProductStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'thumbnail_url' })
  thumbnailUrl!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
