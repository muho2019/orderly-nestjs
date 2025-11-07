import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsProcessor } from './processors/payments-processor';
import { MockPaymentsProcessor } from './processors/mock-payments.processor';
import {
  KafkaPaymentsEventPublisher,
  PaymentsEventPublisher
} from './payments-event.publisher';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity])],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PaymentsProcessor,
      useClass: MockPaymentsProcessor
    },
    {
      provide: PaymentsEventPublisher,
      useClass: KafkaPaymentsEventPublisher
    }
  ]
})
export class PaymentsModule {}
