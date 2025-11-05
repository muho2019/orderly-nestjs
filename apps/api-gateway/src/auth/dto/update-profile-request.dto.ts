import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
