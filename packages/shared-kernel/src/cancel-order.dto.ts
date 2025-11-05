import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
