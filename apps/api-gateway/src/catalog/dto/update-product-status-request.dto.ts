import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProductStatus } from '@orderly/shared-kernel';

export class UpdateProductStatusRequestDto {
  @IsEnum(ProductStatus)
  status!: ProductStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
