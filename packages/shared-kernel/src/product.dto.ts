import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { MoneyDto } from './money.dto';
import { ProductStatus } from './product-status.enum';

export class ProductDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  price!: MoneyDto;

  @IsEnum(ProductStatus)
  status!: ProductStatus;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
