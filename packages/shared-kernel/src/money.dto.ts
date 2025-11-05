import { IsInt, IsString, Length, Min } from 'class-validator';

/**
 * MoneyDto represents a monetary value in the smallest currency unit.
 * Example: 19900 KRW stands for 19,900 Won.
 */
export class MoneyDto {
  @IsInt()
  @Min(0)
  amount!: number;

  @IsString()
  @Length(3, 3)
  currency!: string;
}
