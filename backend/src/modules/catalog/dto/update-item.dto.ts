import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ItemStatusDto } from './item-status.dto.js';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxLoanDurationDays?: number;

  @IsOptional()
  @IsEnum(ItemStatusDto)
  status?: ItemStatusDto;
}
