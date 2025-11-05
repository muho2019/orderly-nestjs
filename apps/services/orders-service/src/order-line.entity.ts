import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity({ name: 'order_lines' })
export class OrderLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OrderEntity, (order) => order.lines, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int', name: 'unit_price_amount' })
  unitPriceAmount!: number;

  @Column({ type: 'varchar', length: 3, name: 'unit_price_currency' })
  unitPriceCurrency!: string;

  @Column({ type: 'int', name: 'line_total_amount' })
  lineTotalAmount!: number;

  @Column({ type: 'varchar', length: 3, name: 'line_total_currency' })
  lineTotalCurrency!: string;
}
