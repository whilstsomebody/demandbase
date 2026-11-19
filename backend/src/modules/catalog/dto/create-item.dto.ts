import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export enum ItemTypeDto {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
}

export class CreateItemDto {
  @IsEnum(ItemTypeDto)
  type!: ItemTypeDto;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxLoanDurationDays?: number;
}
