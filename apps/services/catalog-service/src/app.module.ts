import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from './catalog.module';
import { ProductEntity } from './entities/product.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development.local', '.env.development', '.env']
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5436),
        username: configService.get<string>('DB_USER', 'orderly'),
        password: configService.get<string>('DB_PASSWORD', 'orderly'),
        database: configService.get<string>('DB_NAME', 'orderly_catalog'),
        autoLoadEntities: true,
        entities: [ProductEntity],
        synchronize: configService.get<boolean>('TYPEORM_SYNC', true)
      })
    }),
    CatalogModule
  ]
})
export class AppModule {}
